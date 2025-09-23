// Export all services from a single entry point
const UserService = require('./UserService');
const WorkspaceService = require('./WorkspaceService');
const ExecutionJobService = require('./ExecutionJobService');
const lspService = require('./lspService');
const terminalService = require('./terminal');
const dockerService = require('./dockerService');
const webSocketService = require('./websocket');
const googleDriveService = require('./googleDriveService');
const collaborationService = require('./collaborationService');

// Create service instances
const userService = new UserService();
const workspaceService = new WorkspaceService();
const executionJobService = new ExecutionJobService();

module.exports = {
  UserService,
  WorkspaceService,
  ExecutionJobService,
  userService,
  workspaceService,
  executionJobService,
  lspService,
  terminalService,
  dockerService,
  webSocketService,
  googleDriveService,
  collaborationService
};