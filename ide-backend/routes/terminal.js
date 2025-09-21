const express = require('express');
const { authenticateFirebase } = require('../middleware/firebaseAuth');
const terminalService = require('../services/terminal');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Get user's terminal sessions
 * GET /api/terminal/sessions
 */
router.get('/sessions', authenticateFirebase, (req, res) => {
    try {
        const userId = req.user._id.toString();
        const terminals = terminalService.getUserTerminals(userId);

        res.json({
            success: true,
            data: {
                terminals: terminals,
                count: terminals.length
            }
        });
    } catch (error) {
        logger.error('Error getting user terminals:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting terminal sessions'
        });
    }
});

/**
 * Get specific terminal info
 * GET /api/terminal/:terminalId
 */
router.get('/:terminalId', authenticateFirebase, (req, res) => {
    try {
        const { terminalId } = req.params;
        const userId = req.user._id.toString();

        const terminal = terminalService.getTerminalInfo(terminalId);

        if (!terminal) {
            return res.status(404).json({
                success: false,
                message: 'Terminal not found'
            });
        }

        // Check if user owns this terminal
        if (terminal.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: terminal
        });
    } catch (error) {
        logger.error('Error getting terminal info:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting terminal info'
        });
    }
});

/**
 * Create new terminal session
 * POST /api/terminal/create
 */
router.post('/create', authenticateFirebase, (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { workspaceId, shell, cols, rows, cwd } = req.body;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: 'Workspace ID is required'
            });
        }

        const terminalInfo = terminalService.createTerminal(userId, workspaceId, {
            shell,
            cols: cols || 80,
            rows: rows || 24,
            cwd
        });

        logger.info('Terminal created via API', {
            userId,
            terminalId: terminalInfo.terminalId,
            workspaceId
        });

        res.status(201).json({
            success: true,
            data: terminalInfo
        });

    } catch (error) {
        logger.error('Error creating terminal:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating terminal',
            error: error.message
        });
    }
});

/**
 * Resize terminal
 * PUT /api/terminal/:terminalId/resize
 */
router.put('/:terminalId/resize', authenticateFirebase, (req, res) => {
    try {
        const { terminalId } = req.params;
        const userId = req.user._id.toString();
        const { cols, rows } = req.body;

        if (!cols || !rows || cols < 1 || rows < 1) {
            return res.status(400).json({
                success: false,
                message: 'Valid cols and rows are required'
            });
        }

        const terminal = terminalService.getTerminalInfo(terminalId);

        if (!terminal) {
            return res.status(404).json({
                success: false,
                message: 'Terminal not found'
            });
        }

        // Check if user owns this terminal
        if (terminal.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        terminalService.resizeTerminal(terminalId, cols, rows);

        res.json({
            success: true,
            message: 'Terminal resized successfully',
            data: {
                terminalId,
                cols,
                rows
            }
        });

    } catch (error) {
        logger.error('Error resizing terminal:', error);
        res.status(500).json({
            success: false,
            message: 'Error resizing terminal',
            error: error.message
        });
    }
});

/**
 * Destroy terminal session
 * DELETE /api/terminal/:terminalId
 */
router.delete('/:terminalId', authenticateFirebase, (req, res) => {
    try {
        const { terminalId } = req.params;
        const userId = req.user._id.toString();

        const terminal = terminalService.getTerminalInfo(terminalId);

        if (!terminal) {
            return res.status(404).json({
                success: false,
                message: 'Terminal not found'
            });
        }

        // Check if user owns this terminal
        if (terminal.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const destroyed = terminalService.destroyTerminal(terminalId);

        if (destroyed) {
            logger.info('Terminal destroyed via API', {
                userId,
                terminalId
            });

            res.json({
                success: true,
                message: 'Terminal destroyed successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to destroy terminal'
            });
        }

    } catch (error) {
        logger.error('Error destroying terminal:', error);
        res.status(500).json({
            success: false,
            message: 'Error destroying terminal',
            error: error.message
        });
    }
});

/**
 * Get command history for terminal
 * GET /api/terminal/:terminalId/history
 */
router.get('/:terminalId/history', authenticateFirebase, (req, res) => {
    try {
        const { terminalId } = req.params;
        const userId = req.user._id.toString();

        const terminal = terminalService.getTerminalInfo(terminalId);

        if (!terminal) {
            return res.status(404).json({
                success: false,
                message: 'Terminal not found'
            });
        }

        // Check if user owns this terminal
        if (terminal.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const history = terminalService.getCommandHistory(terminalId);

        res.json({
            success: true,
            data: {
                terminalId,
                history,
                count: history.length
            }
        });

    } catch (error) {
        logger.error('Error getting command history:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting command history',
            error: error.message
        });
    }
});

/**
 * Get autocomplete suggestions
 * POST /api/terminal/:terminalId/autocomplete
 */
router.post('/:terminalId/autocomplete', authenticateFirebase, (req, res) => {
    try {
        const { terminalId } = req.params;
        const userId = req.user._id.toString();
        const { partial } = req.body;

        if (!partial || typeof partial !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Partial command is required'
            });
        }

        const terminal = terminalService.getTerminalInfo(terminalId);

        if (!terminal) {
            return res.status(404).json({
                success: false,
                message: 'Terminal not found'
            });
        }

        // Check if user owns this terminal
        if (terminal.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const suggestions = terminalService.getAutocompleteSuggestions(terminalId, partial);

        res.json({
            success: true,
            data: {
                terminalId,
                partial,
                suggestions
            }
        });

    } catch (error) {
        logger.error('Error getting autocomplete suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting autocomplete suggestions',
            error: error.message
        });
    }
});

/**
 * Clear command history for terminal
 * DELETE /api/terminal/:terminalId/history
 */
router.delete('/:terminalId/history', authenticateFirebase, (req, res) => {
    try {
        const { terminalId } = req.params;
        const userId = req.user._id.toString();

        const terminal = terminalService.getTerminalInfo(terminalId);

        if (!terminal) {
            return res.status(404).json({
                success: false,
                message: 'Terminal not found'
            });
        }

        // Check if user owns this terminal
        if (terminal.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        terminalService.clearCommandHistory(terminalId);

        res.json({
            success: true,
            message: 'Command history cleared successfully'
        });

    } catch (error) {
        logger.error('Error clearing command history:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing command history',
            error: error.message
        });
    }
});

/**
 * Get terminal statistics (admin endpoint)
 * GET /api/terminal/stats
 */
router.get('/admin/stats', authenticateFirebase, (req, res) => {
    try {
        // This would typically require admin permissions
        // For now, just return basic stats
        const allTerminals = terminalService.getAllTerminals();
        const activeTerminals = allTerminals.filter(t => t.isActive);

        res.json({
            success: true,
            data: {
                totalTerminals: allTerminals.length,
                activeTerminals: activeTerminals.length,
                inactiveTerminals: allTerminals.length - activeTerminals.length
            }
        });
    } catch (error) {
        logger.error('Error getting terminal stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting terminal statistics'
        });
    }
});

module.exports = router;
