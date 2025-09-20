const collaborationService = require('../services/collaborationService');
const Y = require('yjs');

describe('CollaborationService', () => {
  beforeEach(() => {
    // Reset service state
    collaborationService.documents.clear();
    collaborationService.documentConnections.clear();
    collaborationService.userAwareness.clear();
    collaborationService.persistenceTimers.clear();
  });

  test('should create a new document', async () => {
    const documentId = 'test-workspace:test-file.js';
    const workspaceId = 'test-workspace';
    const filePath = 'test-file.js';

    const doc = await collaborationService.getDocument(documentId, workspaceId, filePath);

    expect(doc).toBeInstanceOf(Y.Doc);
    expect(collaborationService.documents.has(documentId)).toBe(true);
    expect(collaborationService.documentConnections.has(documentId)).toBe(true);
    expect(collaborationService.userAwareness.has(documentId)).toBe(true);
  });

  test('should return existing document', async () => {
    const documentId = 'test-workspace:test-file.js';
    const workspaceId = 'test-workspace';
    const filePath = 'test-file.js';

    const doc1 = await collaborationService.getDocument(documentId, workspaceId, filePath);
    const doc2 = await collaborationService.getDocument(documentId, workspaceId, filePath);

    expect(doc1).toBe(doc2);
  });

  test('should get document statistics', async () => {
    const documentId = 'test-workspace:test-file.js';
    const workspaceId = 'test-workspace';
    const filePath = 'test-file.js';

    await collaborationService.getDocument(documentId, workspaceId, filePath);
    const stats = collaborationService.getDocumentStats(documentId);

    expect(stats).toEqual({
      documentId,
      exists: true,
      connectionCount: 0,
      userCount: 0,
      documentSize: expect.any(Number),
      createdAt: null
    });
  });

  test('should return null for non-existent document stats', () => {
    const stats = collaborationService.getDocumentStats('non-existent');
    expect(stats).toBeNull();
  });

  test('should get all documents', async () => {
    const documentId1 = 'test-workspace:file1.js';
    const documentId2 = 'test-workspace:file2.js';
    
    await collaborationService.getDocument(documentId1, 'test-workspace', 'file1.js');
    await collaborationService.getDocument(documentId2, 'test-workspace', 'file2.js');

    const allDocs = collaborationService.getAllDocuments();
    expect(allDocs).toHaveLength(2);
    expect(allDocs.map(d => d.documentId)).toContain(documentId1);
    expect(allDocs.map(d => d.documentId)).toContain(documentId2);
  });

  test('should get document users', async () => {
    const documentId = 'test-workspace:test-file.js';
    await collaborationService.getDocument(documentId, 'test-workspace', 'test-file.js');

    const users = collaborationService.getDocumentUsers(documentId);
    expect(users).toEqual([]);
  });

  test('should return empty array for non-existent document users', () => {
    const users = collaborationService.getDocumentUsers('non-existent');
    expect(users).toEqual([]);
  });
});