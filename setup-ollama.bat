@echo off
REM Smart Inventory Management - Local LLM Setup Script
REM This script helps set up Ollama and models for Windows

echo.
echo ============================================
echo Local LLM Setup Assistant
echo ============================================
echo.

REM Check if Ollama is installed
echo Checking for Ollama installation...
ollama --version >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] Ollama is not installed or not in PATH
    echo.
    echo Please download and install Ollama from: https://ollama.ai
    echo After installation, run this script again.
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Ollama found
    ollama --version
)

echo.
echo ============================================
echo Available Models
echo ============================================
echo.
echo 1. mistral (4.1 GB) - RECOMMENDED - Best balance
echo 2. neural-chat (4.1 GB) - Fastest, very good
echo 3. orca-mini (1.7 GB) - For limited hardware
echo 4. indic-trans (2.5 GB) - Best for Hindi
echo 5. Skip - Already have a model
echo.

set /p model_choice="Select model (1-5): "

if "%model_choice%"=="1" (
    set MODEL=mistral
) else if "%model_choice%"=="2" (
    set MODEL=neural-chat
) else if "%model_choice%"=="3" (
    set MODEL=orca-mini
) else if "%model_choice%"=="4" (
    set MODEL=indic-trans
) else if "%model_choice%"=="5" (
    echo Skipping model download
    goto check_backend
) else (
    echo Invalid choice
    goto model_select
)

echo.
echo Pulling %MODEL% model...
echo This may take several minutes depending on your internet connection
echo.

ollama pull %MODEL%

if errorlevel 1 (
    echo [ERROR] Failed to pull model
    pause
    exit /b 1
) else (
    echo [OK] Model pulled successfully
)

:check_backend
echo.
echo ============================================
echo Backend Configuration
echo ============================================
echo.

REM Check for backend .env file
if not exist "backend\.env" (
    echo Creating backend\.env file...
    (
        echo MONGO_URI=mongodb://localhost:27017/inventory_management
        echo JWT_SECRET=your_super_secret_jwt_key_change_in_production
        echo FRONTEND_URL=http://localhost:5173
        echo GOOGLE_CLIENT_ID=your_google_client_id
        echo PAYPAL_CLIENT_ID=your_paypal_client_id
        echo PAYPAL_CLIENT_SECRET=your_paypal_secret
        echo PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
        echo OLLAMA_BASE_URL=http://localhost:11434
        echo OLLAMA_MODEL=%MODEL%
        echo LOCAL_LLM_ENABLED=true
        echo HINDI_SUPPORT=true
    ) > backend\.env
    echo [OK] Created backend\.env with LLM settings
) else (
    echo [OK] backend\.env already exists
    echo Adding/updating LLM settings...
    
    REM This is a simple update - for production use better config management
    echo.
    echo Please manually add these lines to backend\.env if they don't exist:
    echo   OLLAMA_BASE_URL=http://localhost:11434
    echo   OLLAMA_MODEL=%MODEL%
    echo   LOCAL_LLM_ENABLED=true
    echo   HINDI_SUPPORT=true
)

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo Next steps:
echo.
echo 1. START OLLAMA SERVICE (Run in Terminal 1):
echo    ollama serve
echo.
echo 2. START BACKEND (Run in Terminal 2):
echo    cd backend
echo    npm start
echo.
echo 3. START FRONTEND (Run in Terminal 3):
echo    cd frontend
echo    npm run dev
echo.
echo 4. OPEN BROWSER:
echo    http://localhost:5173
echo    Look for "🤖 AI Insights" in the sidebar
echo.
echo 5. VERIFY LLM:
echo    Check that Ollama shows as "Connected"
echo    Then click a button to generate insights
echo.
echo TROUBLESHOOTING:
echo - If "Ollama not running": Make sure Terminal 1 is running "ollama serve"
echo - If slow: Use smaller model like orca-mini
echo - If Hindi text broken: Ensure browser is using UTF-8 encoding
echo.

pause
