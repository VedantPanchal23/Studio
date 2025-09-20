// Mock child_process before importing lspService
jest.mock('child_process');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

// Mock logger
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

const lspService = require('../services/lspService');

describe('LSPService', () => {
    let mockProcess;
    let mockSocket;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock process
        mockProcess = new EventEmitter();
        mockProcess.stdin = {
            write: jest.fn()
        };
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.pid = 12345;
        mockProcess.killed = false;
        mockProcess.kill = jest.fn();

        spawn.mockReturnValue(mockProcess);

        // Create mock socket
        mockSocket = new EventEmitter();
        mockSocket.id = 'test-socket-id';
        mockSocket.emit = jest.fn();
        mockSocket.on = jest.fn();
    });

    afterEach(async () => {
        // Clean up any running servers
        await lspService.shutdown();
    });

    describe('Server Configuration', () => {
        test('should have configurations for supported languages', () => {
            const supportedLanguages = lspService.getSupportedLanguages();

            expect(supportedLanguages).toContain('typescript');
            expect(supportedLanguages).toContain('javascript');
            expect(supportedLanguages).toContain('python');
            expect(supportedLanguages).toContain('java');
            expect(supportedLanguages).toContain('go');
            expect(supportedLanguages).toContain('rust');
            expect(supportedLanguages).toContain('c');
            expect(supportedLanguages).toContain('cpp');
        });

        test('should get server config for supported language', () => {
            const config = lspService.getServerConfig('typescript');

            expect(config).toBeDefined();
            expect(config.name).toBe('typescript-language-server');
            expect(config.command).toBe('typescript-language-server');
            expect(config.languages).toContain('typescript');
            expect(config.languages).toContain('javascript');
        });

        test('should return null for unsupported language', () => {
            const config = lspService.getServerConfig('unsupported-language');
            expect(config).toBeNull();
        });

        test('should find config by language in supported languages array', () => {
            const config = lspService.getServerConfig('javascriptreact');

            expect(config).toBeDefined();
            expect(config.name).toBe('typescript-language-server');
            expect(config.languages).toContain('javascriptreact');
        });
    });

    describe('Server Lifecycle', () => {
        test('should start LSP server successfully', async () => {
            const language = 'typescript';
            const workspaceRoot = '/test/workspace';

            // Mock successful executable check
            const originalCheckExecutable = lspService.checkServerExecutable;
            lspService.checkServerExecutable = jest.fn().mockResolvedValue();

            // Set up mock to respond to initialize request
            mockProcess.stdin.write.mockImplementation((data) => {
                if (data.includes('initialize')) {
                    // Simulate initialize response immediately
                    setImmediate(() => {
                        const response = {
                            jsonrpc: '2.0',
                            id: 1,
                            result: {
                                capabilities: {
                                    textDocumentSync: 1,
                                    completionProvider: true
                                }
                            }
                        };
                        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
                    });
                }
            });

            const serverId = await lspService.startServer(language, workspaceRoot);

            expect(serverId).toBeDefined();
            expect(serverId).toMatch(/^typescript-\d+$/);
            expect(spawn).toHaveBeenCalledWith(
                'typescript-language-server',
                ['--stdio'],
                { cwd: workspaceRoot, stdio: ['pipe', 'pipe', 'pipe'] }
            );

            // Restore original method
            lspService.checkServerExecutable = originalCheckExecutable;
        });

        test('should fail to start server for unsupported language', async () => {
            const language = 'unsupported-language';
            const workspaceRoot = '/test/workspace';

            await expect(lspService.startServer(language, workspaceRoot))
                .rejects.toThrow('No LSP server configuration found for language: unsupported-language');
        });

        test('should stop LSP server successfully', async () => {
            const language = 'typescript';
            const workspaceRoot = '/test/workspace';

            // Mock successful executable check
            const originalCheckExecutable = lspService.checkServerExecutable;
            lspService.checkServerExecutable = jest.fn().mockResolvedValue();

            const startPromise = lspService.startServer(language, workspaceRoot);

            // Simulate successful initialization
            setTimeout(() => {
                mockProcess.stdin.write.mockImplementation((data) => {
                    if (data.includes('initialize')) {
                        const response = {
                            jsonrpc: '2.0',
                            id: 1,
                            result: { capabilities: {} }
                        };
                        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
                    } else if (data.includes('shutdown')) {
                        const response = {
                            jsonrpc: '2.0',
                            id: 2,
                            result: null
                        };
                        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
                    }
                });
            }, 10);

            const serverId = await startPromise;
            const stopped = await lspService.stopServer(serverId);

            expect(stopped).toBe(true);
            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');

            // Restore original method
            lspService.checkServerExecutable = originalCheckExecutable;
        });

        test('should return false when stopping non-existent server', async () => {
            const stopped = await lspService.stopServer('non-existent-server');
            expect(stopped).toBe(false);
        });
    });

    describe('Connection Management', () => {
        let serverId;

        beforeEach(async () => {
            const language = 'typescript';
            const workspaceRoot = '/test/workspace';

            // Mock successful executable check
            const originalCheckExecutable = lspService.checkServerExecutable;
            lspService.checkServerExecutable = jest.fn().mockResolvedValue();

            const startPromise = lspService.startServer(language, workspaceRoot);

            // Simulate successful initialization
            setTimeout(() => {
                mockProcess.stdin.write.mockImplementation((data) => {
                    if (data.includes('initialize')) {
                        const response = {
                            jsonrpc: '2.0',
                            id: 1,
                            result: { capabilities: {} }
                        };
                        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
                    }
                });
            }, 10);

            serverId = await startPromise;

            // Restore original method
            lspService.checkServerExecutable = originalCheckExecutable;
        });

        test('should create connection successfully', () => {
            const workspaceRoot = '/test/workspace';

            const connectionId = lspService.createConnection(serverId, mockSocket, workspaceRoot);

            expect(connectionId).toBeDefined();
            expect(connectionId).toBe(`${serverId}-${mockSocket.id}`);
        });

        test('should fail to create connection for non-existent server', () => {
            const workspaceRoot = '/test/workspace';

            expect(() => {
                lspService.createConnection('non-existent-server', mockSocket, workspaceRoot);
            }).toThrow('LSP server not found: non-existent-server');
        });

        test('should remove connection successfully', () => {
            const workspaceRoot = '/test/workspace';

            const connectionId = lspService.createConnection(serverId, mockSocket, workspaceRoot);
            const removed = lspService.removeConnection(connectionId);

            expect(removed).toBe(true);
        });

        test('should return false when removing non-existent connection', () => {
            const removed = lspService.removeConnection('non-existent-connection');
            expect(removed).toBe(false);
        });
    });

    describe('Document Synchronization', () => {
        let serverId;

        beforeEach(async () => {
            const language = 'typescript';
            const workspaceRoot = '/test/workspace';

            // Mock successful executable check
            const originalCheckExecutable = lspService.checkServerExecutable;
            lspService.checkServerExecutable = jest.fn().mockResolvedValue();

            const startPromise = lspService.startServer(language, workspaceRoot);

            // Simulate successful initialization
            setTimeout(() => {
                mockProcess.stdin.write.mockImplementation((data) => {
                    if (data.includes('initialize')) {
                        const response = {
                            jsonrpc: '2.0',
                            id: 1,
                            result: { capabilities: {} }
                        };
                        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
                    }
                });
            }, 10);

            serverId = await startPromise;

            // Restore original method
            lspService.checkServerExecutable = originalCheckExecutable;
        });

        test('should handle document open notification', () => {
            const data = {
                uri: 'file:///test/file.ts',
                languageId: 'typescript',
                version: 1,
                text: 'console.log("hello");'
            };

            lspService.handleDocumentOpen(serverId, data);

            expect(mockProcess.stdin.write).toHaveBeenCalledWith(
                expect.stringContaining('textDocument/didOpen')
            );
        });

        test('should handle document change notification', () => {
            const data = {
                uri: 'file:///test/file.ts',
                version: 2,
                contentChanges: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 7 }
                        },
                        text: 'const x'
                    }
                ]
            };

            lspService.handleDocumentChange(serverId, data);

            expect(mockProcess.stdin.write).toHaveBeenCalledWith(
                expect.stringContaining('textDocument/didChange')
            );
        });

        test('should handle document close notification', () => {
            const data = {
                uri: 'file:///test/file.ts'
            };

            lspService.handleDocumentClose(serverId, data);

            expect(mockProcess.stdin.write).toHaveBeenCalledWith(
                expect.stringContaining('textDocument/didClose')
            );
        });
    });

    describe('Server Information', () => {
        test('should return empty array when no servers are active', () => {
            const servers = lspService.getActiveServers();
            expect(servers).toEqual([]);
        });

        test('should return server information for active servers', async () => {
            const language = 'typescript';
            const workspaceRoot = '/test/workspace';

            // Mock successful executable check
            const originalCheckExecutable = lspService.checkServerExecutable;
            lspService.checkServerExecutable = jest.fn().mockResolvedValue();

            const startPromise = lspService.startServer(language, workspaceRoot);

            // Simulate successful initialization
            setTimeout(() => {
                mockProcess.stdin.write.mockImplementation((data) => {
                    if (data.includes('initialize')) {
                        const response = {
                            jsonrpc: '2.0',
                            id: 1,
                            result: { capabilities: {} }
                        };
                        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
                    }
                });
            }, 10);

            const serverId = await startPromise;
            const servers = lspService.getActiveServers();

            expect(servers).toHaveLength(1);
            expect(servers[0]).toMatchObject({
                serverId: serverId,
                name: 'typescript-language-server',
                status: 'running',
                connections: 0
            });

            // Restore original method
            lspService.checkServerExecutable = originalCheckExecutable;
        });
    });

    describe('Shutdown', () => {
        test('should shutdown all servers successfully', async () => {
            const language = 'typescript';
            const workspaceRoot = '/test/workspace';

            // Mock successful executable check
            const originalCheckExecutable = lspService.checkServerExecutable;
            lspService.checkServerExecutable = jest.fn().mockResolvedValue();

            const startPromise = lspService.startServer(language, workspaceRoot);

            // Simulate successful initialization
            setTimeout(() => {
                mockProcess.stdin.write.mockImplementation((data) => {
                    if (data.includes('initialize')) {
                        const response = {
                            jsonrpc: '2.0',
                            id: 1,
                            result: { capabilities: {} }
                        };
                        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
                    } else if (data.includes('shutdown')) {
                        const response = {
                            jsonrpc: '2.0',
                            id: 2,
                            result: null
                        };
                        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
                    }
                });
            }, 10);

            await startPromise;

            // Verify server is running
            let servers = lspService.getActiveServers();
            expect(servers).toHaveLength(1);

            // Shutdown all servers
            await lspService.shutdown();

            // Verify all servers are stopped
            servers = lspService.getActiveServers();
            expect(servers).toHaveLength(0);

            // Restore original method
            lspService.checkServerExecutable = originalCheckExecutable;
        });
    });
});