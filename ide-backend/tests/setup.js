const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Mock Firebase Admin SDK completely for testing
jest.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: jest.fn()
  }),
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    applicationDefault: jest.fn(),
    cert: jest.fn()
  }
}));

// Mock Firebase config module
jest.mock('../config/firebase', () => ({
  verifyIdToken: jest.fn()
}));

const admin = require('firebase-admin');
const firebaseConfig = require('../config/firebase');
const firebaseTestAuth = require('./utils/firebaseTestAuth');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Setup Firebase Admin mock
  admin.auth().verifyIdToken.mockImplementation((token) => {
    return Promise.resolve(firebaseTestAuth.mockVerifyIdToken(token));
  });
  
  // Setup Firebase config mock
  firebaseConfig.verifyIdToken.mockImplementation((token) => {
    return Promise.resolve(firebaseTestAuth.mockVerifyIdToken(token));
  });

  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  await mongoServer.stop();
});

// Suppress console logs during tests unless there's an error
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep error logs for debugging
};