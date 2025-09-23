@echo off
echo ========================================
echo    Studio IDE Development Setup
echo ========================================
echo.

echo [1/6] Checking Docker containers...
docker ps | findstr "mongodb redis" >nul
if %errorlevel% neq 0 (
    echo Starting MongoDB and Redis containers...
    docker run -d --name mongodb -p 27017:27017 mongo:latest 2>nul
    docker run -d --name redis -p 6379:6379 redis:latest 2>nul
    echo Waiting for containers to start...
    timeout /t 8 /nobreak >nul
) else (
    echo ✅ Docker containers are already running.
)

echo.
echo [2/6] Checking Node.js dependencies...
cd ide-backend
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
)
cd ..

cd ide-frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
)
cd ..

echo.
echo [3/6] Initializing development database...
cd ide-backend
node scripts/init-dev.js
if %errorlevel% neq 0 (
    echo ❌ Database initialization failed!
    pause
    exit /b 1
)

echo.
echo [3.5/6] Fixing workspace and file system issues...
node scripts/fix-workspace.js
if %errorlevel% neq 0 (
    echo ⚠️ Workspace fix had issues, continuing anyway...
)
cd ..

echo.
echo [4/6] Starting Backend Server...
start "Studio IDE - Backend" powershell -NoExit -Command "cd ide-backend; Write-Host '🚀 Backend Server Starting...' -ForegroundColor Green; Write-Host 'Port: 3002' -ForegroundColor Yellow; node server.js"

echo.
echo [5/6] Waiting for backend to start...
timeout /t 8 /nobreak >nul

echo.
echo [6/6] Starting Frontend Server...
start "Studio IDE - Frontend" powershell -NoExit -Command "cd ide-frontend; Write-Host '🎨 Frontend Server Starting...' -ForegroundColor Blue; Write-Host 'Port: 3000' -ForegroundColor Yellow; npm run dev"

echo.
echo ========================================
echo    🎉 Studio IDE is starting up!
echo ========================================
echo.
echo 📍 URLs:
echo   Backend:  http://localhost:3002
echo   Frontend: http://localhost:3000
echo   Health:   http://localhost:3002/health
echo.
echo 🔧 Development Mode Features:
echo   ✅ Authentication bypassed
echo   ✅ Sample workspace created
echo   ✅ Dev user auto-login
echo.
echo 📝 Next Steps:
echo   1. Wait for both servers to fully start
echo   2. Open http://localhost:3000 in your browser
echo   3. You'll be automatically logged in
echo   4. Create or select a workspace to start coding
echo.
echo Press any key to run setup test...
pause >nul

echo.
echo Running comprehensive fixes...
node fix-all-issues.js

echo.
echo Testing terminal connection...
node test-terminal.js

echo.
echo ========================================
echo    🎉 Studio IDE Setup Complete!
echo ========================================
echo.
echo 🌐 Your IDE is now running at:
echo   http://localhost:3000
echo.
echo 🔧 Features Available:
echo   ✅ Authentication bypassed (dev mode)
echo   ✅ Workspace creation and management
echo   ✅ File editing with Monaco Editor
echo   ✅ Code execution in Docker containers
echo   ✅ Real-time collaboration
echo   ✅ Integrated terminal
echo   ✅ Git integration
echo.
echo 💡 Tips:
echo   - Create a new workspace to start coding
echo   - Use the file explorer to manage files
echo   - Run code using the execute button
echo   - Open multiple browser tabs for collaboration
echo.
echo Press any key to exit...
pause >nul