const request = require('supertest');
const terminalService = require('../services/terminal');
const User = require('../models/User');
const JWTUtils = require('../utils/jwt');
const { initializeDatabases, closeDatabases } = require('../utils/database');

describe('Terminal Service', () => {
  let testUser;
  let testWorkspaceId;

  beforeAll(async () => {
    await initializeDatabases({ skipRedis: true });
    
    testUser = new User({
      googleId: 'test-google-id-terminal',
      email: 'terminal@test.com',
      name: 'Terminal Test User',
      avatar: 'https://example.com/avatar.jpg'
    });
    await testUser.save();
    
    testWorkspaceId = 'test-workspace-terminal';
  });

  afterAll(async () => {
    // Clean up any remaining terminals
    terminalService.destroyUserTerminals(testUser._id.toString());
    
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
    }
    await closeDatabases();
  });

  describe('Terminal Creation', () => {
    test('should create a new terminal session', () => {
      const userId = testUser._id.toString();
      
      const terminalInfo = terminalService.createTerminal(userId, testWorkspaceId, {
        cols: 80,
        rows: 24
      });

      expect(terminalInfo).toHaveProperty('terminalId');
      expect(terminalInfo).toHaveProperty('shell');
      expect(terminalInfo).toHaveProperty('cwd');
      expect(terminalInfo).toHaveProperty('cols', 80);
      expect(terminalInfo).toHaveProperty('rows', 24);
      expect(terminalInfo).toHaveProperty('pid');
      expect(terminalInfo).toHaveProperty('createdAt');

      // Clean up
      terminalService.destroyTerminal(terminalInfo.terminalId);
    });

    test('should create terminal with default dimensions', () => {
      const userId = testUser._id.toString();
      
      const terminalInfo = terminalService.createTerminal(userId, testWorkspaceId);

      expect(terminalInfo.cols).toBe(80);
      expect(terminalInfo.rows).toBe(24);

      // Clean up
      terminalService.destroyTerminal(terminalInfo.terminalId);
    });

    test('should create terminal with custom shell', () => {
      const userId = testUser._id.toString();
      const customShell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      
      const terminalInfo = terminalService.createTerminal(userId, testWorkspaceId, {
        shell: customShell
      });

      expect(terminalInfo.shell).toBe(customShell);

      // Clean up
      terminalService.destroyTerminal(terminalInfo.terminalId);
    });
  });

  describe('Terminal Management', () => {
    let terminalId;

    beforeEach(() => {
      const userId = testUser._id.toString();
      const terminalInfo = terminalService.createTerminal(userId, testWorkspaceId);
      terminalId = terminalInfo.terminalId;
    });

    afterEach(() => {
      if (terminalId) {
        terminalService.destroyTerminal(terminalId);
      }
    });

    test('should get terminal info', () => {
      const terminalInfo = terminalService.getTerminalInfo(terminalId);
      
      expect(terminalInfo).toBeTruthy();
      expect(terminalInfo.id).toBe(terminalId);
      expect(terminalInfo.userId).toBe(testUser._id.toString());
      expect(terminalInfo.workspaceId).toBe(testWorkspaceId);
      expect(terminalInfo.isActive).toBe(true);
    });

    test('should resize terminal', () => {
      terminalService.resizeTerminal(terminalId, 120, 30);
      
      const terminalInfo = terminalService.getTerminalInfo(terminalId);
      expect(terminalInfo.cols).toBe(120);
      expect(terminalInfo.rows).toBe(30);
    });

    test('should get user terminals', () => {
      const userId = testUser._id.toString();
      const userTerminals = terminalService.getUserTerminals(userId);
      
      expect(Array.isArray(userTerminals)).toBe(true);
      expect(userTerminals.length).toBeGreaterThan(0);
      expect(userTerminals[0].userId).toBe(userId);
    });

    test('should destroy terminal', () => {
      const destroyed = terminalService.destroyTerminal(terminalId);
      expect(destroyed).toBe(true);
      
      const terminalInfo = terminalService.getTerminalInfo(terminalId);
      expect(terminalInfo).toBeNull();
      
      terminalId = null; // Prevent cleanup in afterEach
    });
  });

  describe('Terminal Input/Output', () => {
    let terminalId;

    beforeEach(() => {
      const userId = testUser._id.toString();
      const terminalInfo = terminalService.createTerminal(userId, testWorkspaceId);
      terminalId = terminalInfo.terminalId;
    });

    afterEach(() => {
      if (terminalId) {
        terminalService.destroyTerminal(terminalId);
      }
    });

    test('should write input to terminal', () => {
      expect(() => {
        terminalService.writeInput(terminalId, 'echo "Hello World"\n');
      }).not.toThrow();
    });

    test('should get output streams', () => {
      const streams = terminalService.getOutputStream(terminalId);
      
      expect(streams).toHaveProperty('stdout');
      expect(streams).toHaveProperty('stderr');
      expect(streams.stdout).toBeTruthy();
      expect(streams.stderr).toBeTruthy();
    });

    test('should throw error for invalid terminal ID', () => {
      expect(() => {
        terminalService.writeInput('invalid-id', 'test');
      }).toThrow('Terminal not found');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid terminal ID for resize', () => {
      expect(() => {
        terminalService.resizeTerminal('invalid-id', 80, 24);
      }).toThrow('Terminal not found');
    });

    test('should handle invalid terminal ID for destroy', () => {
      const destroyed = terminalService.destroyTerminal('invalid-id');
      expect(destroyed).toBe(false);
    });

    test('should return null for invalid terminal info request', () => {
      const terminalInfo = terminalService.getTerminalInfo('invalid-id');
      expect(terminalInfo).toBeNull();
    });
  });
});

