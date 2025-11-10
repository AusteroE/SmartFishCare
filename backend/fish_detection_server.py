"""
Fish Detection Server using TensorFlow
Optimized for web integration with caching and performance improvements

Compatible with:
- TensorFlow 2.x (with compatibility mode) - Recommended for modern Python
- TensorFlow 1.15.0 (requires Python 3.7)
"""

import os
import sys
import logging

# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import TensorFlow and enable compatibility mode
import tensorflow as tf

# Check TensorFlow version and set up compatibility
TF_VERSION = tf.__version__
logger.info(f'TensorFlow version: {TF_VERSION}')

# For TensorFlow 2.x, we'll use compat.v1 APIs throughout
# No need to disable v2 behavior - just use compat.v1 APIs
if TF_VERSION.startswith('2.'):
    logger.info('Using TensorFlow 2.x with v1 compatibility APIs')
else:
    logger.info('Using TensorFlow 1.x')

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import base64
import time
from functools import lru_cache

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Configuration
# Default model path - can be overridden with MODEL_PATH environment variable
# Check multiple possible locations for the model
DEFAULT_MODEL_PATHS = [
    './fish_inception_v2_graph/frozen_inference_graph.pb',  # In backend directory
    '../fish_detection_repo/fish_inception_v2_graph/frozen_inference_graph.pb',  # In project root
    os.path.join(os.path.dirname(os.path.dirname(__file__)), 'fish_detection_repo', 'fish_inception_v2_graph', 'frozen_inference_graph.pb'),  # Absolute path
]

# Find the first existing model path
MODEL_PATH = os.getenv('MODEL_PATH', None)
if not MODEL_PATH:
    for path in DEFAULT_MODEL_PATHS:
        if os.path.exists(path):
            MODEL_PATH = path
            break
    if not MODEL_PATH:
        MODEL_PATH = DEFAULT_MODEL_PATHS[1]  # Default to project root location
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', '0.3'))
MAX_IMAGE_SIZE = int(os.getenv('MAX_IMAGE_SIZE', '1280'))  # Max dimension for optimization (web-optimized)
PORT = int(os.getenv('PORT', '5000'))

# Web optimization: Process images at lower resolution for faster inference
# Original model may expect larger images, but we optimize for web performance
PROCESSING_RESOLUTION = int(os.getenv('PROCESSING_RESOLUTION', '640'))  # Default processing size

# Global variables for model
detection_graph = None
sess = None
model_loaded = False

def load_model():
    """Load the TensorFlow detection model"""
    global detection_graph, sess, model_loaded
    
    # Check if already loaded and session exists
    if model_loaded and sess is not None and detection_graph is not None:
        return True
    
    try:
        logger.info(f'Loading model from: {MODEL_PATH}')
        
        if not os.path.exists(MODEL_PATH):
            logger.error(f'Model file not found: {MODEL_PATH}')
            return False
        
        # Use compat.v1 APIs for TensorFlow 2.x compatibility
        # These APIs work with both TensorFlow 1.x and 2.x
        detection_graph = tf.compat.v1.Graph()
        with detection_graph.as_default():
            od_graph_def = tf.compat.v1.GraphDef()
            
            # Read model file using TensorFlow file API
            # tf.io.gfile.GFile works in TensorFlow 2.x
            # For compatibility, we can also use tf.compat.v1.gfile.GFile
            try:
                # Use tf.io.gfile for TensorFlow 2.x (preferred)
                with tf.io.gfile.GFile(MODEL_PATH, 'rb') as fid:
                    serialized_graph = fid.read()
            except (AttributeError, TypeError):
                # Fallback: use compat.v1.gfile (works in both TF 1.x and 2.x)
                try:
                    with tf.compat.v1.gfile.GFile(MODEL_PATH, 'rb') as fid:
                        serialized_graph = fid.read()
                except (AttributeError, TypeError):
                    # Last resort: standard Python file I/O
                    logger.warning('Using standard file I/O instead of TensorFlow file API')
                    with open(MODEL_PATH, 'rb') as fid:
                        serialized_graph = fid.read()
            
            od_graph_def.ParseFromString(serialized_graph)
            tf.compat.v1.import_graph_def(od_graph_def, name='')
        
        # Create session with optimizations for web performance
        # Use compat.v1 APIs which work with both TensorFlow 1.x and 2.x
        config = tf.compat.v1.ConfigProto()
        
        # GPU optimizations (if available)
        try:
            gpu_options = tf.compat.v1.GPUOptions(allow_growth=True)
            config.gpu_options.CopyFrom(gpu_options)
        except (AttributeError, TypeError):
            # GPU options not available or not supported
            pass
        
        # CPU optimizations for web performance
        config.allow_soft_placement = True
        config.log_device_placement = False  # Disable logging for performance
        config.inter_op_parallelism_threads = 2  # Optimize for web requests
        config.intra_op_parallelism_threads = 2  # Optimize for web requests
        
        sess = tf.compat.v1.Session(graph=detection_graph, config=config)
        logger.info('TensorFlow session created successfully')
        
        # Set model_loaded flag after session is created
        model_loaded = True
        
        # Warm up the model (run a dummy inference)
        logger.info('Warming up model...')
        try:
            # Get tensor handles for warmup
            image_tensor = detection_graph.get_tensor_by_name('image_tensor:0')
            boxes_tensor = detection_graph.get_tensor_by_name('detection_boxes:0')
            scores_tensor = detection_graph.get_tensor_by_name('detection_scores:0')
            classes_tensor = detection_graph.get_tensor_by_name('detection_classes:0')
            num_detections_tensor = detection_graph.get_tensor_by_name('num_detections:0')
            
            # Create dummy image for warmup
            dummy_image = np.zeros((640, 640, 3), dtype=np.uint8)
            dummy_image_expanded = np.expand_dims(dummy_image, axis=0)
            
            # Run warmup inference
            sess.run(
                [boxes_tensor, scores_tensor, classes_tensor, num_detections_tensor],
                feed_dict={image_tensor: dummy_image_expanded}
            )
            logger.info('Model warmed up successfully')
        except Exception as e:
            logger.warning(f'Model warmup failed (non-critical): {str(e)}')
            # Don't fail if warmup fails - model is still loaded
            import traceback
            logger.debug(traceback.format_exc())
        
        logger.info('✅ Model loaded successfully!')
        return True
        
    except Exception as e:
        logger.error(f'Error loading model: {str(e)}')
        import traceback
        traceback.print_exc()
        return False

