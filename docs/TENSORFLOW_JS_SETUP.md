# TensorFlow.js Fish Detection Setup (Browser-Only)

This guide shows how to use the TensorFlow fish detection model directly in the browser using TensorFlow.js - **no Python backend needed!**

## Overview

✅ **Browser-based**: Runs entirely in the browser using TensorFlow.js  
✅ **No Python**: No need to run a separate Python server  
✅ **Real-time**: Can process video frames directly  
⚠️ **Model conversion required**: Need to convert the `.pb` model to TensorFlow.js format

## Step 1: Convert the Model

The model from [kwea123/fish_detection](https://github.com/kwea123/fish_detection) is in TensorFlow 1.x `.pb` format. We need to convert it to TensorFlow.js format.

### Option A: Convert from Frozen Graph (.pb)

```bash
# Install TensorFlow.js converter
pip install tensorflowjs

# Convert the frozen inference graph
tensorflowjs_converter \
  --input_format=tf_frozen_model \
  --output_format=tfjs_graph_model \
  --output_node_names='detection_boxes,detection_classes,detection_scores,num_detections' \
  ./fish_inception_v2_graph/frozen_inference_graph.pb \
  ./public/models/fish-detection-tfjs
```

### Option B: Convert from SavedModel (if available)

```bash
tensorflowjs_converter \
  --input_format=tf_saved_model \
  --output_format=tfjs_graph_model \
  --saved_model_tags=serve \
  ./saved_model_directory \
  ./public/models/fish-detection-tfjs
```

### Important Notes:

1. **Output Node Names**: TensorFlow Object Detection API models have specific output nodes:
   - `detection_boxes`: Bounding box coordinates [y1, x1, y2, x2]
   - `detection_classes`: Class IDs
   - `detection_scores`: Confidence scores
   - `num_detections`: Number of detections

2. **Model Size**: Faster R-CNN models are large (~50-100MB). Consider:
   - Using a smaller model variant if available
   - Compressing the model
   - Using model quantization

3. **Input Shape**: Most models expect:
   - Input: `[1, height, width, 3]` (batch, height, width, RGB channels)
   - Common sizes: 640x640, 800x800, or 300x300

## Step 2: Place Model Files

After conversion, you should have:
```
public/
  models/
    fish-detection-tfjs/
      model.json          # Model architecture
      *.bin              # Model weights (one or more files)
```

Place the converted model in `public/models/fish-detection-tfjs/`

## Step 3: Verify Model Loading

The code will automatically try to load the model from `/models/fish-detection-tfjs/model.json` when the fish detection modal opens.

Check the browser console:
- ✅ `TensorFlow.js fish detection model loaded successfully!` - Model is working
- ⚠️ `TensorFlow.js model not found` - Model not placed correctly

## Step 4: Test Detection

1. Open the fish detection modal
2. Start detection
3. The model will automatically be used if loaded
4. Falls back to custom detection if model is not available

## Troubleshooting

### Model Not Loading

**Error**: `Failed to fetch model.json`

**Solutions**:
- Check model files are in `public/models/fish-detection-tfjs/`
- Verify `model.json` exists and is accessible
- Check browser console for CORS errors
- Ensure Next.js is serving static files from `public/`

### Model Too Large

**Issue**: Model takes too long to load or causes memory issues

**Solutions**:
- Use a smaller model variant (SSD instead of Faster R-CNN)
- Compress model weights
- Use model quantization
- Consider server-side inference instead

### Wrong Output Format

**Issue**: Detections not appearing or incorrect format

**Solutions**:
- Verify output node names during conversion
- Check model output shape in browser console
- Adjust post-processing code in `detectFishWithTensorFlowJS()`

### Performance Issues

**Issue**: Detection is too slow

**Solutions**:
- Reduce input image size
- Process every Nth frame (already implemented)
- Use WebGL backend (already enabled)
- Consider using a lighter model

## Model Conversion Troubleshooting

### TensorFlow 1.x Compatibility

The model is TensorFlow 1.x, but TensorFlow.js converter may need TensorFlow 2.x:

```bash
# Install both versions
pip install tensorflow==1.15.0  # For running the model
pip install tensorflowjs        # For conversion (uses TF 2.x)
```

### Finding Output Node Names

If you don't know the output node names:

```python
import tensorflow as tf

# Load the frozen graph
with tf.gfile.GFile('frozen_inference_graph.pb', 'rb') as f:
    graph_def = tf.GraphDef()
    graph_def.ParseFromString(f.read())

# Print all node names
for node in graph_def.node:
    if 'detection' in node.name.lower():
        print(node.name)
```

### Alternative: Use TensorFlow 2.x SavedModel

If you have access to the training code, export as SavedModel:

```python
# In TensorFlow 2.x
import tensorflow as tf

# Load and export
model = tf.saved_model.load('path/to/model')
tf.saved_model.save(model, 'saved_model_directory')
```

## Performance Optimization

### 1. Model Quantization

Reduce model size with quantization:

```bash
tensorflowjs_converter \
  --quantize_float16 \
  --input_format=tf_frozen_model \
  --output_format=tfjs_graph_model \
  ./frozen_inference_graph.pb \
  ./public/models/fish-detection-tfjs
```

### 2. Input Size Reduction

Process at lower resolution:

```typescript
// In detectFishWithTensorFlowJS()
// Use smaller input size if model supports it
const modelHeight = 320; // Instead of 640
const modelWidth = 320;
```

### 3. Frame Skipping

Already implemented - processes every 3rd frame for better performance.

## Alternative: Use Pre-converted Model

If conversion is difficult, consider:

1. **Use a different model**: Look for TensorFlow.js-compatible fish detection models
2. **Use ONNX Runtime Web**: Convert to ONNX format and use `onnxruntime-web`
3. **Use a lighter model**: SSD models are smaller and faster than Faster R-CNN

## Model Sources

- **Original Model**: [kwea123/fish_detection](https://github.com/kwea123/fish_detection)
- **TensorFlow.js Models**: Check [TensorFlow.js Model Zoo](https://github.com/tensorflow/tfjs-models)
- **ONNX Models**: Check [ONNX Model Zoo](https://github.com/onnx/models)

## Current Implementation

The code automatically:
1. ✅ Tries to load TensorFlow.js model on initialization
2. ✅ Uses model if available, falls back to custom detection
3. ✅ Handles model errors gracefully
4. ✅ Processes detections and integrates with tracking system

## Next Steps

1. Convert the model using the commands above
2. Place model files in `public/models/fish-detection-tfjs/`
3. Test in browser - model should load automatically
4. Optimize if needed (quantization, smaller input size)

## References

- [TensorFlow.js Conversion Guide](https://www.tensorflow.org/js/guide/conversion)
- [TensorFlow.js API](https://js.tensorflow.org/api/latest/)
- [Model Optimization](https://www.tensorflow.org/model_optimization)

