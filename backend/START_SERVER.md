# Starting the Fish Detection Server

## Quick Start

### Step 1: Activate Virtual Environment

```bash
cd backend

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### Step 2: Set Model Path

```bash
# Windows
set MODEL_PATH=../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb

# Linux/Mac
export MODEL_PATH=../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb
```

### Step 3: Start Server

```bash
python fish_detection_server.py
```

## Using npm Script

```bash
# From project root
npm run python:server
```

## Expected Output

```
==================================================
Fish Detection Server Starting...
Python version: 3.13.5
TensorFlow version: 2.20.0
Model path: ./fish_inception_v2_graph/frozen_inference_graph.pb
Model exists: True
Confidence threshold: 0.3
Max image size: 1280
Port: 5000
==================================================
Loading TensorFlow model...
Loading model from: ./fish_inception_v2_graph/frozen_inference_graph.pb
Warming up model...
Model warmed up successfully
✅ Model loaded successfully!
==================================================
🚀 Server starting on http://0.0.0.0:5000
✅ Ready to accept requests!
==================================================
Endpoints:
  - POST http://localhost:5000/detect
  - GET  http://localhost:5000/health
  - GET  http://localhost:5000/model/info
==================================================
 * Running on http://0.0.0.0:5000
```

## Verify Server is Running

### Option 1: Health Check

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_path": "...",
  "model_exists": true
}
```

### Option 2: Browser

Open: http://localhost:5000/health

### Option 3: Check Web App

1. Start Next.js: `npm run dev`
2. Open fish detection modal
3. Check browser console for: `✅ Python TensorFlow server available and model loaded!`

## Troubleshooting

### Model Not Found

**Error**: `Model file not found`

**Solution**:
1. Check `MODEL_PATH` environment variable
2. Verify model file exists
3. Use absolute path if relative path doesn't work

### Port Already in Use

**Error**: `Address already in use`

**Solution**:
```bash
# Change port
set PORT=5001
python fish_detection_server.py
```

### Server Starts But Model Not Loading

**Check**:
1. Model file exists and is readable
2. TensorFlow is working: `python test_tensorflow.py`
3. Check server logs for error messages

## Next Steps

1. ✅ Server is running
2. ✅ Model is loaded
3. ✅ Start Next.js app: `npm run dev`
4. ✅ Test fish detection in web app

## Performance

- **Startup**: ~5-10 seconds (model loading)
- **First Request**: ~500ms (warmup)
- **Subsequent**: ~40-100ms per image
- **Optimized**: Auto-resizes large images

## Stopping the Server

Press `Ctrl+C` to stop the server gracefully.

