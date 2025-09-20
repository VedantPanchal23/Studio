const Y = require('yjs');
const logger = require('../utils/logger');
const CollaborativeDocument = require('../models/CollaborativeDocument');

/**
 * Collaboration service for handling Yjs document synchronization
 */
class CollaborationService {
    constructor() {
        this.documents = new Map(); // documentId -> Y.Doc
        this.documentConnections = new Map(); // documentId -> Set of connections
        this.userAwareness = new Map(); // documentId -> Map(userId -> awareness data)
        this.persistenceTimers = new Map(); // documentId -> timeout ID for debounced persistence
    }

    /**
     * Initialize collaboration service with WebSocket server
     * @param {Object} io - Socket.IO server instance
     */
    initialize(io) {
        this.io = io;
        logger.info('Collaboration service initialized');
    }

    /**
     * Get or create a Yjs document for a workspace file
     * @param {string} documentId - Unique document identifier (workspaceId:filePath)
     * @param {string} workspaceId - Workspace ID
     * @param {string} filePath - File path
     * @returns {Promise<Y.Doc>} Yjs document
     */
    async getDocument(documentId, workspaceId, filePath) {
        if (!this.documents.has(documentId)) {
            const doc = new Y.Doc();

            // Try to load existing state from database
            try {
                const savedDoc = await CollaborativeDocument.findByDocumentId(documentId);
                if (savedDoc && savedDoc.state) {
                    Y.applyUpdate(doc, savedDoc.state);
                    logger.info('Loaded document state from database', {
                        documentId,
                        version: savedDoc.version,
                        size: savedDoc.state.length
                    });
                }
            } catch (error) {
                logger.error('Failed to load document state from database', {
                    documentId,
                    error: error.message
                });
            }

            this.documents.set(documentId, doc);
            this.documentConnections.set(documentId, new Set());
            this.userAwareness.set(documentId, new Map());

            // Set up periodic persistence
            this.setupDocumentPersistence(documentId, workspaceId, filePath);

            logger.info('Created new Yjs document', { documentId });
        }

        return this.documents.get(documentId);
    }

    /**
     * Handle user joining a collaborative document
     * @param {Object} socket - Socket.IO socket instance
     * @param {Object} data - Join data
     */
    async handleDocumentJoin(socket, data) {
        const { documentId, workspaceId, filePath, userId } = data;

        if (!documentId || !workspaceId || !filePath || !userId) {
            socket.emit('collaboration:error', {
                message: 'Missing required fields: documentId, workspaceId, filePath, userId'
            });
            return;
        }

        try {
            // Get or create document
            const doc = await this.getDocument(documentId, workspaceId, filePath);

            // Add connection to document
            const connections = this.documentConnections.get(documentId);
            connections.add(socket.id);

            // Join document room
            socket.join(`doc:${documentId}`);

            // Initialize user awareness
            const awareness = this.userAwareness.get(documentId);
            awareness.set(userId, {
                userId,
                socketId: socket.id,
                cursor: null,
                selection: null,
                user: socket.user ? {
                    id: socket.user._id,
                    name: socket.user.name,
                    email: socket.user.email,
                    avatar: socket.user.avatar
                } : null,
                joinedAt: new Date().toISOString()
            });

            // Send current document state to joining user
            const documentState = Y.encodeStateAsUpdate(doc);
            socket.emit('collaboration:document-state', {
                documentId,
                state: Array.from(documentState),
                timestamp: new Date().toISOString()
            });

            // Send current awareness state
            const awarenessState = Array.from(awareness.values());
            socket.emit('collaboration:awareness-state', {
                documentId,
                users: awarenessState,
                timestamp: new Date().toISOString()
            });

            // Notify other users about new participant
            socket.to(`doc:${documentId}`).emit('collaboration:user-joined', {
                documentId,
                user: awareness.get(userId),
                timestamp: new Date().toISOString()
            });

            // Add participant to database
            await this.addParticipant(documentId, userId);

            logger.info('User joined collaborative document', {
                socketId: socket.id,
                userId,
                documentId,
                workspaceId,
                filePath
            });

            socket.emit('collaboration:joined', {
                documentId,
                workspaceId,
                filePath,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Failed to join collaborative document', {
                socketId: socket.id,
                userId,
                documentId,
                error: error.message
            });

            socket.emit('collaboration:error', {
                message: 'Failed to join document',
                error: error.message
            });
        }
    }

