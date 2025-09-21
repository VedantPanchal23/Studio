const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User, Workspace } = require('../models');
const firebaseTestAuth = require('./utils/firebaseTestAuth');
const fileSystem = require('../utils/fileSystem');

// Create app without starting server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const config = require('../config');
const logger = require('../utils/logger');

// Import middleware
const { 
  globalErrorHandler, 
  handleUnhandledRoutes 
} = require('../middleware/errorHandler');
const { 
  generalLimiter, 
  apiLimiter, 
  sanitizeRequest, 
  requestLogger 
} = require('../middleware/security');

// Create test app
const createTestApp = () => {
  const app = express();

  // Security middleware
  app.use(helmet(config.security.helmet));
  app.use(cors(config.cors));
  app.use(compression());

  // Body parsing middleware
  app.use(express.json(config.bodyParser.json));
  app.use(express.urlencoded(config.bodyParser.urlencoded));
  app.use(sanitizeRequest);

  // File management routes
  const fileRoutes = require('../routes/files');
  app.use('/api/files', fileRoutes);

  // Handle unhandled routes
  app.use('*', handleUnhandledRoutes);
  app.use(globalErrorHandler);

  return app;
};

describe('File Operations API', () => {
  let mongoServer;
  let testUser;
  let testWorkspace;
  let authToken;
  let app;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Disconnect existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Connect to test database
    await mongoose.connect(mongoUri);
    
    // Initialize file system
    await fileSystem.initializeWorkspaceDirectory();
    
    // Create test app
    app = createTestApp();
  });

  afterAll(async () => {
    // Clean up
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await Workspace.deleteMany({});
    
    // Create test user
    testUser = await User.create({
      firebaseUid: 'test-firebase-uid',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    });
    
    // Create test workspace
    testWorkspace = await Workspace.create({
      name: 'Test Workspace',
      owner: testUser._id,
      files: []
    });
    
    // Generate Firebase auth token
    authToken = firebaseTestAuth.generateMockIdToken({ uid: 'test-firebase-uid' });
    
    // Create workspace directory
    await fileSystem.createWorkspaceDirectory(testWorkspace._id);
  });

  afterEach(async () => {
    // Clean up workspace directory
    try {
      await fileSystem.deleteWorkspaceDirectory(testWorkspace._id);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('GET /api/files/:workspaceId', () => {
    it('should list files in workspace root', async () => {
      const response = await request(app)
        .get(`/api/files/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('files');
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('path', '');
      expect(Array.isArray(response.body.files)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/files/${testWorkspace._id}`)
        .expect(401);
    });

    it('should return 404 for non-existent workspace', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/files/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/files/:workspaceId/*', () => {
    it('should create a new file', async () => {
      const fileContent = 'console.log("Hello, World!");';
      const filePath = 'test.js';

      const response = await request(app)
        .put(`/api/files/${testWorkspace._id}/${filePath}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: fileContent })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'File saved successfully');
      expect(response.body).toHaveProperty('path', filePath);
      expect(response.body).toHaveProperty('language', 'javascript');
      expect(response.body).toHaveProperty('size');
    });

    it('should update existing file', async () => {
      const filePath = 'test.js';
      const initialContent = 'console.log("Hello");';
      const updatedContent = 'console.log("Hello, Updated!");';

      // Create initial file
      await request(app)
        .put(`/api/files/${testWorkspace._id}/${filePath}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: initialContent })
        .expect(200);

      // Update file
      const response = await request(app)
        .put(`/api/files/${testWorkspace._id}/${filePath}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: updatedContent })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'File saved successfully');
      expect(response.body).toHaveProperty('path', filePath);
    });

    it('should reject invalid file paths', async () => {
      const invalidPaths = ['../test.js', '/etc/passwd', 'test<>.js'];

      for (const path of invalidPaths) {
        await request(app)
          .put(`/api/files/${testWorkspace._id}/${path}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 'test content' })
          .expect(400);
      }
    });

    it('should reject files that are too large', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB

      await request(app)
        .put(`/api/files/${testWorkspace._id}/large.txt`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: largeContent })
        .expect(400);
    });
  });

  describe('GET /api/files/:workspaceId/*', () => {
    beforeEach(async () => {
      // Create a test file
      await request(app)
        .put(`/api/files/${testWorkspace._id}/test.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'console.log("test");' });
    });

    it('should get file content', async () => {
      const response = await request(app)
        .get(`/api/files/${testWorkspace._id}/test.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('type', 'file');
      expect(response.body).toHaveProperty('path', 'test.js');
      expect(response.body).toHaveProperty('content', 'console.log("test");');
      expect(response.body).toHaveProperty('language', 'javascript');
    });

    it('should return 404 for non-existent file', async () => {
      await request(app)
        .get(`/api/files/${testWorkspace._id}/nonexistent.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/files/:workspaceId/create', () => {
    it('should create a new file', async () => {
      const response = await request(app)
        .post(`/api/files/${testWorkspace._id}/create`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          path: 'newfile.js',
          type: 'file',
          content: 'console.log("new file");'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'File created successfully');
      expect(response.body).toHaveProperty('path', 'newfile.js');
      expect(response.body).toHaveProperty('type', 'file');
    });

    it('should create a new directory', async () => {
      const response = await request(app)
        .post(`/api/files/${testWorkspace._id}/create`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          path: 'src',
          type: 'directory'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Directory created successfully');
      expect(response.body).toHaveProperty('path', 'src');
      expect(response.body).toHaveProperty('type', 'directory');
    });

    it('should reject creation of existing file', async () => {
      // Create initial file
      await request(app)
        .post(`/api/files/${testWorkspace._id}/create`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          path: 'existing.js',
          type: 'file',
          content: 'test'
        });

      // Try to create same file again
      await request(app)
        .post(`/api/files/${testWorkspace._id}/create`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          path: 'existing.js',
          type: 'file',
          content: 'test'
        })
        .expect(409);
    });
  });

  describe('DELETE /api/files/:workspaceId/*', () => {
    beforeEach(async () => {
      // Create test files
      await request(app)
        .put(`/api/files/${testWorkspace._id}/delete-test.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'console.log("delete me");' });
    });

    it('should delete a file', async () => {
      const response = await request(app)
        .delete(`/api/files/${testWorkspace._id}/delete-test.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'File deleted successfully');
      expect(response.body).toHaveProperty('path', 'delete-test.js');
      expect(response.body).toHaveProperty('type', 'file');

      // Verify file is deleted
      await request(app)
        .get(`/api/files/${testWorkspace._id}/delete-test.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent file', async () => {
      await request(app)
        .delete(`/api/files/${testWorkspace._id}/nonexistent.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/files/:workspaceId/move', () => {
    beforeEach(async () => {
      // Create test file
      await request(app)
        .put(`/api/files/${testWorkspace._id}/move-source.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'console.log("move me");' });
    });

    it('should move/rename a file', async () => {
      const response = await request(app)
        .post(`/api/files/${testWorkspace._id}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          from: 'move-source.js',
          to: 'move-destination.js'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'File moved successfully');
      expect(response.body).toHaveProperty('from', 'move-source.js');
      expect(response.body).toHaveProperty('to', 'move-destination.js');

      // Verify old file is gone
      await request(app)
        .get(`/api/files/${testWorkspace._id}/move-source.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verify new file exists
      await request(app)
        .get(`/api/files/${testWorkspace._id}/move-destination.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 404 for non-existent source', async () => {
      await request(app)
        .post(`/api/files/${testWorkspace._id}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          from: 'nonexistent.js',
          to: 'destination.js'
        })
        .expect(404);
    });

    it('should return 409 if destination exists', async () => {
      // Create destination file
      await request(app)
        .put(`/api/files/${testWorkspace._id}/existing-dest.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'existing' });

      await request(app)
        .post(`/api/files/${testWorkspace._id}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          from: 'move-source.js',
          to: 'existing-dest.js'
        })
        .expect(409);
    });
  });

  describe('POST /api/files/:workspaceId/copy', () => {
    beforeEach(async () => {
      // Create test file
      await request(app)
        .put(`/api/files/${testWorkspace._id}/copy-source.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'console.log("copy me");' });
    });

    it('should copy a file', async () => {
      const response = await request(app)
        .post(`/api/files/${testWorkspace._id}/copy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          from: 'copy-source.js',
          to: 'copy-destination.js'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'File copied successfully');
      expect(response.body).toHaveProperty('from', 'copy-source.js');
      expect(response.body).toHaveProperty('to', 'copy-destination.js');

      // Verify both files exist
      await request(app)
        .get(`/api/files/${testWorkspace._id}/copy-source.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app)
        .get(`/api/files/${testWorkspace._id}/copy-destination.js`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Workspace Access Control', () => {
    let otherUser;
    let otherUserToken;

    beforeEach(async () => {
      // Create another user
      otherUser = await User.create({
        firebaseUid: 'other-firebase-uid',
        email: 'other@example.com',
        name: 'Other User',
        avatar: 'https://example.com/other-avatar.jpg'
      });

      otherUserToken = firebaseTestAuth.generateMockIdToken({ uid: 'other-firebase-uid' });
    });

    it('should deny access to workspace owned by another user', async () => {
      await request(app)
        .get(`/api/files/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should allow access to collaborator', async () => {
      // Add other user as collaborator
      await testWorkspace.addCollaborator(otherUser._id, 'editor');

      await request(app)
        .get(`/api/files/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);
    });

    it('should deny write access to viewer', async () => {
      // Add other user as viewer
      await testWorkspace.addCollaborator(otherUser._id, 'viewer');

      await request(app)
        .put(`/api/files/${testWorkspace._id}/test.js`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ content: 'test' })
        .expect(403);
    });
  });
});