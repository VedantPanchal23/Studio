# 🚀 Studio IDE - Complete Localhost Setup Guide

This guide will help you get the Studio IDE running perfectly on your local machine with all features working.

## ✅ Prerequisites

Before starting, ensure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download here](https://git-scm.com/)

## 🎯 Quick Start (Automated)

### Option 1: One-Click Setup (Recommended)

1. **Run the automated setup script:**
   ```bash
   start-dev.bat
   ```

2. **Wait for the setup to complete** (this will):
   - Start MongoDB and Redis containers
   - Install all dependencies
   - Initialize the development database
   - Start both backend and frontend servers
   - Run setup tests

3. **Open your browser** and go to: http://localhost:3000

That's it! You should now have a fully working IDE.

## 🔧 Manual Setup (If needed)

### Step 1: Start Database Services

```bash
# Start MongoDB
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Start Redis
docker run -d --name redis -p 6379:6379 redis:latest
```

### Step 2: Install Dependencies

```bash
# Backend dependencies
cd ide-backend
npm install

# Frontend dependencies
cd ../ide-frontend
npm install
```

### Step 3: Initialize Development Database

```bash
cd ide-backend
npm run init-dev
```

### Step 4: Start Servers

```bash
# Terminal 1: Start Backend
cd ide-backend
npm run dev

# Terminal 2: Start Frontend
cd ide-frontend
npm run dev
```

## 🌐 Access URLs

- **Frontend (Main App)**: http://localhost:3000
- **Backend API**: http://localhost:3002
- **Health Check**: http://localhost:3002/health
- **API Documentation**: http://localhost:3002/api

## 🔐 Development Mode Features

The IDE is configured for easy local development:

- **✅ Authentication Bypassed**: No need to set up Firebase
- **✅ Auto-Login**: Automatically logged in as "Dev User"
- **✅ Sample Workspace**: Pre-created workspace with example files
- **✅ All Features Enabled**: File management, code execution, collaboration

## 🧪 Testing Your Setup

Run the test script to verify everything is working:

```bash
node test-setup.js
```

This will test:
- Backend health
- Authentication service
- Workspace API
- Workspace creation

## 📁 Project Structure

```
Studio/
├── ide-backend/          # Node.js backend server
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── scripts/         # Setup scripts
├── ide-frontend/         # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── stores/      # Zustand state stores
│   │   ├── services/    # API services
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
└── start-dev.bat        # Automated setup script
```

## 🎨 Key Features Available

### 🖥️ Code Editor
- Monaco Editor (same as VS Code)
- Syntax highlighting for multiple languages
- IntelliSense and error checking
- Multiple tabs and file management

### 🏃‍♂️ Code Execution
- Run code in isolated Docker containers
- Support for Node.js, Python, Java, C++, Go, Rust
- Real-time output and error handling

### 👥 Collaboration
- Real-time collaborative editing
- User presence indicators
- Conflict-free editing with Yjs

### 📁 File Management
- Create, edit, delete files and folders
- File tree navigation
- Drag and drop support

### 🔧 Workspace Management
- Create multiple workspaces
- Configure runtime environments
- Share workspaces with collaborators

### 🖥️ Integrated Terminal
- Full terminal emulation
- Multiple terminal sessions
- Shell access for development

## 🐛 Troubleshooting

### Backend won't start
- Check if MongoDB and Redis containers are running: `docker ps`
- Verify port 3002 is not in use: `netstat -an | findstr 3002`
- Check backend logs in the PowerShell window

### Frontend won't start
- Verify port 3000 is not in use: `netstat -an | findstr 3000`
- Clear browser cache and localStorage
- Check frontend logs in the PowerShell window

### Database connection issues
- Restart Docker containers:
  ```bash
  docker restart mongodb redis
  ```
- Re-run database initialization:
  ```bash
  cd ide-backend
  npm run init-dev
  ```

### Authentication issues
- Verify `DISABLE_AUTH=true` in `ide-backend/.env`
- Verify `VITE_DISABLE_AUTH=true` in `ide-frontend/.env`
- Clear browser localStorage and refresh

### Workspace creation fails
- Check backend logs for detailed error messages
- Verify the dev user was created successfully
- Try restarting the backend server

## 🔄 Restarting the Development Environment

To restart everything:

1. **Stop all servers** (Ctrl+C in PowerShell windows)
2. **Run the setup script again:**
   ```bash
   start-dev.bat
   ```

## 📞 Getting Help

If you encounter issues:

1. **Check the logs** in the PowerShell windows
2. **Run the test script** to identify specific problems
3. **Restart the development environment**
4. **Check this troubleshooting guide**

## 🎉 Success!

Once everything is running, you should be able to:

1. ✅ Access the IDE at http://localhost:3000
2. ✅ See the workspace dashboard
3. ✅ Create new workspaces
4. ✅ Edit files with syntax highlighting
5. ✅ Execute code and see output
6. ✅ Use the integrated terminal
7. ✅ Collaborate in real-time (open multiple browser tabs)

Happy coding! 🚀