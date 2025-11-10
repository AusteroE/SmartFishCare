# Quick Start Guide

## ✅ Setup Complete!

The model has been downloaded and the server is configured to automatically find it.

## Start the Server

### Step 1: Activate Virtual Environment

```bash
cd backend
venv\Scripts\activate
```

### Step 2: Verify Setup (Optional)

```bash
python verify_setup.py
```

This will check:
- ✅ Python version
- ✅ TensorFlow installation
- ✅ Model file location
- ✅ All dependencies

### Step 3: Start Server

```bash
python fish_detection_server.py
```

The server will:
1. Automatically find the model at: `../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb`
2. Load the TensorFlow model
3. Warm up the model
4. Start on `http://localhost:5000`

## Expected Output

```
==================================================
Fish Detection Server Starting...
Python version: 3.13.5
TensorFlow version: 2.20.0
Model path: ../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb
Model exists: True
Confidence threshold: 0.3
Max image size: 1280
Port: 5000
==================================================
Loading TensorFlow model...
Loading model from: ../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb
Warming up model...
Model warmed up successfully
✅ Model loaded successfully!
==================================================
🚀 Server starting on http://0.0.0.0:5000
✅ Ready to accept requests!
==================================================
```

## Verify Server is Running

### Option 1: Health Check

```bash
curl http://localhost:5000/health
```

### Option 2: Browser

Open: http://localhost:5000/health

Expected response:
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_path": "../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb",
  "model_exists": true
}
```

## Test in Web App

1. Start Next.js (in a new terminal):
   ```bash
   npm run dev
   ```

2. Open browser: http://localhost:3000

3. Open Fish Detection modal

4. Check browser console for:
   ```
   ✅ Python TensorFlow server available and model loaded!
   ```

5. Start detection - it will use the TensorFlow model!

## Troubleshooting

### Model Not Found

If you see "Model file not found":

1. Check the model exists:
   ```bash
   dir ..\fish_detection_repo\fish_inception_v2_graph\frozen_inference_graph.pb
   ```

2. If not found, the repository might not be cloned. Clone it:
   ```bash
   cd ..
   git clone https://github.com/kwea123/fish_detection.git fish_detection_repo
   ```

### TensorFlow Not Found

If you see "TensorFlow not installed":

1. Make sure virtual environment is activated:
   ```bash
   venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Port Already in Use

If port 5000 is already in use:

1. Change port:
   ```bash
   set PORT=5001
   python fish_detection_server.py
   ```

2. Or kill the process using port 5000

## What's Configured

✅ **Model Repository**: Cloned to `fish_detection_repo/`  
✅ **Model File**: `fish_inception_v2_graph/frozen_inference_graph.pb`  
✅ **Auto-Detection**: Server automatically finds the model  
✅ **TensorFlow 2.x**: Using compatibility mode  
✅ **Optimizations**: Image resizing, GPU support, threading  

## Next Steps

1. ✅ Model is downloaded
2. ✅ Server is configured
3. ⏭️ Start server: `python fish_detection_server.py`
4. ⏭️ Test in web app
5. ⏭️ Enjoy accurate fish detection!

---

**🎉 Everything is ready! Just start the server and test it!**

