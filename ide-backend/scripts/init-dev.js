const mongoose = require('mongoose');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
require('dotenv').config();

async function initializeDevEnvironment() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ide-backend');
    console.log('Connected to MongoDB successfully');

    // Create dev user if it doesn't exist
    let devUser = await User.findOne({ email: 'dev@localhost.com' });
    if (!devUser) {
      devUser = await User.create({
        firebaseUid: 'dev-firebase-uid',
        email: 'dev@localhost.com',
        name: 'Dev User',
        isVerified: true,
        lastLogin: Date.now(),
        preferences: {
          theme: 'dark',
          fontSize: 14,
          keyBindings: 'vscode',
          autoSave: true,
          tabSize: 2
        }
      });
      console.log('Created dev user:', devUser._id);
    } else {
      console.log('Dev user already exists:', devUser._id);
    }

    // Create a sample workspace if none exist
    const workspaceCount = await Workspace.countDocuments({ owner: devUser._id });
    if (workspaceCount === 0) {
      const sampleWorkspace = await Workspace.create({
        name: 'My First Workspace',
        description: 'A sample workspace to get you started',
        owner: devUser._id,
        isPublic: false,
        settings: {
          runtime: 'node',
          version: 'latest',
          dependencies: [],
          environment: new Map(),
          buildCommand: '',
          runCommand: 'node index.js'
        },
        files: [
          {
            path: 'index.js',
            content: `console.log('Hello, World!');
console.log('Welcome to your IDE!');

// This is a sample JavaScript file
// You can edit this code and run it

function greet(name) {
  return \`Hello, \${name}! Welcome to the browser-based IDE.\`;
}

console.log(greet('Developer'));`,
            language: 'javascript',
            size: 0,
            modifiedBy: devUser._id
          },
          {
            path: 'README.md',
            content: `# My First Workspace

Welcome to your browser-based IDE! This is a sample workspace to help you get started.

## Features

- **Code Editor**: Monaco Editor (same as VS Code)
- **File Management**: Create, edit, and organize files
- **Code Execution**: Run your code in isolated containers
- **Collaboration**: Real-time collaborative editing
- **Git Integration**: Version control support
- **Multiple Languages**: Support for Node.js, Python, Java, C++, Go, Rust, and more

## Getting Started

1. Edit the \`index.js\` file
2. Click the "Run" button to execute your code
3. Create new files and folders as needed
4. Invite collaborators to work together

Happy coding! 🚀`,
            language: 'markdown',
            size: 0,
            modifiedBy: devUser._id
          }
        ]
      });

      // Update file sizes
      sampleWorkspace.files.forEach(file => {
        file.size = Buffer.byteLength(file.content, 'utf8');
      });
      await sampleWorkspace.save();

      console.log('Created sample workspace:', sampleWorkspace._id);
    } else {
      console.log(`Dev user already has ${workspaceCount} workspace(s)`);
    }

    console.log('Development environment initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize development environment:', error);
    process.exit(1);
  }
}

initializeDevEnvironment();