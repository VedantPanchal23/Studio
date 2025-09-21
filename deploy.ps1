# Production Deployment Script for IDE Studio (PowerShell)
# Usage: .\deploy.ps1 [environment]

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment for environment: $Environment" -ForegroundColor Green

$ComposeFile = "docker-compose.prod.yml"

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Check if docker-compose is available
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed. Please install it and try again." -ForegroundColor Red
    exit 1
}

# Validate environment files
Write-Host "📋 Validating environment configuration..." -ForegroundColor Yellow

if (-not (Test-Path "ide-frontend\.env.production")) {
    Write-Host "❌ Frontend production environment file not found: ide-frontend\.env.production" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "ide-backend\.env.production")) {
    Write-Host "❌ Backend production environment file not found: ide-backend\.env.production" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment files validated" -ForegroundColor Green

# Build and deploy
Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
docker-compose -f $ComposeFile build --no-cache

Write-Host "🏗️ Starting services..." -ForegroundColor Yellow
docker-compose -f $ComposeFile up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
$timeout = 300
$elapsed = 0
$interval = 10

do {
    Start-Sleep $interval
    $elapsed += $interval
    
    $status = docker-compose -f $ComposeFile ps
    if ($status -match "Up \(healthy\)") {
        Write-Host "✅ Services are healthy" -ForegroundColor Green
        break
    }
    
    Write-Host "⏳ Waiting for services to start... ($elapsed/$timeout seconds)" -ForegroundColor Yellow
} while ($elapsed -lt $timeout)

if ($elapsed -ge $timeout) {
    Write-Host "⚠️ Timeout waiting for services to be healthy" -ForegroundColor Yellow
}

# Run health checks
Write-Host "🔍 Running health checks..." -ForegroundColor Yellow

try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 10
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend health check passed" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/health" -UseBasicParsing -TimeoutSec 10
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "✅ Backend health check passed" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Show running services
Write-Host "📊 Running services:" -ForegroundColor Yellow
docker-compose -f $ComposeFile ps

Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: http://localhost" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:3002/api" -ForegroundColor Cyan
Write-Host "📊 Monitoring: http://localhost:3000 (if enabled)" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 To view logs: docker-compose -f $ComposeFile logs -f" -ForegroundColor Yellow
Write-Host "🛑 To stop services: docker-compose -f $ComposeFile down" -ForegroundColor Yellow