    /**
     * Handle user leaving a collaborative document
     * @param {Object} socket - Socket.IO socket instance
     * @param {Object} data - Leave data
     */
    async handleDocumentLeave(socket, data) {
        const { documentId, userId } = data;

        if (!documentId || !userId) {
            socket.emit('collaboration:error', {
                message: 'Missing required fields: documentId, userId'
            });
            return;
        }

        try {
            // Remove connection from document
            const connections = this.documentConnections.get(documentId);
            if (connections) {
                connections.delete(socket.id);
            }

            // Leave document room
            socket.leave(`doc:${documentId}`);

            // Remove user awareness
            const awareness = this.userAwareness.get(documentId);
            if (awareness) {
                awareness.delete(userId);
            }

            // Notify other users about participant leaving
            socket.to(`doc:${documentId}`).emit('collaboration:user-left', {
                documentId,
                userId,
                timestamp: new Date().toISOString()
            });

            // Remove participant from database
            await this.removeParticipant(documentId, userId);

            logger.info('User left collaborative document', {
                socketId: socket.id,
                userId,
                documentId
            });

            socket.emit('collaboration:left', {
                documentId,
                timestamp: new Date().toISOString()
            });

            // Clean up document if no connections remain
            if (connections && connections.size === 0) {
                await this.cleanupDocument(documentId);
            }

        } catch (error) {
            logger.error('Failed to leave collaborative document', {
                socketId: socket.id,
                userId,
                documentId,
                error: error.message
            });

            socket.emit('collaboration:error', {
                message: 'Failed to leave document',
                error: error.message
            });
        }
    }

    /**
     * Handle Yjs document updates
     * @param {Object} socket - Socket.IO socket instance
     * @param {Object} data - Update data
     */
    handleDocumentUpdate(socket, data) {
        const { documentId, update, userId } = data;

        if (!documentId || !update || !userId) {
            socket.emit('collaboration:error', {
                message: 'Missing required fields: documentId, update, userId'
            });
            return;
        }

        try {
            const doc = this.documents.get(documentId);
            if (!doc) {
                socket.emit('collaboration:error', {
                    message: 'Document not found'
                });
                return;
            }

            // Apply update to document
            const updateArray = new Uint8Array(update);
            Y.applyUpdate(doc, updateArray);

            // Broadcast update to other users in the document
            socket.to(`doc:${documentId}`).emit('collaboration:document-update', {
                documentId,
                update,
                userId,
                timestamp: new Date().toISOString()
            });

            // Trigger persistence (debounced)
            this.debouncedPersist(documentId, userId);

            logger.debug('Document update processed', {
                socketId: socket.id,
                userId,
                documentId,
                updateSize: update.length
            });

        } catch (error) {
            logger.error('Failed to process document update', {
                socketId: socket.id,
                userId,
                documentId,
                error: error.message
            });

            socket.emit('collaboration:error', {
                message: 'Failed to process document update',
                error: error.message
            });
        }
    }

    /**
     * Handle user awareness updates (cursor position, selection, etc.)
     * @param {Object} socket - Socket.IO socket instance
     * @param {Object} data - Awareness data
     */
    handleAwarenessUpdate(socket, data) {
        const { documentId, userId, cursor, selection, user } = data;

        if (!documentId || !userId) {
            socket.emit('collaboration:error', {
                message: 'Missing required fields: documentId, userId'
            });
            return;
        }

        try {
            const awareness = this.userAwareness.get(documentId);
            if (!awareness) {
                socket.emit('collaboration:error', {
                    message: 'Document not found'
                });
                return;
            }

            // Update user awareness data
            const currentAwareness = awareness.get(userId) || {};
            const updatedAwareness = {
                ...currentAwareness,
                userId,
                socketId: socket.id,
                cursor,
                selection,
                user: user || currentAwareness.user,
                lastUpdate: new Date().toISOString()
            };

            awareness.set(userId, updatedAwareness);

            // Broadcast awareness update to other users
            socket.to(`doc:${documentId}`).emit('collaboration:awareness-update', {
                documentId,
                userId,
                awareness: updatedAwareness,
                timestamp: new Date().toISOString()
            });

            logger.debug('Awareness update processed', {
                socketId: socket.id,
                userId,
                documentId,
                hasCursor: !!cursor,
                hasSelection: !!selection
            });

        } catch (error) {
            logger.error('Failed to process awareness update', {
                socketId: socket.id,
                userId,
                documentId,
                error: error.message
            });

            socket.emit('collaboration:error', {
                message: 'Failed to process awareness update',
                error: error.message
            });
        }
    }

    /**
     * Get document statistics
     * @param {string} documentId - Document ID
     * @returns {Object} Document statistics
     */
    getDocumentStats(documentId) {
        const doc = this.documents.get(documentId);
        const connections = this.documentConnections.get(documentId);
        const awareness = this.userAwareness.get(documentId);

        if (!doc) {
            return null;
        }

        return {
            documentId,
            exists: true,
            connectionCount: connections ? connections.size : 0,
            userCount: awareness ? awareness.size : 0,
            documentSize: Y.encodeStateAsUpdate(doc).length,
            createdAt: doc.createdAt || null
        };
    }

    /**
     * Clean up document when no users are connected
     * @param {string} documentId - Document ID
     */
    async cleanupDocument(documentId) {
        const connections = this.documentConnections.get(documentId);

        if (!connections || connections.size === 0) {
            // Save document state before cleanup
            await this.persistDocument(documentId);

            // Remove from memory
            this.documents.delete(documentId);
            this.documentConnections.delete(documentId);
            this.userAwareness.delete(documentId);

            logger.info('Document cleaned up', { documentId });
        }
    }

