# TensorFlow Version Fix

## Problem

TensorFlow 1.15.0 is not available for newer Python versions. The error:
```
ERROR: Could not find a version that satisfies the requirement tensorflow==1.15.0
```

## Solution

Updated to use **TensorFlow 2.x with compatibility mode**, which:
- ✅ Works with modern Python versions (3.8-3.11)
- ✅ Can run TensorFlow 1.x models using `tf.compat.v1`
- ✅ More maintainable and secure
- ✅ Better performance optimizations

## Updated Files

1. **`requirements.txt`** - Updated to TensorFlow 2.x
2. **`fish_detection_server.py`** - Added compatibility mode

## Installation

```bash
cd backend
pip install -r requirements.txt
```

This will install TensorFlow 2.x which works with the TensorFlow 1.x model.

## How It Works

The server automatically:
1. Detects TensorFlow version
2. Enables v1 compatibility mode for TensorFlow 2.x
3. Uses `tf.compat.v1` APIs to run TensorFlow 1.x models
4. Works seamlessly with the existing `.pb` model

## Alternative: Use Python 3.7 (If Needed)

If you prefer TensorFlow 1.15.0:

```bash
# Install Python 3.7
# Create virtual environment with Python 3.7
python3.7 -m venv venv
source venv/bin/activate
pip install tensorflow==1.15.0
```

But **TensorFlow 2.x with compatibility mode is recommended** as it:
- Works with current Python versions
- Has security updates
- Better performance
- More maintainable

## Verification

After installation, check TensorFlow version:

```python
import tensorflow as tf
print(tf.__version__)  # Should show 2.x version
```

The server will automatically use compatibility mode.

## Troubleshooting

### Import Errors

If you get import errors, make sure:
1. TensorFlow 2.x is installed
2. Compatibility mode is enabled (automatic in the code)
3. All dependencies are installed

### Model Loading Errors

If model doesn't load:
1. Check model path is correct
2. Verify model file exists
3. Check TensorFlow version compatibility

## References

- [TensorFlow Migration Guide](https://www.tensorflow.org/guide/migrate)
- [TensorFlow Compatibility](https://www.tensorflow.org/guide/versions)

