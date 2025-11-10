@echo off
REM Fish Detection Server Startup Script for Windows

echo 🐟 Starting Fish Detection Server...

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Check if model path is set
if "%MODEL_PATH%"=="" (
    echo ⚠️  MODEL_PATH not set. Using default: ./fish_inception_v2_graph/frozen_inference_graph.pb
    echo    To set custom path: set MODEL_PATH=C:\path\to\model.pb
)

REM Start server
echo 🚀 Starting server...
python fish_detection_server.py

pause

