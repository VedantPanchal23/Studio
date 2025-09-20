const terminalService = require('../services/terminal');
const logger = require('../utils/logger');

describe('Terminal Integration Tests', () => {
  let testTerminalId;
  const testUserId = 'test-user-123';
  const testWorkspaceId = 'test-workspace-123';

  afterEach(() => {
    // Clean up any created terminals
    if (testTerminalId) {
      try {
        terminalService.destroyTerminal(testTerminalId);
      } catch (error) {
        // Ignore cleanup errors
      }
      testTerminalId = null;
    }
  });

  test('should create a terminal session', () => {
    const terminalInfo = terminalService.createTerminal(testUserId, testWorkspaceId, {
      cols: 80,
      rows: 24
    });

    testTerminalId = terminalInfo.terminalId;

    expect(terminalInfo).toBeDefined();
    expect(terminalInfo.terminalId).toBeDefined();
    expect(terminalInfo.shell).toBeDefined();
    expect(terminalInfo.cwd).toBeDefined();
    expect(terminalInfo.cols).toBe(80);
    expect(terminalInfo.rows).toBe(24);
    expect(terminalInfo.pid).toBeDefined();
    expect(terminalInfo.createdAt).toBeDefined();
  });

  test('should get terminal info', () => {
    const terminalInfo = terminalService.createTerminal(testUserId, testWorkspaceId);
    testTerminalId = terminalInfo.terminalId;

    const info = terminalService.getTerminalInfo(testTerminalId);

    expect(info).toBeDefined();
    expect(info.id).toBe(testTerminalId);
    expect(info.userId).toBe(testUserId);
    expect(info.workspaceId).toBe(testWorkspaceId);
    expect(info.isActive).toBe(true);
  });

  test('should write input to terminal', () => {
    const terminalInfo = terminalService.createTerminal(testUserId, testWorkspaceId);
    testTerminalId = terminalInfo.terminalId;

    // Should not throw error
    expect(() => {
      terminalService.writeInput(testTerminalId, 'echo "test"\n');
    }).not.toThrow();
  });

  test('should resize terminal', () => {
    const terminalInfo = terminalService.createTerminal(testUserId, testWorkspaceId);
    testTerminalId = terminalInfo.terminalId;

    // Should not throw error
    expect(() => {
      terminalService.resizeTerminal(testTerminalId, 120, 30);
    }).not.toThrow();

    const info = terminalService.getTerminalInfo(testTerminalId);
    expect(info.cols).toBe(120);
    expect(info.rows).toBe(30);
  });

  test('should get output streams', () => {
    const terminalInfo = terminalService.createTerminal(testUserId, testWorkspaceId);
    testTerminalId = terminalInfo.terminalId;

    const streams = terminalService.getOutputStream(testTerminalId);

    expect(streams).toBeDefined();
    expect(streams.stdout).toBeDefined();
    expect(streams.stderr).toBeDefined();
  });

  test('should destroy terminal', () => {
    const terminalInfo = terminalService.createTerminal(testUserId, testWorkspaceId);
    testTerminalId = terminalInfo.terminalId;

    const destroyed = terminalService.destroyTerminal(testTerminalId);
    expect(destroyed).toBe(true);

    // Terminal should no longer exist
    const info = terminalService.getTerminalInfo(testTerminalId);
    expect(info).toBeNull();

    testTerminalId = null; // Prevent cleanup in afterEach
  });

  test('should get user terminals', () => {
    const terminalInfo1 = terminalService.createTerminal(testUserId, testWorkspaceId);
    const terminalInfo2 = terminalService.createTerminal(testUserId, testWorkspaceId);

    const userTerminals = terminalService.getUserTerminals(testUserId);

    expect(userTerminals).toHaveLength(2);
    expect(userTerminals.map(t => t.id)).toContain(terminalInfo1.terminalId);
    expect(userTerminals.map(t => t.id)).toContain(terminalInfo2.terminalId);

    // Cleanup
    terminalService.destroyTerminal(terminalInfo1.terminalId);
    terminalService.destroyTerminal(terminalInfo2.terminalId);
  });
});