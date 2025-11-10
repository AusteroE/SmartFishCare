# 🚀 Python Server Quick Start

Get the TensorFlow fish detection model working in 5 minutes!

## Step 1: Install Python Dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

## Step 2: Download Model

```bash
# Clone the repository
git clone https://github.com/kwea123/fish_detection.git ../fish_detection_repo

# Model location:
# ../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb
```

## Step 3: Set Model Path

**Option A: Environment Variable (Recommended)**
```bash
# Windows
set MODEL_PATH=../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb

# Linux/Mac
export MODEL_PATH=../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb
```

**Option B: Edit `backend/fish_detection_server.py`**
```python
MODEL_PATH = '../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb'
```

## Step 4: Start Server

**Easy Way:**
```bash
npm run python:server
```

**Or Direct:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python fish_detection_server.py
```

## Step 5: Verify

Open browser console and check:
- ✅ `Python TensorFlow server available and model loaded!` = Working!

Or test directly:
```bash
curl http://localhost:5000/health
```

## ✅ Done!

The web app will automatically use the Python server when available. No other configuration needed!

## 🎯 Optimization Features

The server is already optimized for web:
- ✅ **Image Resizing**: Large images auto-resized for speed
- ✅ **Model Warming**: Pre-loaded for fast first request
- ✅ **GPU Support**: Automatic GPU optimization
- ✅ **Timeout Handling**: 10-second timeout for web requests
- ✅ **Error Handling**: Graceful fallback to custom detection

## 📝 Next Steps

1. Start Next.js: `npm run dev`
2. Start Python server: `npm run python:server` (in another terminal)
3. Open fish detection modal
4. It works automatically! 🎉

## 🔧 Troubleshooting

**Model not found?**
- Check `MODEL_PATH` is set correctly
- Verify file exists: `ls $MODEL_PATH` (or `dir %MODEL_PATH%` on Windows)

**Port in use?**
- Change port: `set PORT=5001` then restart

**TensorFlow error?**
- Make sure TensorFlow 1.15.0 is installed: `pip install tensorflow==1.15.0`

See `docs/PYTHON_SERVER_SETUP.md` for detailed troubleshooting.

