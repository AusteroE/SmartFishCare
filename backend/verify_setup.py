"""
Verify Fish Detection Server Setup
Checks if model file exists and TensorFlow is ready
"""

import os
import sys

print("=" * 50)
print("Fish Detection Server Setup Verification")
print("=" * 50)
print()

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Check Python version
print("[OK] Python version: " + sys.version.split()[0])
print()

# Check TensorFlow
try:
    import tensorflow as tf
    print("[OK] TensorFlow version: " + tf.__version__)
    if tf.__version__.startswith('2.'):
        print("[OK] TensorFlow 2.x with compatibility mode")
    print()
except ImportError:
    print("[ERROR] TensorFlow not installed!")
    print("Run: pip install -r requirements.txt")
    sys.exit(1)

# Check model file locations
print("Checking model file locations...")
print()

MODEL_PATHS = [
    './fish_inception_v2_graph/frozen_inference_graph.pb',
    '../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb',
    os.path.join(os.path.dirname(os.path.dirname(__file__)), 'fish_detection_repo', 'fish_inception_v2_graph', 'frozen_inference_graph.pb'),
]

model_found = False
for path in MODEL_PATHS:
    abs_path = os.path.abspath(path)
    exists = os.path.exists(path)
    status = "[OK]" if exists else "[NOT FOUND]"
    print(status + " " + path)
    print("   Absolute: " + abs_path)
    print("   Exists: " + str(exists))
    if exists:
        size = os.path.getsize(path) / (1024 * 1024)  # Size in MB
        print("   Size: {:.2f} MB".format(size))
        if not model_found:
            model_found = True
            print("   [OK] This model will be used!")
    print()

if not model_found:
    print("[ERROR] Model file not found in any location!")
    print()
    print("Please:")
    print("1. Clone the repository:")
    print("   git clone https://github.com/kwea123/fish_detection.git ../fish_detection_repo")
    print()
    print("2. Or set MODEL_PATH environment variable:")
    print("   set MODEL_PATH=path/to/frozen_inference_graph.pb")
    sys.exit(1)

# Check other dependencies
print("Checking dependencies...")
print()

dependencies = {
    'flask': 'Flask',
    'flask_cors': 'flask-cors',
    'PIL': 'Pillow',
    'numpy': 'numpy',
    'cv2': 'opencv-python',
}

all_ok = True
for module, package in dependencies.items():
    try:
        __import__(module)
        print("[OK] " + package)
    except ImportError:
        print("[ERROR] " + package + " not installed!")
        all_ok = False

print()

if all_ok:
    print("=" * 50)
    print("[OK] All checks passed! Ready to start server.")
    print("=" * 50)
    print()
    print("Start server with:")
    print("  python fish_detection_server.py")
    print()
else:
    print("=" * 50)
    print("[ERROR] Some dependencies are missing!")
    print("=" * 50)
    print()
    print("Install with:")
    print("  pip install -r requirements.txt")
    print()
    sys.exit(1)

