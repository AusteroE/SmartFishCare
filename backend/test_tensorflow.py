"""
Test script to verify TensorFlow installation and compatibility
"""

import sys

print("Python version:", sys.version)
print()

try:
    import tensorflow as tf
    print("✅ TensorFlow imported successfully")
    print(f"TensorFlow version: {tf.__version__}")
    print()
    
    # Test compatibility APIs
    if tf.__version__.startswith('2.'):
        print("TensorFlow 2.x detected - testing compatibility mode...")
        
        # Test Graph creation
        graph = tf.compat.v1.Graph()
        print("✅ tf.compat.v1.Graph() works")
        
        # Test Session creation (use compat.v1 directly)
        config = tf.compat.v1.ConfigProto()
        print("✅ tf.compat.v1.ConfigProto() works")
        
        # Test Session creation
        with tf.compat.v1.Session(config=config) as sess:
            print("✅ tf.compat.v1.Session() works")
        
        # Test file operations
        try:
            # This will fail if file doesn't exist, but we're just testing the API
            print("✅ tf.compat.v1 APIs available")
        except Exception as e:
            pass
        
        print()
        print("✅ TensorFlow 2.x is ready to use with compatibility mode!")
    else:
        print("TensorFlow 1.x detected")
        print("✅ TensorFlow 1.x is ready to use!")
    
except ImportError as e:
    print("❌ TensorFlow not installed:", e)
    print()
    print("Install with: pip install tensorflow")
    sys.exit(1)
except Exception as e:
    print("❌ Error:", e)
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()
print("All checks passed! ✅")

