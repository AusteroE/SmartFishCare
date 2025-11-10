@echo off
REM Start Fish Detection Server with Model Path Set

echo ========================================
echo Fish Detection Server Startup
echo ========================================
echo.

REM Activate virtual environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Error: Virtual environment not found!
    echo Please run: python -m venv venv
    pause
    exit /b 1
)

REM Set model path (relative to backend directory)
set MODEL_PATH=../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb

echo Model Path: %MODEL_PATH%
echo.

REM Check if model exists
if exist "%MODEL_PATH%" (
    echo ✅ Model file found!
    echo.
) else (
    echo ⚠️  Warning: Model file not found at: %MODEL_PATH%
    echo Please check the path or set MODEL_PATH environment variable.
    echo.
)

REM Start server
echo Starting server...
echo.
python fish_detection_server.py

pause

