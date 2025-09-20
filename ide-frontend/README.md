# IDE Frontend

Frontend application for the browser-based IDE built with React and Vite.

## Project Structure

```
ide-frontend/
├── src/
│   ├── components/     # React components
│   │   ├── App/        # Main App component
│   │   └── index.js    # Component exports
│   ├── services/       # API and WebSocket services
│   │   ├── api.js      # HTTP API service
│   │   ├── websocket.js # WebSocket service
│   │   └── index.js    # Service exports
│   ├── store/          # State management (Zustand)
│   │   ├── appStore.js # Main application store
│   │   └── index.js    # Store exports
│   ├── utils/          # Utility functions
│   │   ├── constants.js # Application constants
│   │   ├── helpers.js  # Helper functions
│   │   └── index.js    # Utility exports
│   ├── main.jsx        # Application entry point
│   └── index.css       # Global styles
├── public/             # Static assets
├── package.json        # Dependencies and scripts
└── vite.config.js      # Vite configuration
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Preview production build:
   ```bash
   npm run preview
   ```

## Technology Stack

- **React 19** - UI framework
- **Vite** - Build tool and development server
- **ESLint** - Code linting
- Future additions: Monaco Editor, xterm.js, Yjs, TailwindCSS, shadcn/ui, Zustand, Socket.IO

## Development

The application is structured with a clear separation of concerns:
- **Components**: Reusable UI components
- **Services**: API calls and external service integrations
- **Store**: Global state management
- **Utils**: Helper functions and constants
