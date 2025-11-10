#!/bin/bash

# Fish Detection Server Startup Script

echo "🐟 Starting Fish Detection Server..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if model path is set
if [ -z "$MODEL_PATH" ]; then
    echo "⚠️  MODEL_PATH not set. Using default: ./fish_inception_v2_graph/frozen_inference_graph.pb"
    echo "   To set custom path: export MODEL_PATH=/path/to/model.pb"
fi

# Start server
echo "🚀 Starting server..."
python fish_detection_server.py

