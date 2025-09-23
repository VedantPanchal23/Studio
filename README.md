# Studio - Browser-Based IDE

A modern, collaborative, browser-based Integrated Development Environment (IDE) that allows developers to code, execute, and collaborate in real-time from any device with a web browser.

## 🚀 Features

### Core IDE Features
- **Multi-Language Support**: Write and execute code in Node.js, Python, Java, C++, Go, and Rust
- **Professional Editor**: Monaco Editor (same as VS Code) with syntax highlighting, IntelliSense, and error checking
- **File Management**: Create, edit, and organize files and folders in workspaces
- **Integrated Terminal**: Full terminal emulation with shell access
- **Git Integration**: Version control with Git operations directly in the browser

### Collaboration & Real-Time Features
- **Real-Time Collaboration**: Multiple users can edit the same file simultaneously with live cursors
- **User Presence**: See who's online and where they're working
- **Conflict-Free Editing**: Automatic conflict resolution using CRDTs (Conflict-free Replicated Data Types)

### Security & Execution
- **Secure Code Execution**: Code runs in isolated Docker containers with resource limits
- **Sandbox Environment**: Network isolation and automatic cleanup prevent security risks
- **Resource Management**: Memory and CPU limits prevent abuse

### Cloud Integration
- **Google Drive Sync**: Backup and sync your workspaces to Google Drive
- **Authentication**: Secure login with Firebase Authentication and Google OAuth
- **Cross-Platform**: Works on any device with a modern web browser

## 🏗️ Architecture

### Backend (ide-backend/)
- **Framework**: Node.js with Express.js
- **Database**: MongoDB for data persistence, Redis for sessions and caching
- **Real-Time**: Socket.IO for WebSocket connections
- **Containerization**: Docker for secure code execution
- **Authentication**: Firebase Admin SDK
- **Language Server**: LSP (Language Server Protocol) integration

### Frontend (ide-frontend/)
- **Framework**: React 19 with Vite build tool
- **Editor**: Monaco Editor for professional code editing
- **Terminal**: xterm.js for web-based terminal emulation
- **UI Components**: Radix UI primitives with custom styling
- **State Management**: Zustand for global state
- **Collaboration**: Yjs framework for real-time synchronization

### Production Deployment
- **Container Orchestration**: Docker Compose for multi-service deployment
- **Reverse Proxy**: Nginx for frontend serving and load balancing
- **SSL/TLS**: HTTPS encryption with certificate management
- **Health Monitoring**: Automated health checks and logging

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM), Redis
- **Authentication**: Firebase Admin SDK
- **Real-Time**: Socket.IO
- **Containerization**: Docker + Dockerode
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Winston
- **Testing**: Jest

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Editor**: Monaco Editor
- **Terminal**: xterm.js
- **UI Library**: Radix UI
- **State Management**: Zustand
- **Collaboration**: Yjs, y-monaco
- **Routing**: React Router
- **Styling**: CSS modules, Tailwind CSS
- **Testing**: Vitest, React Testing Library

### DevOps & Deployment
- **Containerization**: Docker, Docker Compose
- **CI/CD**: Automated build and deployment scripts
- **Monitoring**: Health checks, structured logging
- **Security**: SSL/TLS, input validation, rate limiting

## 📋 Prerequisites

Before running Studio, ensure you have the following installed:

- **Docker**: For containerized code execution
- **Node.js**: Version 18 or higher
- **npm** or **yarn**: Package manager
- **Git**: For version control operations

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/VedantPanchal23/Studio.git
cd Studio
```

### 2. Backend Setup
```bash
cd ide-backend

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd ../ide-frontend

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### 4. Database Setup
Ensure MongoDB and Redis are running. For local development, you can use:

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
docker run -d -p 6379:6379 --name redis redis:latest
```

## ⚙️ Environment Configuration

### Backend (.env)
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/studio
REDIS_URL=redis://localhost:6379

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Google Drive API
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Docker
DOCKER_SOCKET_PATH=/var/run/docker.sock
```

### Frontend (.env)
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001

# Authentication
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id

