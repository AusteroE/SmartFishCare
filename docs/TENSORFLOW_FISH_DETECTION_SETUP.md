# TensorFlow Fish Detection Model Setup Guide

This guide explains how to integrate the TensorFlow fish detection model from [kwea123/fish_detection](https://github.com/kwea123/fish_detection) into this project.

## Overview

The model from the repository:
- **Architecture**: Faster R-CNN Inception V2
- **Training**: Open Images Dataset (24,403 fish bounding boxes)
- **Format**: TensorFlow 1.x protobuf (`.pb`)
- **Performance**: 40-50ms per image on GPU (1080Ti)
- **Accuracy**: Trained specifically for fish detection

## Integration Options

### Option 1: Server-Side API with TensorFlow.js Node.js (Recommended for Next.js)

**Advantages:**
- Runs server-side (no browser limitations)
- Can use larger models
- Better performance with Node.js TensorFlow backend

**Steps:**

1. **Convert the model to TensorFlow.js format:**
   ```bash
   # Install TensorFlow.js converter
   pip install tensorflowjs
   
   # Download the model from the repository
   # The model should be in .pb format (frozen inference graph)
   
   # Convert to TensorFlow.js
   tensorflowjs_converter \
     --input_format=tf_frozen_model \
     --output_format=tfjs_graph_model \
     --output_node_names='detection_boxes,detection_classes,detection_scores,num_detections' \
     --saved_model_tags=serve \
     ./fish_inception_v2_graph/frozen_inference_graph.pb \
     ./public/models/fish-detection-tfjs
   ```

2. **Install TensorFlow.js Node.js backend:**
   ```bash
   npm install @tensorflow/tfjs-node
   ```

3. **Update the API endpoint** (`src/app/api/fish-detection/detect/route.ts`):
   ```typescript
   import * as tf from '@tensorflow/tfjs-node';
   import * as path from 'path';
   import * as fs from 'fs';

   let model: tf.GraphModel | null = null;

   async function loadModel() {
     if (model) return model;
     
     const modelPath = path.join(process.cwd(), 'public', 'models', 'fish-detection-tfjs');
     model = await tf.loadGraphModel(`file://${modelPath}/model.json`);
     return model;
   }

   export async function POST(request: NextRequest) {
     // Load model (lazy loading)
     const loadedModel = await loadModel();
     
     // Process image and run inference
     // ... (see implementation details)
   }
   ```

### Option 2: Python Backend (Best for TensorFlow 1.x models)

**Advantages:**
- Works directly with `.pb` format (no conversion needed)
- Can use TensorFlow 1.x Object Detection API directly
- Better compatibility with the original model

**Steps:**

1. **Set up Python backend:**
   ```bash
   # Create Python backend directory
   mkdir -p backend
   cd backend
   
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install tensorflow==1.15.0
   pip install flask flask-cors pillow numpy
   ```

2. **Create Python inference server** (`backend/fish_detection_server.py`):
   ```python
   import tensorflow as tf
   import numpy as np
   from flask import Flask, request, jsonify
   from flask_cors import CORS
   from PIL import Image
   import io
   import base64

   app = Flask(__name__)
   CORS(app)

   # Load the TensorFlow model
   MODEL_PATH = './fish_inception_v2_graph/frozen_inference_graph.pb'
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
           image_data = data['imageData']  # Base64 encoded image
           
           # Decode image
           image = Image.open(io.BytesIO(base64.b64decode(image_data)))
           image_np = np.array(image)
           
           # Run inference
           image_tensor = detection_graph.get_tensor_by_name('image_tensor:0')
           boxes = detection_graph.get_tensor_by_name('detection_boxes:0')
           scores = detection_graph.get_tensor_by_name('detection_scores:0')
           classes = detection_graph.get_tensor_by_name('detection_classes:0')
           num_detections = detection_graph.get_tensor_by_name('num_detections:0')
           
           (boxes, scores, classes, num_detections) = sess.run(
               [boxes, scores, classes, num_detections],
               feed_dict={image_tensor: np.expand_dims(image_np, 0)}
           )
           
           # Process results
           detections = []
           for i in range(int(num_detections[0])):
               if scores[0][i] > 0.5:  # Confidence threshold
                   detections.append({
                       'bbox': boxes[0][i].tolist(),
                       'score': float(scores[0][i]),
                       'class': int(classes[0][i])
                   })
           
           return jsonify({'success': True, 'detections': detections})
       except Exception as e:
           return jsonify({'success': False, 'error': str(e)}), 500

   if __name__ == '__main__':
       app.run(port=5000)
   ```

3. **Update Next.js API to call Python backend:**
   ```typescript
   // In src/app/api/fish-detection/detect/route.ts
   const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5000';
   
   const response = await fetch(`${PYTHON_BACKEND_URL}/detect`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ imageData: base64Image }),
   });
   ```

### Option 3: Browser-Based with TensorFlow.js (Limited by Model Size)

**Advantages:**
- Runs entirely in browser
- No server-side inference needed
- Real-time processing

**Limitations:**
- Model size limitations (~50-100MB for browser)
- Slower inference on CPU
- Requires model conversion

**Steps:**

1. **Convert model to TensorFlow.js** (same as Option 1)
2. **Load model in browser** (already set up in `FishDetectionModal.tsx`)
3. **Update detection code** to use the converted model

## Downloading the Model

The model from the repository is available at:
- **Repository**: https://github.com/kwea123/fish_detection
- **Trained model**: Available in the repository (check releases or contact author)
- **Model format**: `.pb` (frozen inference graph)

To download:
```bash
# Clone the repository
git clone https://github.com/kwea123/fish_detection.git
cd fish_detection

