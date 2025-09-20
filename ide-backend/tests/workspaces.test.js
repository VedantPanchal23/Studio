const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const JWTUtils = require('../utils/jwt');

describe('Workspace Management API', () => {
  let testUser;
  let testUser2;
  let authToken;
  let authToken2;
  let testWorkspace;

  beforeAll(async () => {
    // Create test users
    testUser = new User({
      googleId: 'test-google-id-1',
      email: 'test1@example.com',
      name: 'Test User 1',
      avatar: 'https://example.com/avatar1.jpg'
    });
    await testUser.save();

    testUser2 = new User({
      googleId: 'test-google-id-2',
      email: 'test2@example.com',
      name: 'Test User 2',
      avatar: 'https://example.com/avatar2.jpg'
    });
    await testUser2.save();

    // Generate auth tokens
    authToken = JWTUtils.generateAccessToken({ id: testUser._id });
    authToken2 = JWTUtils.generateAccessToken({ id: testUser2._id });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $in: ['test1@example.com', 'test2@example.com'] } });
    await Workspace.deleteMany({ owner: { $in: [testUser._id, testUser2._id] } });
  });

  beforeEach(async () => {
    // Clean up workspaces before each test
    await Workspace.deleteMany({ owner: { $in: [testUser._id, testUser2._id] } });
  });

  describe('POST /api/workspaces', () => {
    it('should create a new workspace', async () => {
      const workspaceData = {
        name: 'Test Workspace',
        description: 'A test workspace',
        isPublic: false,
        settings: {
          runtime: 'node',
          version: '18'
        }
      };

      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workspaceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspace.name).toBe(workspaceData.name);
      expect(response.body.data.workspace.description).toBe(workspaceData.description);
      expect(response.body.data.workspace.owner._id).toBe(testUser._id.toString());
      expect(response.body.data.workspace.userRole).toBe('owner');
    });

    it('should fail to create workspace without authentication', async () => {
      const workspaceData = {
        name: 'Test Workspace',
        description: 'A test workspace'
      };

      const response = await request(app)
        .post('/api/workspaces')
        .send(workspaceData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create workspace with invalid name', async () => {
      const workspaceData = {
        name: '', // Invalid empty name
        description: 'A test workspace'
      };

      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workspaceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should fail to create duplicate workspace name', async () => {
      // Create first workspace
      const workspaceData = {
        name: 'Duplicate Test',
        description: 'First workspace'
      };

      await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workspaceData)
        .expect(201);

      // Try to create second workspace with same name
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workspaceData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('GET /api/workspaces', () => {
    beforeEach(async () => {
      // Create test workspaces
      testWorkspace = new Workspace({
        name: 'Test Workspace 1',
        description: 'First test workspace',
        owner: testUser._id,
        isPublic: false
      });
      await testWorkspace.save();

      const workspace2 = new Workspace({
        name: 'Test Workspace 2',
        description: 'Second test workspace',
        owner: testUser._id,
        isPublic: true
      });
      await workspace2.save();

      // Create workspace with collaboration
      const workspace3 = new Workspace({
        name: 'Collaborative Workspace',
        description: 'Workspace with collaborators',
        owner: testUser2._id,
        collaborators: [{
          userId: testUser._id,
          role: 'editor',
          permissions: { read: true, write: true, execute: true, admin: false }
        }]
      });
      await workspace3.save();
    });

    it('should list user workspaces', async () => {
      const response = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspaces).toHaveLength(3); // 2 owned + 1 collaborative
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/workspaces?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspaces.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/workspaces?search=Collaborative')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspaces.length).toBeGreaterThan(0);
      expect(response.body.data.workspaces[0].name).toContain('Collaborative');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/workspaces')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/workspaces/:workspaceId', () => {
    beforeEach(async () => {
      testWorkspace = new Workspace({
        name: 'Test Workspace',
        description: 'A test workspace',
        owner: testUser._id,
        isPublic: false
      });
      await testWorkspace.save();
    });

    it('should get workspace details for owner', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspace._id).toBe(testWorkspace._id.toString());
      expect(response.body.data.workspace.userRole).toBe('owner');
    });

    it('should fail to get workspace without access', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid workspace ID', async () => {
      const response = await request(app)
        .get('/api/workspaces/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/workspaces/:workspaceId', () => {
    beforeEach(async () => {
      testWorkspace = new Workspace({
        name: 'Test Workspace',
        description: 'A test workspace',
        owner: testUser._id,
        isPublic: false
      });
      await testWorkspace.save();
    });

    it('should update workspace for owner', async () => {
      const updateData = {
        name: 'Updated Workspace',
        description: 'Updated description',
        isPublic: true
      };

      const response = await request(app)
        .put(`/api/workspaces/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspace.name).toBe(updateData.name);
      expect(response.body.data.workspace.description).toBe(updateData.description);
      expect(response.body.data.workspace.isPublic).toBe(updateData.isPublic);
    });

    it('should fail to update workspace without admin access', async () => {
      const updateData = {
        name: 'Updated Workspace'
      };

      const response = await request(app)
        .put(`/api/workspaces/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/workspaces/:workspaceId', () => {
    beforeEach(async () => {
      testWorkspace = new Workspace({
        name: 'Test Workspace',
        description: 'A test workspace',
        owner: testUser._id,
        isPublic: false
      });
      await testWorkspace.save();
    });

    it('should archive workspace for owner', async () => {
      const response = await request(app)
        .delete(`/api/workspaces/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('archived');

      // Verify workspace is archived
      const workspace = await Workspace.findById(testWorkspace._id);
      expect(workspace.isArchived).toBe(true);
    });

    it('should permanently delete workspace when specified', async () => {
      const response = await request(app)
        .delete(`/api/workspaces/${testWorkspace._id}?permanent=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('permanently deleted');

      // Verify workspace is deleted
      const workspace = await Workspace.findById(testWorkspace._id);
      expect(workspace).toBeNull();
    });

    it('should fail to delete workspace without admin access', async () => {
      const response = await request(app)
        .delete(`/api/workspaces/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Collaboration Management', () => {
    beforeEach(async () => {
      testWorkspace = new Workspace({
        name: 'Collaborative Workspace',
        description: 'A workspace for collaboration',
        owner: testUser._id,
        isPublic: false
      });
      await testWorkspace.save();
    });

    describe('POST /api/workspaces/:workspaceId/collaborators', () => {
      it('should add collaborator to workspace', async () => {
        const collaboratorData = {
          email: testUser2.email,
          role: 'editor'
        };

        const response = await request(app)
          .post(`/api/workspaces/${testWorkspace._id}/collaborators`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(collaboratorData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.collaborator.userId.email).toBe(testUser2.email);
        expect(response.body.data.collaborator.role).toBe('editor');
      });

      it('should fail to add non-existent user', async () => {
        const collaboratorData = {
          email: 'nonexistent@example.com',
          role: 'editor'
        };

        const response = await request(app)
          .post(`/api/workspaces/${testWorkspace._id}/collaborators`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(collaboratorData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('User not found');
      });

      it('should fail to add owner as collaborator', async () => {
        const collaboratorData = {
          email: testUser.email,
          role: 'editor'
        };

        const response = await request(app)
          .post(`/api/workspaces/${testWorkspace._id}/collaborators`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(collaboratorData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already the owner');
      });
    });

    describe('PUT /api/workspaces/:workspaceId/collaborators/:userId', () => {
      beforeEach(async () => {
        // Add collaborator first
        await testWorkspace.addCollaborator(testUser2._id, 'viewer');
      });

      it('should update collaborator role', async () => {
        const response = await request(app)
          .put(`/api/workspaces/${testWorkspace._id}/collaborators/${testUser2._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ role: 'editor' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.collaborator.role).toBe('editor');
      });

      it('should fail to update non-existent collaborator', async () => {
        const nonExistentUserId = new mongoose.Types.ObjectId();
        
        const response = await request(app)
          .put(`/api/workspaces/${testWorkspace._id}/collaborators/${nonExistentUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ role: 'editor' })
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/workspaces/:workspaceId/collaborators/:userId', () => {
      beforeEach(async () => {
        // Add collaborator first
        await testWorkspace.addCollaborator(testUser2._id, 'editor');
      });

      it('should remove collaborator', async () => {
        const response = await request(app)
          .delete(`/api/workspaces/${testWorkspace._id}/collaborators/${testUser2._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('removed');
      });

      it('should fail to remove owner', async () => {
        const response = await request(app)
          .delete(`/api/workspaces/${testWorkspace._id}/collaborators/${testUser._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Cannot remove workspace owner');
      });
    });
  });

  describe('Workspace Utilities', () => {
    beforeEach(async () => {
      testWorkspace = new Workspace({
        name: 'Test Workspace',
        description: 'A test workspace',
        owner: testUser._id,
        isPublic: false
      });
      await testWorkspace.save();
    });

    describe('POST /api/workspaces/:workspaceId/duplicate', () => {
      it('should duplicate workspace', async () => {
        const response = await request(app)
          .post(`/api/workspaces/${testWorkspace._id}/duplicate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Duplicated Workspace' })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.workspace.name).toBe('Duplicated Workspace');
        expect(response.body.data.workspace.description).toContain('Copy of');
      });

      it('should fail to duplicate with existing name', async () => {
        const response = await request(app)
          .post(`/api/workspaces/${testWorkspace._id}/duplicate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: testWorkspace.name })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already exists');
      });
    });

    describe('POST /api/workspaces/:workspaceId/restore', () => {
      beforeEach(async () => {
        // Archive the workspace first
        testWorkspace.isArchived = true;
        await testWorkspace.save();
      });

      it('should restore archived workspace', async () => {
        const response = await request(app)
          .post(`/api/workspaces/${testWorkspace._id}/restore`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('restored');

        // Verify workspace is restored
        const workspace = await Workspace.findById(testWorkspace._id);
        expect(workspace.isArchived).toBe(false);
      });

      it('should fail to restore non-archived workspace', async () => {
        // Unarchive first
        testWorkspace.isArchived = false;
        await testWorkspace.save();

        const response = await request(app)
          .post(`/api/workspaces/${testWorkspace._id}/restore`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not archived');
      });
    });
  });

  describe('GET /api/workspaces/public/list', () => {
    beforeEach(async () => {
      // Create public workspace
      const publicWorkspace = new Workspace({
        name: 'Public Workspace',
        description: 'A public workspace',
        owner: testUser._id,
        isPublic: true
      });
      await publicWorkspace.save();

      // Create private workspace
      const privateWorkspace = new Workspace({
        name: 'Private Workspace',
        description: 'A private workspace',
        owner: testUser._id,
        isPublic: false
      });
      await privateWorkspace.save();
    });

    it('should list public workspaces without authentication', async () => {
      const response = await request(app)
        .get('/api/workspaces/public/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspaces.length).toBeGreaterThan(0);
      expect(response.body.data.workspaces[0].isPublic).toBe(true);
    });

    it('should support search in public workspaces', async () => {
      const response = await request(app)
        .get('/api/workspaces/public/list?search=Public')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspaces.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/workspaces/stats/overview', () => {
    beforeEach(async () => {
      // Create various workspaces for stats
      const workspaces = [
        new Workspace({
          name: 'Workspace 1',
          owner: testUser._id,
          isPublic: true,
          stats: { totalFiles: 5, totalSize: 1000, executionCount: 10 }
        }),
        new Workspace({
          name: 'Workspace 2',
          owner: testUser._id,
          isPublic: false,
          isArchived: true,
          stats: { totalFiles: 3, totalSize: 500, executionCount: 5 }
        }),
        new Workspace({
          name: 'Collaborative Workspace',
          owner: testUser2._id,
          collaborators: [{
            userId: testUser._id,
            role: 'editor',
            permissions: { read: true, write: true, execute: true, admin: false }
          }],
          stats: { totalFiles: 8, totalSize: 2000, executionCount: 15 }
        })
      ];

      await Workspace.insertMany(workspaces);
    });

    it('should get user workspace statistics', async () => {
      const response = await request(app)
        .get('/api/workspaces/stats/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalWorkspaces).toBeGreaterThan(0);
      expect(response.body.data.stats.ownedWorkspaces).toBeGreaterThan(0);
      expect(response.body.data.recentWorkspaces).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/workspaces/stats/overview')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});