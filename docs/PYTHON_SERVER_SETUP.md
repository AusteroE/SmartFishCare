# Python Fish Detection Server Setup

Complete guide for setting up the optimized Python server for TensorFlow fish detection.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Download Model

```bash
# Clone the repository
git clone https://github.com/kwea123/fish_detection.git ../fish_detection_repo

# Model will be in:
# ../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb
```

### 3. Set Model Path

**Option A: Environment Variable (Recommended)**
```bash
export MODEL_PATH=../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb
```

**Option B: Edit `backend/fish_detection_server.py`**
```python
MODEL_PATH = '../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb'
```

### 4. Start Server

**Option A: Using npm script**
```bash
npm run python:server
```

**Option B: Direct Python**
```bash
cd backend
source venv/bin/activate
python fish_detection_server.py
```

**Option C: Using startup script**
```bash
# Linux/Mac
cd backend
chmod +x start_server.sh
./start_server.sh

# Windows
cd backend
start_server.bat
```

## 📋 Configuration

### Environment Variables

Create `.env` file in `backend/` or set environment variables:

```bash
MODEL_PATH=./fish_inception_v2_graph/frozen_inference_graph.pb
CONFIDENCE_THRESHOLD=0.3
MAX_IMAGE_SIZE=1280
PORT=5000
```

### Next.js Integration

Add to your `.env.local` (project root):

```bash
PYTHON_BACKEND_URL=http://localhost:5000
```

## ✅ Verification

### 1. Check Server Health

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

### 2. Check Model Info

```bash
curl http://localhost:5000/model/info
```

### 3. Test Detection

```bash
# Convert image to base64 and test
curl -X POST http://localhost:5000/detect \
  -H "Content-Type: application/json" \
  -d '{"imageData": "base64_encoded_image_here"}'
```

## 🎯 Optimization Features

The server includes several optimizations for web use:

1. **Image Resizing**: Automatically resizes large images (>1280px) for faster processing
2. **Model Warming**: Pre-loads and warms up model on startup
3. **GPU Optimization**: Efficient GPU memory usage
4. **Threading**: Handles concurrent requests
5. **Caching**: Model loaded once, reused for all requests
6. **Timeout Handling**: 10-second timeout for web requests

## 📊 Performance

- **First Request**: ~500-1000ms (includes model warmup)
- **Subsequent Requests**: ~40-100ms per image
- **Large Images**: Automatically optimized (resized if >1280px)
- **Concurrent**: Handles multiple requests simultaneously

## 🔧 Troubleshooting

### Model Not Found

**Error**: `Model file not found`

**Solution**:
1. Check `MODEL_PATH` environment variable
2. Verify model file exists: `ls -la $MODEL_PATH`
3. Use absolute path if relative path doesn't work

### TensorFlow Import Error

**Error**: `ImportError: No module named 'tensorflow'`

**Solution**:
```bash
cd backend
source venv/bin/activate
pip install tensorflow==1.15.0
```

### Port Already in Use

**Error**: `Address already in use`

**Solution**:
```bash
# Change port
export PORT=5001
python fish_detection_server.py
```

Or kill the process using port 5000:
```bash
# Linux/Mac
lsof -ti:5000 | xargs kill

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Model Loading Fails

**Check**:
1. Model file exists and is readable
2. TensorFlow version is 1.15.0 (not 2.x)
3. Model format is correct (frozen inference graph .pb)
4. Sufficient memory available

**Debug**:
```bash
# Check TensorFlow version
python -c "import tensorflow as tf; print(tf.__version__)"

# Should output: 1.15.0
```

## 🚀 Production Deployment

### Using Gunicorn (Recommended)

```bash
pip install gunicorn
gunicorn -w 2 -b 0.0.0.0:5000 --timeout 120 fish_detection_server:app
```

### Using systemd (Linux)

Create `/etc/systemd/system/fish-detection.service`:

```ini
[Unit]
Description=Fish Detection Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/backend
Environment="MODEL_PATH=/path/to/model.pb"
ExecStart=/path/to/backend/venv/bin/python fish_detection_server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable fish-detection
sudo systemctl start fish-detection
```

### Using Docker

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.7

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY fish_detection_server.py .

ENV PORT=5000
ENV MODEL_PATH=/app/model/frozen_inference_graph.pb

EXPOSE 5000

CMD ["python", "fish_detection_server.py"]
```

Build and run:
```bash
docker build -t fish-detection-server ./backend
docker run -p 5000:5000 -v /path/to/model:/app/model fish-detection-server
```

## 📝 API Documentation

### POST `/detect`

Detect fish in an image.

**Request Body**:
```json
{
  "imageData": "base64_encoded_image_string"
}
```

**Response**:
```json
{
  "success": true,
  "detections": [
    {
      "bbox": [0.1, 0.2, 0.5, 0.6],  // [y1, x1, y2, x2] normalized
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

**Response**:
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_path": "./fish_inception_v2_graph/frozen_inference_graph.pb",
  "model_exists": true
}
```

### GET `/model/info`

Get model configuration.

**Response**:
```json
{
  "model_loaded": true,
  "model_path": "./fish_inception_v2_graph/frozen_inference_graph.pb",
  "model_exists": true,
  "confidence_threshold": 0.3,
  "max_image_size": 1280
}
```

## 🔗 Integration with Next.js

The Next.js app automatically uses the Python server when available:

1. **API Endpoint**: `src/app/api/fish-detection/detect/route.ts` calls Python server
2. **Client**: `FishDetectionModal.tsx` uses the API endpoint
3. **Fallback**: Uses custom detection if Python server unavailable

## 📈 Monitoring

### Logs

Server logs include:
- Model loading status
- Request processing times
- Error messages
- Detection counts

### Performance Metrics

Monitor:
- Response times (check `processing_time_ms` in response)
- Request rate
- Error rate
- Memory usage

## 🎉 Success Indicators

✅ Server starts without errors  
✅ `/health` returns `model_loaded: true`  
✅ `/detect` returns detections  
✅ Next.js app shows "TensorFlow API available" in console  
✅ Fish detection works in the web app  

## 📚 Next Steps

1. ✅ Set up Python server (this guide)
2. ✅ Test with health endpoint
3. ✅ Verify Next.js integration
4. ✅ Optimize for your use case (adjust thresholds, image sizes)
5. ✅ Deploy to production (if needed)

## 💡 Tips

- **Development**: Use `npm run python:server` for easy startup
- **Testing**: Use `/health` endpoint to verify setup
- **Optimization**: Adjust `MAX_IMAGE_SIZE` based on your needs
- **Performance**: Use GPU if available (automatic with TensorFlow)
- **Debugging**: Check server logs for detailed error messages

