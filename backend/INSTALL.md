# Installation Guide

## TensorFlow Version Compatibility

The server now uses **TensorFlow 2.x with compatibility mode** which works with modern Python versions.

## Quick Install

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

## Requirements

- **Python**: 3.8 - 3.11 (recommended: 3.9 or 3.10)
- **TensorFlow**: 2.10.0 or higher (automatically installed)
- **Other dependencies**: See `requirements.txt`

## Troubleshooting

### TensorFlow Installation Issues

If you get errors installing TensorFlow:

1. **Check Python version**:
   ```bash
   python --version
   ```
   Should be 3.8-3.11

2. **Upgrade pip**:
   ```bash
   python -m pip install --upgrade pip
   ```

3. **Install TensorFlow**:
   ```bash
   pip install tensorflow
   ```

### Windows-Specific Issues

If you have issues on Windows:

1. **Use Python 3.9 or 3.10** (most compatible)
2. **Install Visual C++ Redistributable** (may be required)
3. **Use pre-built wheels**:
   ```bash
   pip install tensorflow --only-binary :all:
   ```

### Alternative: Use Docker

If you have installation issues, use Docker:

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY fish_detection_server.py .
CMD ["python", "fish_detection_server.py"]
```

## Verification

After installation:

```bash
python -c "import tensorflow as tf; print(tf.__version__)"
```

Should show: `2.x.x`

## Model Setup

1. Download model from repository
2. Set `MODEL_PATH` environment variable
3. Start server

See `README.md` for details.