describe('Terminal API Routes', () => {
  let testUser;
  let authToken;
  let app;

  beforeAll(async () => {
    await initializeDatabases({ skipRedis: true });
    
    testUser = new User({
      googleId: 'test-google-id-terminal-api',
      email: 'terminal-api@test.com',
      name: 'Terminal API Test User',
      avatar: 'https://example.com/avatar.jpg'
    });
    await testUser.save();

    authToken = JWTUtils.generateAccessToken({ id: testUser._id });
    app = require('../server');
  });

  afterAll(async () => {
    // Clean up any remaining terminals
    terminalService.destroyUserTerminals(testUser._id.toString());
    
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
    }
    await closeDatabases();
  });

  describe('POST /api/terminal/create', () => {
    test('should create terminal for authenticated user', async () => {
      const response = await request(app)
        .post('/api/terminal/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workspaceId: 'test-workspace-api',
          cols: 100,
          rows: 30
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('terminalId');
      expect(response.body.data).toHaveProperty('shell');
      expect(response.body.data.cols).toBe(100);
      expect(response.body.data.rows).toBe(30);

      // Clean up
      terminalService.destroyTerminal(response.body.data.terminalId);
    });

    test('should reject request without workspace ID', async () => {
      await request(app)
        .post('/api/terminal/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cols: 80,
          rows: 24
        })
        .expect(400);
    });

    test('should reject unauthenticated requests', async () => {
      await request(app)
        .post('/api/terminal/create')
        .send({
          workspaceId: 'test-workspace',
          cols: 80,
          rows: 24
        })
        .expect(401);
    });
  });

  describe('GET /api/terminal/sessions', () => {
    let terminalId;

    beforeEach(async () => {
      const userId = testUser._id.toString();
      const terminalInfo = terminalService.createTerminal(userId, 'test-workspace-sessions');
      terminalId = terminalInfo.terminalId;
    });

    afterEach(() => {
      if (terminalId) {
        terminalService.destroyTerminal(terminalId);
      }
    });

    test('should get user terminal sessions', async () => {
      const response = await request(app)
        .get('/api/terminal/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('terminals');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.terminals)).toBe(true);
      expect(response.body.data.count).toBeGreaterThan(0);
    });

    test('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/terminal/sessions')
        .expect(401);
    });
  });

  describe('GET /api/terminal/:terminalId', () => {
    let terminalId;

    beforeEach(async () => {
      const userId = testUser._id.toString();
      const terminalInfo = terminalService.createTerminal(userId, 'test-workspace-info');
      terminalId = terminalInfo.terminalId;
    });

    afterEach(() => {
      if (terminalId) {
        terminalService.destroyTerminal(terminalId);
      }
    });

    test('should get terminal info for owner', async () => {
      const response = await request(app)
        .get(`/api/terminal/${terminalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(terminalId);
      expect(response.body.data.userId).toBe(testUser._id.toString());
    });

    test('should return 404 for non-existent terminal', async () => {
      await request(app)
        .get('/api/terminal/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should reject unauthenticated requests', async () => {
      await request(app)
        .get(`/api/terminal/${terminalId}`)
        .expect(401);
    });
  });

  describe('DELETE /api/terminal/:terminalId', () => {
    let terminalId;

    beforeEach(async () => {
      const userId = testUser._id.toString();
      const terminalInfo = terminalService.createTerminal(userId, 'test-workspace-delete');
      terminalId = terminalInfo.terminalId;
    });

    test('should destroy terminal for owner', async () => {
      const response = await request(app)
        .delete(`/api/terminal/${terminalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Terminal destroyed successfully');
      
      terminalId = null; // Prevent cleanup in afterEach
    });

    test('should return 404 for non-existent terminal', async () => {
      await request(app)
        .delete('/api/terminal/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should reject unauthenticated requests', async () => {
      await request(app)
        .delete(`/api/terminal/${terminalId}`)
        .expect(401);
    });

    afterEach(() => {
      if (terminalId) {
        terminalService.destroyTerminal(terminalId);
      }
    });
  });
});