    /**
     * Set up periodic persistence for a document
     * @param {string} documentId - Document ID
     * @param {string} workspaceId - Workspace ID
     * @param {string} filePath - File path
     */
    setupDocumentPersistence(documentId, workspaceId, filePath) {
        // Persist document every 30 seconds if there are changes
        const persistInterval = setInterval(async () => {
            const connections = this.documentConnections.get(documentId);
            if (!connections || connections.size === 0) {
                clearInterval(persistInterval);
                return;
            }

            await this.persistDocument(documentId, workspaceId, filePath);
        }, 30000);
    }

    /**
     * Persist document state to database
     * @param {string} documentId - Document ID
     * @param {string} workspaceId - Workspace ID (optional if already exists)
     * @param {string} filePath - File path (optional if already exists)
     * @param {string} userId - User ID who triggered the save
     */
    async persistDocument(documentId, workspaceId = null, filePath = null, userId = null) {
        try {
            const doc = this.documents.get(documentId);
            if (!doc) return;

            const state = Y.encodeStateAsUpdate(doc);

            if (workspaceId && filePath) {
                // Create or update document
                await CollaborativeDocument.createOrUpdate(
                    documentId,
                    workspaceId,
                    filePath,
                    state,
                    userId
                );
            } else {
                // Update existing document
                const existingDoc = await CollaborativeDocument.findByDocumentId(documentId);
                if (existingDoc) {
                    await existingDoc.updateState(state, userId);
                }
            }

            logger.debug('Document persisted to database', {
                documentId,
                stateSize: state.length
            });
        } catch (error) {
            logger.error('Failed to persist document to database', {
                documentId,
                error: error.message
            });
        }
    }

    /**
     * Add participant to document
     * @param {string} documentId - Document ID
     * @param {string} userId - User ID
     */
    async addParticipant(documentId, userId) {
        try {
            const doc = await CollaborativeDocument.findByDocumentId(documentId);
            if (doc) {
                await doc.addParticipant(userId);
            }
        } catch (error) {
            logger.error('Failed to add participant to document', {
                documentId,
                userId,
                error: error.message
            });
        }
    }

    /**
     * Remove participant from document
     * @param {string} documentId - Document ID
     * @param {string} userId - User ID
     */
    async removeParticipant(documentId, userId) {
        try {
            const doc = await CollaborativeDocument.findByDocumentId(documentId);
            if (doc) {
                await doc.removeParticipant(userId);
            }
        } catch (error) {
            logger.error('Failed to remove participant from document', {
                documentId,
                userId,
                error: error.message
            });
        }
    }

    /**
     * Debounced persistence to avoid too frequent database writes
     * @param {string} documentId - Document ID
     * @param {string} userId - User ID who triggered the change
     */
    debouncedPersist(documentId, userId) {
        // Clear existing timer
        const existingTimer = this.persistenceTimers.get(documentId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new timer for 5 seconds
        const timer = setTimeout(async () => {
            await this.persistDocument(documentId, null, null, userId);
            this.persistenceTimers.delete(documentId);
        }, 5000);

        this.persistenceTimers.set(documentId, timer);
    }

    /**
     * Handle socket disconnection cleanup
     * @param {Object} socket - Socket.IO socket instance
     */
    handleDisconnection(socket) {
        const socketId = socket.id;
        const userId = socket.userId;

        // Clean up all document connections for this socket
        for (const [documentId, connections] of this.documentConnections.entries()) {
            if (connections.has(socketId)) {
                connections.delete(socketId);

                // Remove from awareness
                const awareness = this.userAwareness.get(documentId);
                if (awareness && userId) {
                    awareness.delete(userId);

                    // Notify other users
                    socket.to(`doc:${documentId}`).emit('collaboration:user-left', {
                        documentId,
                        userId,
                        timestamp: new Date().toISOString()
                    });
                }

                // Clean up document if no connections remain
                if (connections.size === 0) {
                    this.cleanupDocument(documentId);
                }
            }
        }

        logger.debug('Collaboration cleanup completed for disconnected socket', {
            socketId,
            userId
        });
    }

    /**
     * Get all active documents
     * @returns {Array} Array of document statistics
     */
    getAllDocuments() {
        const documents = [];
        for (const documentId of this.documents.keys()) {
            const stats = this.getDocumentStats(documentId);
            if (stats) {
                documents.push(stats);
            }
        }
        return documents;
    }

    /**
     * Get users in a document
     * @param {string} documentId - Document ID
     * @returns {Array} Array of user awareness data
     */
    getDocumentUsers(documentId) {
        const awareness = this.userAwareness.get(documentId);
        if (!awareness) {
            return [];
        }
        return Array.from(awareness.values());
    }
}

module.exports = new CollaborationService();