# Development
VITE_DISABLE_AUTH=false
```

## 🏃‍♂️ Usage

### Development Mode
```bash
# Start both frontend and backend
npm run dev  # in ide-frontend/
npm run dev  # in ide-backend/
```

### Production Deployment
```bash
# Build and deploy using Docker Compose
./deploy.sh production
```

### Testing
```bash
# Backend tests
cd ide-backend
npm test

# Frontend tests
cd ide-frontend
npm test
```

## 🔧 Development

### Development No-Auth Mode
For development without authentication:
1. Set `DISABLE_AUTH=true` in `ide-backend/.env`
2. Set `VITE_DISABLE_AUTH=true` in `ide-frontend/.env`
3. The backend will auto-create/use a stub user (`dev@local.test`)
4. The frontend will treat the session as authenticated immediately

**⚠️ WARNING: Never enable this in production. It disables all access controls.**

### Project Structure
```
studio/
├── ide-backend/           # Backend Node.js application
│   ├── server.js         # Main Express server
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   ├── models/           # Database models
│   ├── middleware/       # Custom middleware
│   ├── utils/            # Utility functions
│   ├── docker/           # Dockerfiles for different languages
│   └── tests/            # Backend tests
├── ide-frontend/          # Frontend React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API and WebSocket services
│   │   ├── store/        # State management
│   │   └── utils/        # Utility functions
│   └── public/           # Static assets
├── docker-compose.prod.yml # Production deployment
├── deploy.sh            # Deployment script
└── README.md            # This file
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -am 'Add your feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

### Code Style
- Follow ESLint configuration
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Workspace Endpoints
- `GET /api/workspaces` - List user workspaces
- `POST /api/workspaces` - Create new workspace
- `GET /api/workspaces/:id` - Get workspace details
- `DELETE /api/workspaces/:id` - Delete workspace

### File Management
- `GET /api/files/:workspaceId` - List files in workspace
- `POST /api/files/:workspaceId` - Create/upload file
- `GET /api/files/:workspaceId/:filePath` - Get file content
- `PUT /api/files/:workspaceId/:filePath` - Update file
- `DELETE /api/files/:workspaceId/:filePath` - Delete file

### Code Execution
- `POST /api/execution/containers` - Create execution container
- `POST /api/execution/:containerId/run` - Execute code
- `DELETE /api/execution/:containerId` - Stop container

## 🧪 Testing

### Backend Testing
```bash
cd ide-backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

### Frontend Testing
```bash
cd ide-frontend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

### Integration Testing
```bash
# Run full integration test suite
npm run test:integration
```

## 🔒 Security

Studio implements multiple security measures:

- **Authentication**: Firebase Auth with JWT tokens
- **Authorization**: Role-based access control
- **Input Validation**: All API inputs validated with express-validator
- **Rate Limiting**: API rate limits prevent abuse
- **HTTPS**: SSL/TLS encryption in production
- **Container Security**: Non-root users, resource limits, network isolation
- **Data Sanitization**: MongoDB injection prevention with express-mongo-sanitize

## 📊 Performance

- **Code Execution**: Isolated Docker containers with resource limits
- **Real-Time Sync**: WebSocket connections with efficient binary protocols
- **Caching**: Redis for session storage and frequently accessed data
- **Compression**: Gzip compression for API responses
- **CDN**: Static assets served via CDN in production

## 🚀 Deployment

### Production Requirements
- Docker and Docker Compose
- SSL certificates
- Domain name
- Reverse proxy (Nginx included)

### Deployment Steps
1. Configure production environment files
2. Run `./deploy.sh production`
3. Set up SSL certificates
4. Configure domain DNS
5. Monitor logs and health checks

### Scaling Considerations
- **Horizontal Scaling**: Multiple backend instances behind load balancer
- **Database Sharding**: MongoDB sharding for large datasets
- **Redis Cluster**: Distributed Redis for high availability
- **Container Orchestration**: Kubernetes for large-scale deployments

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Monaco Editor**: The excellent code editor from VS Code
- **Docker**: Containerization platform
- **Yjs**: Real-time collaboration framework
- **Socket.IO**: Real-time bidirectional communication
- **Firebase**: Authentication and hosting services

## 📞 Support

For support, please:
1. Check the [Issues](https://github.com/VedantPanchal23/Studio/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

---

**Built with ❤️ by [Vedant Panchal](https://github.com/VedantPanchal23)**