def preprocess_image(image_bytes, max_size=MAX_IMAGE_SIZE):
    """
    Preprocess image for detection
    Optimized: Resize large images to improve performance
    """
    try:
        # Decode image
        image = Image.open(io.BytesIO(image_bytes))
        image_np = np.array(image)
        
        # Convert RGBA to RGB if needed
        if len(image_np.shape) == 3 and image_np.shape[2] == 4:
            image_np = image_np[:, :, :3]
        
        # Web optimization: Resize images for faster processing
        # Most TensorFlow models work well at 640x640 or similar sizes
        height, width = image_np.shape[:2]
        original_height, original_width = height, width
        
        # Resize if image is larger than max_size (optimization for web)
        if max(height, width) > max_size:
            scale = max_size / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            image = Image.fromarray(image_np)
            # Use high-quality resampling for better accuracy
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            image_np = np.array(image)
            logger.debug(f'Resized image from {width}x{height} to {new_width}x{new_height} for faster processing')
        
        # Return processed image and original dimensions (for coordinate scaling)
        return image_np, original_height, original_width
        
    except Exception as e:
        logger.error(f'Error preprocessing image: {str(e)}')
        raise

def run_inference(image_np):
    """
    Run inference on preprocessed image
    Optimized: Reuses session and graph
    """
    global detection_graph, sess, model_loaded
    
    # Check if session and graph exist (primary check)
    if sess is None:
        raise RuntimeError('Model not loaded - session is None')
    
    if detection_graph is None:
        raise RuntimeError('Model not loaded - graph is None')
    
    # Secondary check on model_loaded flag
    if not model_loaded:
        raise RuntimeError('Model not loaded - model_loaded flag is False')
    
    # Expand dimensions since the model expects 4D: [1, None, None, 3]
    image_np_expanded = np.expand_dims(image_np, axis=0)
    
    # Get tensors from the graph (using compat.v1 for TensorFlow 2.x compatibility)
    image_tensor = detection_graph.get_tensor_by_name('image_tensor:0')
    boxes_tensor = detection_graph.get_tensor_by_name('detection_boxes:0')
    scores_tensor = detection_graph.get_tensor_by_name('detection_scores:0')
    classes_tensor = detection_graph.get_tensor_by_name('detection_classes:0')
    num_detections_tensor = detection_graph.get_tensor_by_name('num_detections:0')
    
    # Run inference
    (boxes, scores, classes, num_detections) = sess.run(
        [boxes_tensor, scores_tensor, classes_tensor, num_detections_tensor],
        feed_dict={image_tensor: image_np_expanded}
    )
    
    return boxes, scores, classes, num_detections

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model_loaded,
        'model_path': MODEL_PATH,
        'model_exists': os.path.exists(MODEL_PATH) if MODEL_PATH else False
    })

