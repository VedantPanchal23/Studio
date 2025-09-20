# IDE Backend

Backend server for the browser-based IDE application.

## Project Structure

```
ide-backend/
├── server.js          # Main Express server entry point
├── package.json       # Node.js dependencies and scripts
├── .env               # Environment variables
├── routes/            # API route handlers
├── middleware/        # Custom middleware functions
├── services/          # Business logic services
├── models/            # Database models
└── utils/             # Utility functions and helpers
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

3. Start production server:
   ```bash
   npm start
   ```

## Environment Variables

Copy `.env` and configure the following variables:
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

Additional environment variables will be added as features are implemented.

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api` - API base endpoint (placeholder)

More endpoints will be added as the application develops.