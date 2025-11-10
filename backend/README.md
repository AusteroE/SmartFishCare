# Fish Detection Python Server

Optimized Python server for TensorFlow fish detection model from [kwea123/fish_detection](https://github.com/kwea123/fish_detection).

## Features

✅ **Optimized for Web**: Image resizing, caching, performance improvements  
✅ **Easy Setup**: Simple installation and configuration  
✅ **Health Checks**: Monitor server and model status  
✅ **Error Handling**: Graceful error handling and logging  
✅ **CORS Enabled**: Works with Next.js frontend  

## Quick Start

### 1. Install Dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Install dependencies (TensorFlow 2.x with compatibility mode)
pip install -r requirements.txt
```

**Note**: The server now uses TensorFlow 2.x (not 1.15.0) which works with modern Python versions. The code automatically uses compatibility mode to run TensorFlow 1.x models.

### 2. Download Model

```bash
# Clone the repository
git clone https://github.com/kwea123/fish_detection.git ../fish_detection_repo

# The model should be in:
# ../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb
```

### 3. Configure Model Path

Set the model path (default: `./fish_inception_v2_graph/frozen_inference_graph.pb`):

**Option A: Environment Variable**
```bash
export MODEL_PATH=../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb
```

**Option B: Edit `fish_detection_server.py`**
```python
MODEL_PATH = './path/to/frozen_inference_graph.pb'
```

### 4. Start Server

```bash
python fish_detection_server.py
```

Server will start on `http://localhost:5000`

## Configuration

Environment variables:

- `MODEL_PATH`: Path to frozen inference graph (default: `./fish_inception_v2_graph/frozen_inference_graph.pb`)
- `CONFIDENCE_THRESHOLD`: Detection confidence threshold (default: `0.3`)
- `MAX_IMAGE_SIZE`: Maximum image dimension for optimization (default: `1280`)
- `PORT`: Server port (default: `5000`)

## API Endpoints

### POST `/detect`

Detect fish in an image.

**Request:**
```json
{
  "imageData": "base64_encoded_image_string"
}
```

**Response:**
```json
{
  "success": true,
  "detections": [
    {
      "bbox": [y1, x1, y2, x2],
      "score": 0.95,
      "class": 1
    }
  ],
  "processing_time_ms": 45.2,
  "image_size": {"width": 640, "height": 480}
}
```

### GET `/health`

Check server and model status.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_path": "./fish_inception_v2_graph/frozen_inference_graph.pb",
  "model_exists": true
}
```

### GET `/model/info`

Get model information and configuration.

## Optimization Features

1. **Image Resizing**: Large images are automatically resized to improve performance
2. **Model Warming**: Model is warmed up on startup for faster first inference
3. **GPU Optimization**: GPU memory growth enabled for better resource usage
4. **Threading**: Flask runs in threaded mode for concurrent requests
5. **Caching**: Model is loaded once and reused for all requests

## Troubleshooting

### Model Not Found

```
Error: Model file not found
```

**Solution**: Check `MODEL_PATH` and ensure the `.pb` file exists.

### TensorFlow Import Error

```
ImportError: No module named 'tensorflow'
```

**Solution**: 
```bash
pip install tensorflow==1.15.0
```

### Port Already in Use

```
Address already in use
```

**Solution**: Change port:
```bash
export PORT=5001
python fish_detection_server.py
```

### Model Loading Fails

Check:
1. Model file exists and is readable
2. TensorFlow version is 1.15.0
3. Model format is correct (frozen inference graph)

## Performance

- **First Request**: ~500-1000ms (model warmup)
- **Subsequent Requests**: ~40-100ms per image
- **Optimized**: Images >1280px are automatically resized
- **Concurrent**: Handles multiple requests with threading

## Integration with Next.js

The Next.js app automatically calls this server when available. See:
- `src/app/api/fish-detection/detect/route.ts` - API endpoint
- `src/components/FishDetectionModal.tsx` - Client integration

## Development

### Run with Debug

```bash
export FLASK_DEBUG=1
python fish_detection_server.py
```

### Test Endpoint

```bash
# Health check
curl http://localhost:5000/health

# Model info
curl http://localhost:5000/model/info
```

## Production Deployment

For production:

1. Use a production WSGI server (Gunicorn, uWSGI)
2. Set up process management (systemd, supervisor)
3. Configure reverse proxy (nginx)
4. Enable HTTPS
5. Set appropriate resource limits

Example with Gunicorn:
```bash
pip install gunicorn
gunicorn -w 2 -b 0.0.0.0:5000 fish_detection_server:app
```