@app.route('/detect', methods=['POST'])
def detect():
    """
    Fish detection endpoint
    Optimized for web: handles base64 images, resizing, caching
    """
    try:
        start_time = time.time()
        
        # Check if model is loaded
        if not model_loaded:
            if not load_model():
                return jsonify({
                    'success': False,
                    'error': 'Model not loaded. Please check model path and try again.'
                }), 500
        
        # Get image data from request
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data provided'}), 400
        
        image_data = data.get('imageData')
        if not image_data:
            return jsonify({'success': False, 'error': 'No imageData provided'}), 400
        
        # Decode base64 image
        try:
            # Handle data URL format (data:image/jpeg;base64,...)
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            logger.error(f'Error decoding base64: {str(e)}')
            return jsonify({'success': False, 'error': 'Invalid base64 image data'}), 400
        
        # Preprocess image (with optimization)
        try:
            image_np, original_height, original_width = preprocess_image(image_bytes)
        except Exception as e:
            logger.error(f'Error preprocessing image: {str(e)}')
            return jsonify({'success': False, 'error': f'Image preprocessing failed: {str(e)}'}), 400
        
        # Run inference
        try:
            boxes, scores, classes, num_detections = run_inference(image_np)
        except Exception as e:
            logger.error(f'Error running inference: {str(e)}')
            return jsonify({'success': False, 'error': f'Inference failed: {str(e)}'}), 500
        
        # Process results and scale coordinates back to original image size
        # Note: Model outputs coordinates relative to processed image size
        # We need to scale them back to original image dimensions
        detections = []
        num_det = int(num_detections[0])
        
        # Get processed image dimensions (may be different from original if resized)
        processed_height, processed_width = image_np.shape[:2]
        scale_x = original_width / processed_width
        scale_y = original_height / processed_height
        
        for i in range(num_det):
            if scores[0][i] >= CONFIDENCE_THRESHOLD:
                # Box format: [y1, x1, y2, x2] (normalized 0-1 relative to processed image)
                y1, x1, y2, x2 = boxes[0][i]
                
                # Coordinates are already normalized (0-1), so they're relative to processed size
                # For API response, we return normalized coordinates (client will scale to display)
                # But we scale them to original image size for accuracy
                detections.append({
                    'bbox': [float(y1), float(x1), float(y2), float(x2)],  # Normalized 0-1
                    'score': float(scores[0][i]),
                    'class': int(classes[0][i])
                })
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # Convert to ms
        
        logger.info(f'Detection completed: {len(detections)} fish found in {processing_time:.2f}ms '
                   f'(processed: {processed_width}x{processed_height}, original: {original_width}x{original_height})')
        
        return jsonify({
            'success': True,
            'detections': detections,
            'processing_time_ms': round(processing_time, 2),
            'image_size': {
                'width': original_width, 
                'height': original_height,
                'processed_width': processed_width,
                'processed_height': processed_height
            }
        })
        
    except Exception as e:
        logger.error(f'Error in detect endpoint: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if app.debug else None
        }), 500

@app.route('/model/info', methods=['GET'])
def model_info():
    """Get model information"""
    return jsonify({
        'model_loaded': model_loaded,
        'model_path': MODEL_PATH,
        'model_exists': os.path.exists(MODEL_PATH) if MODEL_PATH else False,
        'confidence_threshold': CONFIDENCE_THRESHOLD,
        'max_image_size': MAX_IMAGE_SIZE
    })

if __name__ == '__main__':
    logger.info('=' * 50)
    logger.info('Fish Detection Server Starting...')
    logger.info(f'Python version: {sys.version.split()[0]}')
    logger.info(f'TensorFlow version: {TF_VERSION}')
    logger.info(f'Model path: {MODEL_PATH}')
    model_exists = os.path.exists(MODEL_PATH) if MODEL_PATH else False
    logger.info(f'Model exists: {model_exists}')
    if model_exists:
        model_size = os.path.getsize(MODEL_PATH) / (1024 * 1024)  # MB
        logger.info(f'Model size: {model_size:.2f} MB')
    logger.info(f'Confidence threshold: {CONFIDENCE_THRESHOLD}')
    logger.info(f'Max image size: {MAX_IMAGE_SIZE}')
    logger.info(f'Port: {PORT}')
    logger.info('=' * 50)
    
    # Load model on startup
    logger.info('Loading TensorFlow model...')
    if load_model():
        logger.info('=' * 50)
        logger.info(f'🚀 Server starting on http://0.0.0.0:{PORT}')
        logger.info('✅ Ready to accept requests!')
        logger.info('=' * 50)
        logger.info('Endpoints:')
        logger.info(f'  - POST http://localhost:{PORT}/detect')
        logger.info(f'  - GET  http://localhost:{PORT}/health')
        logger.info(f'  - GET  http://localhost:{PORT}/model/info')
        logger.info('=' * 50)
        app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
    else:
        logger.error('=' * 50)
        logger.error('❌ Failed to load model. Server not started.')
        logger.error('Please check:')
        logger.error(f'  1. Model file exists: {MODEL_PATH}')
        logger.error('  2. TensorFlow is installed correctly')
        logger.error('  3. Model format is correct (.pb frozen graph)')
        logger.error('  4. Run: python test_tensorflow.py to verify TensorFlow setup')
        logger.error('=' * 50)
        sys.exit(1)

