import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

/**
 * Server-side fish detection API endpoint
 * This endpoint can be used with TensorFlow models (including the kwea123/fish_detection model)
 * 
 * The model from https://github.com/kwea123/fish_detection uses:
 * - Faster R-CNN Inception V2
 * - TensorFlow Object Detection API
 * - Trained on Open Images Dataset (24,403 fish bounding boxes)
 * 
 * To use this endpoint:
 * 1. Download the model from the repository
 * 2. Convert it to TensorFlow.js format OR
 * 3. Set up a Python backend to run the .pb model
 * 
 * For now, this endpoint provides a placeholder that can be extended
 * to use the actual TensorFlow model.
 */

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { imageData, width, height } = body;

        if (!imageData || !width || !height) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields: imageData, width, height' },
                { status: 400 }
            );
        }

        // Call Python backend (optimized for TensorFlow 1.x .pb models)
        const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5000';

        try {
            const startTime = Date.now();
            const response = await fetch(`${pythonBackendUrl}/detect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageData: imageData,
                }),
                // Timeout for web optimization
                signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            if (response.ok) {
                const result = await response.json();
                const totalTime = Date.now() - startTime;
                console.log(`Python backend detection: ${result.detections?.length || 0} fish in ${totalTime}ms`);
                return NextResponse.json(result);
            } else {
                const errorText = await response.text();
                console.warn(`Python backend error (${response.status}):`, errorText);
                throw new Error(`Backend returned ${response.status}`);
            }
        } catch (error: any) {
            // Log error but don't fail - fallback to custom detection
            if (error.name === 'AbortError') {
                console.warn('Python backend timeout - using fallback');
            } else {
                console.warn('Python backend not available - using fallback:', error.message);
            }
        }

        // Fallback: Return empty detections (client will use custom detection)
        // The client will automatically use custom detection if Python backend is not available
        return NextResponse.json({
            success: false,
            message: 'Python backend not available. Client will use custom detection. See docs/PYTHON_SERVER_QUICKSTART.md for setup.',
            detections: [],
        });

        /* 
        // Example implementation with TensorFlow.js Node.js backend:
        // 
        // import * as tf from '@tensorflow/tfjs-node';
        // import * as fs from 'fs';
        // import * as path from 'path';
        // 
        // // Load the converted TensorFlow.js model
        // const modelPath = path.join(process.cwd(), 'public', 'models', 'fish-detection-model');
        // const model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
        // 
        // // Preprocess image data
        // const imageTensor = tf.browser.fromPixels(imageData);
        // const resized = tf.image.resizeBilinear(imageTensor, [640, 640]);
        // const normalized = resized.div(255.0);
        // const batched = normalized.expandDims(0);
        // 
        // // Run inference
        // const predictions = await model.predict(batched) as tf.Tensor;
        // const detections = await predictions.array();
        // 
        // // Post-process detections (NMS, scale boxes, etc.)
        // const processedDetections = processDetections(detections, width, height);
        // 
        // return NextResponse.json({
        //   success: true,
        //   detections: processedDetections,
        // });
        */

    } catch (error: any) {
        console.error('Fish detection API error:', error);
        return NextResponse.json(
            { success: false, message: 'Error: ' + error.message, detections: [] },
            { status: 500 }
        );
    }
}

