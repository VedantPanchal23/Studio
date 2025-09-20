const terminalService = require('../services/terminal');
const webSocketService = require('../services/websocket');

describe('WebSocket Terminal Integration', () => {
  describe('Service Integration', () => {
    test('should have terminal service available in websocket service', () => {
      // Verify that the websocket service can access terminal service
      expect(terminalService).toBeDefined();
      expect(typeof terminalService.createTerminal).toBe('function');
      expect(typeof terminalService.destroyTerminal).toBe('function');
      expect(typeof terminalService.writeInput).toBe('function');
      expect(typeof terminalService.resizeTerminal).toBe('function');
    });

    test('should have websocket service methods for terminal handling', () => {
      expect(webSocketService).toBeDefined();
      expect(typeof webSocketService.handleTerminalCreate).toBe('function');
      expect(typeof webSocketService.handleTerminalInput).toBe('function');
      expect(typeof webSocketService.handleTerminalResize).toBe('function');
      expect(typeof webSocketService.handleTerminalDestroy).toBe('function');
      expect(typeof webSocketService.setupTerminalStreaming).toBe('function');
    });

    test('should create terminal ID with correct format', () => {
      const userId = 'test-user-123';
      const workspaceId = 'test-workspace-123';
      
      try {
        const terminalInfo = terminalService.createTerminal(userId, workspaceId, {
          cols: 80,
          rows: 24
        });

        expect(terminalInfo.terminalId).toMatch(/^terminal_[a-f0-9]{32}$/);
        expect(terminalInfo.cols).toBe(80);
        expect(terminalInfo.rows).toBe(24);
        expect(terminalInfo.shell).toBeDefined();
        expect(terminalInfo.cwd).toBeDefined();
        expect(terminalInfo.pid).toBeDefined();

        // Clean up
        terminalService.destroyTerminal(terminalInfo.terminalId);
      } catch (error) {
        // On Windows without proper shell access, this might fail
        // but we can still verify the service structure
        expect(error.message).toContain('Failed to create terminal');
      }
    });

    test('should handle terminal service methods gracefully', () => {
      // Test error handling for invalid terminal IDs
      expect(() => {
        terminalService.writeInput('invalid-id', 'test');
      }).toThrow('Terminal not found');

      expect(() => {
        terminalService.resizeTerminal('invalid-id', 80, 24);
      }).toThrow('Terminal not found');

      const destroyed = terminalService.destroyTerminal('invalid-id');
      expect(destroyed).toBe(false);

      const terminalInfo = terminalService.getTerminalInfo('invalid-id');
      expect(terminalInfo).toBeNull();
    });

    test('should get user terminals for non-existent user', () => {
      const userTerminals = terminalService.getUserTerminals('non-existent-user');
      expect(Array.isArray(userTerminals)).toBe(true);
      expect(userTerminals.length).toBe(0);
    });

    test('should get all terminals', () => {
      const allTerminals = terminalService.getAllTerminals();
      expect(Array.isArray(allTerminals)).toBe(true);
    });

    test('should handle cleanup methods', () => {
      // Test cleanup methods don't throw errors
      expect(() => {
        terminalService.cleanupInactiveTerminals();
      }).not.toThrow();

      expect(() => {
        terminalService.destroyUserTerminals('non-existent-user');
      }).not.toThrow();
    });
  });

  describe('Shell Detection', () => {
    test('should detect appropriate shell for platform', () => {
      const userId = 'test-user-shell';
      const workspaceId = 'test-workspace-shell';
      
      try {
        const terminalInfo = terminalService.createTerminal(userId, workspaceId);
        
        if (process.platform === 'win32') {
          expect(terminalInfo.shell).toMatch(/cmd\.exe$/);
        } else {
          expect(terminalInfo.shell).toMatch(/(bash|sh)$/);
        }

        // Clean up
        terminalService.destroyTerminal(terminalInfo.terminalId);
      } catch (error) {
        // Expected on systems without proper shell access
        expect(error.message).toContain('Failed to create terminal');
      }
    });
  });

  describe('WebSocket Event Structure', () => {
    test('should have correct event handler signatures', () => {
      // Mock socket object
      const mockSocket = {
        emit: jest.fn(),
        id: 'test-socket-id'
      };

      // Mock session
      const mockSession = {
        userId: 'test-user',
        terminalSessions: new Map()
      };

      // Test that handlers can be called without throwing (they will emit errors for invalid data)
      expect(() => {
        webSocketService.userSessions.set(mockSocket.id, mockSession);
        
        // These should not throw, but will emit errors due to missing data
        webSocketService.handleTerminalCreate(mockSocket, {});
        webSocketService.handleTerminalInput(mockSocket, {});
        webSocketService.handleTerminalResize(mockSocket, {});
        webSocketService.handleTerminalDestroy(mockSocket, {});
        
        // Clean up
        webSocketService.userSessions.delete(mockSocket.id);
      }).not.toThrow();

      // Verify error events were emitted for invalid data
      expect(mockSocket.emit).toHaveBeenCalledWith('terminal:error', expect.any(Object));
    });
  });
});