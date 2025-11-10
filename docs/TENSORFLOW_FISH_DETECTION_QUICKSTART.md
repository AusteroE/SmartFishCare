# Quick Start: TensorFlow Fish Detection Integration

This is a quick guide to get the TensorFlow fish detection model from [kwea123/fish_detection](https://github.com/kwea123/fish_detection) working with this project.

## Current Status

✅ **API endpoint created**: `/api/fish-detection/detect`  
✅ **Client integration ready**: `FishDetectionModal.tsx` can call the API  
✅ **Fallback working**: Custom detection is active and works well  
⏳ **Model setup needed**: Download and configure the TensorFlow model

## Quick Setup (Python Backend - Recommended)

### Step 1: Download the Model

```bash
# Clone the repository
git clone https://github.com/kwea123/fish_detection.git
cd fish_detection

# The model files are in the repository
# Look for: fish_inception_v2_graph/frozen_inference_graph.pb
```

### Step 2: Set Up Python Backend

```bash
# Create backend directory in your project root
mkdir backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install tensorflow==1.15.0 flask flask-cors pillow numpy
```

### Step 3: Create Python Server

Create `backend/fish_detection_server.py`:

```python
import tensorflow as tf
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import base64
import os

app = Flask(__name__)
CORS(app)

# Model path - adjust to your model location
MODEL_PATH = './fish_inception_v2_graph/frozen_inference_graph.pb'

# Load the TensorFlow model
detection_graph = tf.Graph()
with detection_graph.as_default():
    od_graph_def = tf.GraphDef()
    with tf.gfile.GFile(MODEL_PATH, 'rb') as fid:
        serialized_graph = fid.read()
        od_graph_def.ParseFromString(serialized_graph)
        tf.import_graph_def(od_graph_def, name='')

sess = tf.Session(graph=detection_graph)

@app.route('/detect', methods=['POST'])
def detect():
    try:
        data = request.json
        image_data = data.get('imageData')  # Base64 encoded image
        
        if not image_data:
            return jsonify({'success': False, 'error': 'No image data provided'}), 400
        
        # Decode image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        image_np = np.array(image)
        
        # Expand dimensions since the model expects 4D: [1, None, None, 3]
        image_np_expanded = np.expand_dims(image_np, axis=0)
        
        # Get tensors
        image_tensor = detection_graph.get_tensor_by_name('image_tensor:0')
        boxes = detection_graph.get_tensor_by_name('detection_boxes:0')
        scores = detection_graph.get_tensor_by_name('detection_scores:0')
        classes = detection_graph.get_tensor_by_name('detection_classes:0')
        num_detections = detection_graph.get_tensor_by_name('num_detections:0')
        
        # Run inference
        (boxes, scores, classes, num_detections) = sess.run(
            [boxes, scores, classes, num_detections],
            feed_dict={image_tensor: image_np_expanded}
        )
        
        # Process results
        detections = []
        height, width = image_np.shape[:2]
        
        for i in range(int(num_detections[0])):
            if scores[0][i] > 0.3:  # Confidence threshold
                # Box format: [y1, x1, y2, x2] (normalized 0-1)
                y1, x1, y2, x2 = boxes[0][i]
                detections.append({
                    'bbox': [float(y1), float(x1), float(y2), float(x2)],
                    'score': float(scores[0][i]),
                    'class': int(classes[0][i])
                })
        
        return jsonify({
            'success': True,
            'detections': detections
        })
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': True})

if __name__ == '__main__':
    print(f'Starting Fish Detection Server...')
    print(f'Model path: {MODEL_PATH}')
    print(f'Model exists: {os.path.exists(MODEL_PATH)}')
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### Step 4: Update Next.js API

Update `src/app/api/fish-detection/detect/route.ts` to call the Python backend:

```typescript
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5000';

// In the POST function:
const response = await fetch(`${PYTHON_BACKEND_URL}/detect`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageData: body.imageData,
  }),
});

if (!response.ok) {
  throw new Error(`Python backend error: ${response.status}`);
}

const result = await response.json();
return NextResponse.json(result);
```

### Step 5: Start the Python Server

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python fish_detection_server.py
```

### Step 6: Update Environment Variables

Add to your `.env.local`:

```env
PYTHON_BACKEND_URL=http://localhost:5000
```

### Step 7: Test

1. Start the Next.js app: `npm run dev`
2. Start the Python server: `python backend/fish_detection_server.py`
3. Open the fish detection modal in the app
4. The app will automatically use the TensorFlow API if available

## Verifying It Works

1. Check Python server logs - should show model loading
2. Check browser console - should show "TensorFlow fish detection API available"
3. Test detection - should see detections from the TensorFlow model

## Troubleshooting

### Model not found
- Check the model path in `fish_detection_server.py`
- Ensure the `.pb` file exists

### TensorFlow import errors
- Make sure you're using TensorFlow 1.15.0 (the model is TF 1.x)
- Check virtual environment is activated

### CORS errors
- Ensure `flask-cors` is installed
- Check the CORS configuration in the Python server

### API not responding
- Check Python server is running on port 5000
- Check `PYTHON_BACKEND_URL` environment variable
- Check network connectivity

## Next Steps

1. **Optimize performance**: Add model caching, batch processing
2. **Improve accuracy**: Fine-tune confidence thresholds
3. **Add monitoring**: Log detection rates, performance metrics
4. **Deploy**: Set up production deployment for Python backend

## Fallback

If the TensorFlow model is not available, the app automatically falls back to custom edge-based detection, which works well for real-time fish detection.

## References

- [kwea123/fish_detection Repository](https://github.com/kwea123/fish_detection)
- [TensorFlow Object Detection API](https://github.com/tensorflow/models/tree/master/research/object_detection)
- [Flask Documentation](https://flask.palletsprojects.com/)

