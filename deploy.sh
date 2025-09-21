#!/bin/bash

# Production Deployment Script for IDE Studio
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Validate environment files
echo "📋 Validating environment configuration..."

if [ ! -f "ide-frontend/.env.production" ]; then
    echo "❌ Frontend production environment file not found: ide-frontend/.env.production"
    exit 1
fi

if [ ! -f "ide-backend/.env.production" ]; then
    echo "❌ Backend production environment file not found: ide-backend/.env.production"
    exit 1
fi

# Build and deploy
echo "🔨 Building Docker images..."
docker-compose -f $COMPOSE_FILE build --no-cache

echo "🏗️ Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
timeout 300 bash -c '
    while true; do
        if docker-compose -f docker-compose.prod.yml ps | grep -q "Up (healthy)"; then
            echo "✅ Services are healthy"
            break
        fi
        echo "⏳ Waiting for services to start..."
        sleep 10
    done
'

# Run health checks
echo "🔍 Running health checks..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health || echo "000")
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/health || echo "000")

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed (HTTP $FRONTEND_STATUS)"
fi

if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed (HTTP $BACKEND_STATUS)"
fi

# Show running services
echo "📊 Running services:"
docker-compose -f $COMPOSE_FILE ps

echo "🎉 Deployment completed!"
echo ""
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost:3002/api"
echo "📊 Monitoring: http://localhost:3000 (if enabled)"
echo ""
echo "📝 To view logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "🛑 To stop services: docker-compose -f $COMPOSE_FILE down"