#!/bin/bash
# Start Fish Detection Server with Model Path Set

echo "========================================"
echo "Fish Detection Server Startup"
echo "========================================"
echo ""

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "Error: Virtual environment not found!"
    echo "Please run: python -m venv venv"
    exit 1
fi

# Set model path (relative to backend directory)
export MODEL_PATH=../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb

echo "Model Path: $MODEL_PATH"
echo ""

# Check if model exists
if [ -f "$MODEL_PATH" ]; then
    echo "✅ Model file found!"
    echo ""
else
    echo "⚠️  Warning: Model file not found at: $MODEL_PATH"
    echo "Please check the path or set MODEL_PATH environment variable."
    echo ""
fi

# Start server
echo "Starting server..."
echo ""
python fish_detection_server.py

