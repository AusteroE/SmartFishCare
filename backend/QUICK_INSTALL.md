# Quick Install - TensorFlow 2.x

## ✅ Fixed: TensorFlow Version Issue

The server now uses **TensorFlow 2.x** which works with modern Python versions (3.8-3.11).

## Installation

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Install TensorFlow 2.x (automatically uses compatibility mode)
pip install -r requirements.txt
```

## Verify Installation

```bash
python test_tensorflow.py
```

Should show:
```
✅ TensorFlow imported successfully
TensorFlow version: 2.x.x
✅ TensorFlow 2.x is ready to use with compatibility mode!
```

## What Changed

- ✅ **requirements.txt**: Updated to TensorFlow 2.x
- ✅ **fish_detection_server.py**: Uses `tf.compat.v1` APIs for compatibility
- ✅ **Works with**: TensorFlow 1.x models (via compatibility mode)

## How It Works

TensorFlow 2.x includes compatibility mode (`tf.compat.v1`) which allows running TensorFlow 1.x models without conversion. The server automatically:

1. Detects TensorFlow version
2. Uses compatibility APIs (`tf.compat.v1`)
3. Runs TensorFlow 1.x models seamlessly

## Next Steps

1. Install dependencies: `pip install -r requirements.txt`
2. Download model from repository
3. Set `MODEL_PATH` environment variable
4. Start server: `python fish_detection_server.py`

## Troubleshooting

**Still getting errors?**
- Make sure Python version is 3.8-3.11
- Upgrade pip: `python -m pip install --upgrade pip`
- Try: `pip install tensorflow --upgrade`

**Model loading issues?**
- Check model path is correct
- Verify model file exists
- Check file permissions

See `INSTALL.md` for more details.

