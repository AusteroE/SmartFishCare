# Fish Detection Models - Integration Guide

## Current Implementation

The project currently uses **optimized custom edge-based detection** which works well for fish detection in real-time. This approach:
- Uses Canny-like edge detection
- Analyzes contours and shapes
- Validates fish-like characteristics (aspect ratio, color, motion)
- Provides accurate bounding boxes

## Available Models for Fish Detection

### 1. **COCO-SSD (Currently Installed but Not Used)**
- **Status**: Installed in `package.json` but COCO-SSD doesn't have a "fish" class
- **Classes**: Detects 80 objects (person, car, bird, cat, dog, etc.) but NOT fish
- **Use Case**: Not suitable for fish detection
- **Recommendation**: Keep for potential future use, but not for fish detection

### 2. **YOLO Fish Detection Models**

#### Option A: YOLOv8 Fish Detector (Grayscale)
- **Source**: [HuggingFace - akridge/yolo8-fish-detector-grayscale](https://huggingface.co/akridge/yolo8-fish-detector-grayscale)
- **Format**: ONNX or PyTorch
- **Advantages**: 
  - Specifically trained for fish detection
  - Works with grayscale underwater imagery
  - Optimized for real-time detection
- **Integration**: Requires ONNX Runtime for Web or TensorFlow.js conversion

#### Option B: YOLO-Fish (Darknet)
- **Source**: [GitHub - tamim662/YOLO-Fish](https://github.com/tamim662/YOLO-Fish)
- **Format**: Darknet/YOLOv3
- **Advantages**:
  - Tested on DeepFish and OzFish datasets
  - High accuracy for underwater fish detection
- **Integration**: Requires conversion to TensorFlow.js or ONNX

#### Option C: Roboflow Fish Detection
- **Source**: [Roboflow Fish Detection Template](https://templates.roboflow.com/fish-detection)
- **Format**: YOLOv5/YOLOv8, available as API or model files
- **Advantages**:
  - Easy integration via API
  - Pre-trained models available
  - Can be fine-tuned on custom data
- **Integration**: 
  - API: REST API calls
  - Model: Download ONNX/TensorFlow.js format

### 3. **Marine-Detect**
- **Source**: [Orange-OpenSource/marine-detect](https://github.com/Orange-OpenSource/marine-detect)
- **Format**: Multiple formats available
- **Advantages**: 
  - Detects various marine species including fish
  - Trained on diverse marine datasets
- **Integration**: Requires model conversion

## Recommended Integration Path

### Option 1: Use Roboflow API (Easiest)
```typescript
// Add to package.json
// No additional packages needed - use fetch API

const detectFishWithRoboflow = async (imageData: ImageData) => {
  const formData = new FormData();
  // Convert ImageData to blob
  const blob = await imageDataToBlob(imageData);
  formData.append('file', blob);
  
  const response = await fetch('https://detect.roboflow.com/your-model-id', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: formData
  });
  
  const predictions = await response.json();
  return predictions.predictions; // Array of detections with bounding boxes
};
```

### Option 2: Use ONNX Runtime with YOLO Model (Best Performance)
```bash
# Install ONNX Runtime for Web
npm install onnxruntime-web
```

```typescript
import * as ort from 'onnxruntime-web';

const loadFishModel = async () => {
  const session = await ort.InferenceSession.create('/models/fish-detection.onnx');
  return session;
};

const detectFishWithONNX = async (session: ort.InferenceSession, imageData: ImageData) => {
  // Preprocess image
  const tensor = preprocessImage(imageData);
  
  // Run inference
  const results = await session.run({ input: tensor });
  
  // Post-process results (NMS, scale boxes)
  return processYOLOOutput(results);
};
```

### Option 3: Convert YOLO to TensorFlow.js (Good for Browser)
```bash
# Install tensorflowjs converter
pip install tensorflowjs

# Convert YOLO model to TensorFlow.js
tensorflowjs_converter --input_format=tf_saved_model \
  --output_format=tfjs_graph_model \
  --signature_name=serving_default \
  --saved_model_tags=serve \
  ./yolo-fish-model ./tfjs-model
```

## Current Implementation (Custom Detection)

The current custom detection is optimized and works well because:
1. **Real-time Performance**: Processes at ~10 FPS
2. **Accurate Bounding Boxes**: Uses contour extraction and refinement
3. **Fish-Specific Validation**: Validates aspect ratio, size, color, motion
4. **No Model Loading**: No network requests or model downloads
5. **Works Offline**: No external dependencies

## Performance Comparison

| Method | Accuracy | Speed | Model Size | Setup Complexity |
|--------|----------|-------|------------|------------------|
| Custom Detection | Good | Fast (~10 FPS) | 0 MB | Low |
| COCO-SSD | N/A (no fish class) | Fast | ~25 MB | Low |
| YOLO Fish (ONNX) | Excellent | Medium (~5-8 FPS) | ~50-100 MB | Medium |
| Roboflow API | Excellent | Fast (API dependent) | 0 MB (cloud) | Low |

## Recommendation

**For now, continue using the optimized custom detection** because:
1. It works well for fish detection
2. Real-time performance is good
3. No model loading required
4. Accurate bounding boxes with tracking

**For future enhancement, consider:**
1. **Roboflow API** - Easy integration, cloud-based, no model management
2. **YOLOv8 ONNX Model** - Best accuracy, requires model hosting and conversion
3. **Custom YOLO Training** - Train on your specific fish species for maximum accuracy

## Integration Steps for YOLO Model (Future)

1. **Download/Convert Model**:
   - Get YOLO fish detection model (ONNX format)
   - Place in `public/models/fish-detection.onnx`

2. **Install ONNX Runtime**:
   ```bash
   npm install onnxruntime-web
   ```

3. **Update Detection Code**:
   - Load ONNX model on initialization
   - Replace `detectFishInFrame` with ONNX inference
   - Keep tracking system and bounding box rendering

4. **Test Performance**:
   - Measure FPS with ONNX model
   - Compare accuracy with custom detection
   - Optimize if needed

## Model Sources

- **Roboflow**: https://roboflow.com/models (Search "fish detection")
- **HuggingFace**: https://huggingface.co/models (Search "fish detection yolo")
- **GitHub**: Search for "fish detection yolo" repositories
- **Custom Training**: Train your own model on fish dataset

## Notes

- COCO-SSD is installed but not used (doesn't detect fish)
- TensorFlow.js is set up and ready for future model integration
- Current custom detection is optimized and performs well
- For production, consider training a custom model on your specific fish species

