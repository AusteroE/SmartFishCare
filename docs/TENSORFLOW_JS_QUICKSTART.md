# Quick Start: TensorFlow.js Fish Detection (Browser-Only)

## ✅ What's Done

The code is now set up to use TensorFlow.js directly in the browser - **no Python backend needed!**

- ✅ Model loading from `/models/fish-detection-tfjs/model.json`
- ✅ Browser-based inference using TensorFlow.js
- ✅ Automatic fallback to custom detection if model not available
- ✅ Real-time video processing

## 🚀 Quick Setup

### Step 1: Convert the Model

The model from [kwea123/fish_detection](https://github.com/kwea123/fish_detection) needs to be converted to TensorFlow.js format.

```bash
# Install converter
pip install tensorflowjs

# Convert the model
tensorflowjs_converter \
  --input_format=tf_frozen_model \
  --output_format=tfjs_graph_model \
  --output_node_names='detection_boxes,detection_classes,detection_scores,num_detections' \
  ./fish_inception_v2_graph/frozen_inference_graph.pb \
  ./public/models/fish-detection-tfjs
```

### Step 2: Place Model Files

After conversion, you should have:
```
public/
  models/
    fish-detection-tfjs/
      model.json          # Model architecture
      *.bin              # Model weights (one or more .bin files)
```

**Important**: Place the entire `fish-detection-tfjs` folder in the `public/models/` directory.

### Step 3: Test

1. Start your Next.js app: `npm run dev`
2. Open the fish detection modal
3. Check browser console:
   - ✅ `TensorFlow.js fish detection model loaded successfully!` = Model is working
   - ⚠️ `TensorFlow.js model not found` = Model not placed correctly (using custom detection)

## 📝 Model Conversion Details

### Finding the Model File

The model should be in the repository:
- Path: `fish_inception_v2_graph/frozen_inference_graph.pb`
- Or: `fish_ssd_fpn_graph/frozen_inference_graph.pb`
- Or: `fish_inception_v2_graph2/frozen_inference_graph.pb`

### Output Node Names

For TensorFlow Object Detection API models, use these output nodes:
- `detection_boxes` - Bounding box coordinates
- `detection_classes` - Class IDs  
- `detection_scores` - Confidence scores
- `num_detections` - Number of detections

### If Conversion Fails

If you get errors about output node names:

1. **Find the correct node names**:
   ```python
   import tensorflow as tf
   
   with tf.gfile.GFile('frozen_inference_graph.pb', 'rb') as f:
       graph_def = tf.GraphDef()
       graph_def.ParseFromString(f.read())
   
   # Print all node names containing "detection"
   for node in graph_def.node:
       if 'detection' in node.name.lower():
           print(node.name)
   ```

2. **Use the found node names** in the conversion command

## 🎯 How It Works

1. **Model Loading**: When the modal opens, it tries to load `/models/fish-detection-tfjs/model.json`
2. **Detection**: If model is loaded, uses TensorFlow.js for inference
3. **Fallback**: If model not found, uses optimized custom detection (works well!)
4. **Real-time**: Processes video frames and displays bounding boxes

## ⚡ Performance

- **Model Size**: ~50-100MB (Faster R-CNN models are large)
- **Load Time**: 2-5 seconds on first load
- **Inference**: 100-300ms per frame (depends on device)
- **Optimization**: Already processes every 3rd frame for better performance

## 🔧 Troubleshooting

### Model Not Loading

**Check**:
- Model files are in `public/models/fish-detection-tfjs/`
- `model.json` exists and is accessible
- Browser console for errors

**Fix**:
- Verify file paths
- Check Next.js is serving static files
- Clear browser cache

### Slow Performance

**Solutions**:
- Model is large - this is normal for Faster R-CNN
- Consider using a smaller model (SSD instead of Faster R-CNN)
- Already optimized with frame skipping

### Wrong Detections

**Check**:
- Model output format matches expected format
- Coordinate scaling is correct
- Confidence threshold (currently 0.3)

## 📚 Full Documentation

See `docs/TENSORFLOW_JS_SETUP.md` for:
- Detailed conversion instructions
- Troubleshooting guide
- Performance optimization
- Alternative approaches

## 🎉 Current Status

- ✅ Code ready for TensorFlow.js model
- ✅ Automatic model loading
- ✅ Browser-based inference
- ✅ Fallback to custom detection
- ⏳ **Just need to convert and place the model!**

Once you convert the model and place it in `public/models/fish-detection-tfjs/`, it will work automatically!