# The model files should be in:
# - fish_inception_v2_graph/frozen_inference_graph.pb
# - fish_inception_v2_graph2/frozen_inference_graph.pb
# - fish_ssd_fpn_graph/frozen_inference_graph.pb
```

## Model Conversion

### Converting .pb to TensorFlow.js

```bash
# Install converter
pip install tensorflowjs

# Convert model
tensorflowjs_converter \
  --input_format=tf_frozen_model \
  --output_format=tfjs_graph_model \
  --output_node_names='detection_boxes,detection_classes,detection_scores,num_detections' \
  --saved_model_tags=serve \
  ./fish_inception_v2_graph/frozen_inference_graph.pb \
  ./public/models/fish-detection-tfjs
```

### Output Node Names

For TensorFlow Object Detection API models, the output nodes are typically:
- `detection_boxes`: Bounding box coordinates
- `detection_classes`: Class IDs
- `detection_scores`: Confidence scores
- `num_detections`: Number of detections

## Integration with Current Code

The current implementation uses custom edge-based detection. To integrate the TensorFlow model:

1. **Update `FishDetectionModal.tsx`** to call the API endpoint:
   ```typescript
   const detectFishWithTensorFlow = async (imageData: ImageData) => {
     // Convert ImageData to base64
     const canvas = document.createElement('canvas');
     canvas.width = imageData.width;
     canvas.height = imageData.height;
     const ctx = canvas.getContext('2d');
     ctx.putImageData(imageData, 0, 0);
     const base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
     
     // Call API
     const response = await fetch('/api/fish-detection/detect', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       credentials: 'include',
       body: JSON.stringify({
         imageData: base64Image,
         width: imageData.width,
         height: imageData.height,
       }),
     });
     
     const result = await response.json();
     return result.detections;
   };
   ```

2. **Update detection loop** to use TensorFlow model when available:
   ```typescript
   if (useTensorFlowModel) {
     detections = await detectFishWithTensorFlow(imageData);
   } else {
     detections = detectFishInFrame(imageData, width, height);
   }
   ```

## Performance Considerations

- **Model size**: Faster R-CNN models are large (~50-100MB)
- **Inference time**: 40-50ms on GPU, 200-500ms on CPU
- **Browser limitations**: Large models may be slow in browser
- **Server-side**: Better performance, but requires server resources

## Recommended Approach

For this Next.js application, I recommend:

1. **Start with Option 2** (Python Backend) - **EASIEST TO SET UP**
   - Works directly with the `.pb` model (no conversion needed)
   - Can use TensorFlow 1.x Object Detection API directly
   - Separate service, easy to deploy

2. **Alternative: Option 1** (TensorFlow.js Node.js backend)
   - Good balance of performance and simplicity
   - Works well with Next.js API routes
   - Requires model conversion

3. **Fallback to custom detection** if model is not available
   - The current custom detection works well
   - Provides real-time performance
   - No model loading required
   - **Currently active and working**

## Testing

After setting up the model:

1. Test the API endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/fish-detection/detect \
     -H "Content-Type: application/json" \
     -d '{"imageData": "...", "width": 640, "height": 480}'
   ```

2. Test in the browser:
   - Open the fish detection modal
   - The model should load automatically
   - Detections should appear with bounding boxes

## Troubleshooting

- **Model not loading**: Check model path and format
- **Slow inference**: Consider using GPU or optimizing model
- **Conversion errors**: Ensure TensorFlow.js converter version matches model format
- **API errors**: Check server logs and model initialization

## Next Steps

1. Download the model from the repository
2. Choose an integration option (Option 1 recommended)
3. Convert the model if needed
4. Update the API endpoint with model inference code
5. Test and optimize performance

## References

- [TensorFlow.js Model Conversion](https://www.tensorflow.org/js/guides/conversion)
- [TensorFlow Object Detection API](https://github.com/tensorflow/models/tree/master/research/object_detection)
- [kwea123/fish_detection Repository](https://github.com/kwea123/fish_detection)

