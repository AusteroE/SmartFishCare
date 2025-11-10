'use client';

import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

interface FishDetectionProps {
    harvestThreshold?: number;
    harvestWidthThreshold?: number;
    onWarningsUpdate?: (warnings: Array<{
        fishNumber: number;
        length: number;
        width: number;
        timestamp: number;
    }>) => void;
}

interface DetectionInfo {
    length: number | null;
    width: number | null;
    category: string | null;
    confidence: number | null;
}

interface FullDetectionInfo {
    length: number;
    width: number;
    category: string;
    confidence: number;
    x: number;
    y: number;
    fishType: 'tilapia' | 'other';
}

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
}

interface ServerStatus {
    server: 'online' | 'offline' | 'checking';
    camera: 'ready' | 'unknown' | 'not_initialized';
    model: 'loaded' | 'unknown' | 'not_loaded';
    fps: string;
}

export default function FishDetection({
    harvestThreshold: propHarvestThreshold,
    harvestWidthThreshold: propHarvestWidthThreshold,
    onWarningsUpdate,
}: FishDetectionProps) {
    const [serverStatus, setServerStatus] = useState<ServerStatus>({
        server: 'checking',
        camera: 'not_initialized',
        model: 'not_loaded',
        fps: '--',
    });
    const [detectionActive, setDetectionActive] = useState(false);
    const [detectionInfo, setDetectionInfo] = useState<DetectionInfo>({
        length: null,
        width: null,
        category: null,
        confidence: null,
    });
    const [allDetections, setAllDetections] = useState<FullDetectionInfo[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [detectionHistory, setDetectionHistory] = useState<Array<{
        id: number;
        detectedLength: number;
        detectedWidth: number;
        sizeCategory: string;
        confidenceScore: number | null;
        detectionTimestamp: string;
    }>>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [realTimeFishData, setRealTimeFishData] = useState<Array<{
        fishNumber: number;
        length: number;
        width: number;
        category: string;
        confidence: number;
        lastUpdate: number;
    }>>([]);

    // Use props if provided, otherwise load from localStorage (reactive to prop changes)
    const [harvestThreshold, setHarvestThreshold] = useState<number>(() => {
        if (propHarvestThreshold !== undefined) return propHarvestThreshold;
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('fish_harvest_threshold');
            return saved ? parseFloat(saved) : 15.0;
        }
        return 15.0;
    });

    const [harvestWidthThreshold, setHarvestWidthThreshold] = useState<number>(() => {
        if (propHarvestWidthThreshold !== undefined) return propHarvestWidthThreshold;
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('fish_harvest_width_threshold');
            return saved ? parseFloat(saved) : 5.0;
        }
        return 5.0;
    });

    // Update thresholds when props change
    useEffect(() => {
        if (propHarvestThreshold !== undefined) {
            setHarvestThreshold(propHarvestThreshold);
        }
        if (propHarvestWidthThreshold !== undefined) {
            setHarvestWidthThreshold(propHarvestWidthThreshold);
        }
    }, [propHarvestThreshold, propHarvestWidthThreshold]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const modelRef = useRef<tf.GraphModel | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const useMLModelRef = useRef(false);
    const modelLoadingRef = useRef(false);
    const fpsCounterRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: Date.now() });
    const isRunningRef = useRef(false);
    const previousFrameRef = useRef<ImageData | null>(null);
    const detectionHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
    const frameSkipCounterRef = useRef(0);
    const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const lastSavedDetectionRef = useRef<{ length: number; width: number; category: string; time: number } | null>(null);
    const lastDetectionTimeRef = useRef<number>(0);
    const currentDetectionsRef = useRef<Array<{ x: number; y: number; width: number; height: number; color: string; label: string; isTilapia?: boolean; confidence?: number; id?: number }>>([]);
    const lastSmsSentRef = useRef<number>(0);
    const userPhoneRef = useRef<string | null>(null);
    const lastLargeFishSavedRef = useRef<number>(0);

    // Tracking system for real-time bounding box persistence
    interface TrackedFish {
        id: number;
        x: number;
        y: number;
        width: number;
        height: number;
        color: string;
        label: string;
        isTilapia: boolean;
        confidence: number;
        lastSeen: number;
        age: number;
        velocityX: number;
        velocityY: number;
        length: number;
        width_cm: number;
        category: string;
    }
    const trackedFishesRef = useRef<Map<number, TrackedFish>>(new Map());
    const nextTrackIdRef = useRef<number>(1);
    const maxTrackAge = 15;
    const trackSmoothingFactor = 0.7;

    // Initialize TensorFlow.js and load model
    useEffect(() => {
        initializeModel();
        fetchUserPhone();
        return () => {
            stopDetection();
            cleanup();
        };
    }, []);

    // Fetch user phone number from profile
    const fetchUserPhone = async () => {
        try {
            const response = await fetch('/api/user/me', {
                credentials: 'include',
            });
            const data = await response.json();
            if (data.success && data.user?.phone_number) {
                userPhoneRef.current = data.user.phone_number;
                console.log('Phone number loaded from profile:', data.user.phone_number);
            } else {
                console.log('No phone number found in profile');
                userPhoneRef.current = null;
            }
        } catch (error) {
            console.error('Error fetching user phone:', error);
            userPhoneRef.current = null;
        }
    };

    // Send SMS notification for large fish detection
    const sendSmsNotification = async (category: string, length: number, width: number) => {
        if (category !== 'Large') {
            return;
        }

        const now = Date.now();
        if (lastSmsSentRef.current && (now - lastSmsSentRef.current) < 2 * 60 * 1000) {
            return;
        }

        const message = `Large fish detected! ${length.toFixed(1)}cm x ${width.toFixed(1)}cm`;
        const truncatedMessage = message.length > 50 ? message.substring(0, 47) + '...' : message;

        try {
            const response = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: truncatedMessage,
                    phoneNumber: userPhoneRef.current || undefined,
                }),
            });

            const data = await response.json();
            if (data.success) {
                lastSmsSentRef.current = now;
                console.log('SMS notification sent successfully');
            } else {
                console.error('SMS send failed:', data.message);
            }
        } catch (error) {
            console.error('Error sending SMS:', error);
        }
    };

    const initializeModel = async () => {
        try {
            setServerStatus(prev => ({ ...prev, model: 'not_loaded', server: 'checking' }));
            await tf.setBackend('webgl');
            await tf.ready();

            // Check if Python backend is available
            try {
                const healthResponse = await fetch('http://localhost:5000/health', {
                    method: 'GET',
                    signal: AbortSignal.timeout(2000),
                });

                if (healthResponse.ok) {
                    const healthData = await healthResponse.json();
                    if (healthData.model_loaded) {
                        useMLModelRef.current = true;
                        console.log('✅ Python TensorFlow server available and model loaded!');
                        setServerStatus(prev => ({ ...prev, model: 'loaded', server: 'online' }));
                        setErrorMessage(null);
                        modelLoadingRef.current = false;
                        return;
                    } else {
                        console.log('Python server available but model not loaded');
                    }
                }
            } catch (error) {
                console.log('Python server not available, checking for TensorFlow.js model...');
            }

            // Fallback: Try to load TensorFlow.js model
            if (!modelLoadingRef.current) {
                modelLoadingRef.current = true;
                try {
                    console.log('Attempting to load TensorFlow.js fish detection model...');
                    const modelUrl = '/models/fish-detection-tfjs/model.json';

                    const modelCheck = await fetch(modelUrl, { method: 'HEAD' });
                    if (modelCheck.ok) {
                        const model = await tf.loadGraphModel(modelUrl);
                        modelRef.current = model;
                        useMLModelRef.current = true;
                        console.log('✅ TensorFlow.js fish detection model loaded successfully!');
                        setServerStatus(prev => ({ ...prev, model: 'loaded', server: 'online' }));
                        setErrorMessage(null);
                        modelLoadingRef.current = false;
                        return;
                    } else {
                        console.log('TensorFlow.js model not found, using custom detection');
                    }
                } catch (modelError: any) {
                    console.log('TensorFlow.js model not available:', modelError.message);
                    console.log('Using optimized custom fish detection (works well for real-time)');
                }
                modelLoadingRef.current = false;
            }

            // Fallback to custom detection
            modelRef.current = null;
            useMLModelRef.current = false;
            setServerStatus(prev => ({ ...prev, model: 'loaded', server: 'online' }));
            setErrorMessage(null);
            console.log('TensorFlow.js initialized - using optimized custom fish detection');
        } catch (error) {
            console.error('Model initialization error:', error);
            modelRef.current = null;
            useMLModelRef.current = false;
            modelLoadingRef.current = false;
            setServerStatus(prev => ({ ...prev, model: 'not_loaded', server: 'offline' }));
            setErrorMessage('Failed to initialize detection model. Using custom detection fallback.');
        }
    };

    const startDetection = async () => {
        try {
            setErrorMessage(null);
            setServerStatus(prev => ({ ...prev, camera: 'not_initialized' }));

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported in this browser');
            }

            let stream: MediaStream | null = null;
            const constraints = [
                { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' } },
                { video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'environment' } },
                { video: { facingMode: 'environment' } },
                { video: true }
            ];

            for (const constraint of constraints) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraint);
                    break;
                } catch (err) {
                    if (constraint === constraints[constraints.length - 1]) throw err;
                    continue;
                }
            }

            if (!stream) {
                throw new Error('Failed to access camera');
            }

            let retries = 0;
            while (!videoRef.current && retries < 20) {
                await new Promise(resolve => setTimeout(resolve, 50));
                retries++;
            }

            if (!videoRef.current) {
                stream.getTracks().forEach(track => track.stop());
                throw new Error('Video element not available');
            }

            const video = videoRef.current;

            video.srcObject = stream;
            streamRef.current = stream;

            video.style.cssText = `
        position: absolute;
        opacity: 0.01;
        pointer-events: none;
        width: 640px;
        height: 480px;
        top: 0;
        left: 0;
        z-index: -1;
        object-fit: cover;
      `;

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    cleanupListeners();
                    reject(new Error('Timeout waiting for video'));
                }, 10000);

                const cleanupListeners = () => {
                    clearTimeout(timeout);
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    video.removeEventListener('playing', onPlaying);
                    video.removeEventListener('error', onError);
                };

                const onLoadedMetadata = () => {
                    console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
                };

                const onPlaying = () => {
                    console.log('Video is playing');
                    if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
                        cleanupListeners();
                        resolve();
                    }
                };

                const onError = (e: Event) => {
                    console.error('Video error:', e);
                    cleanupListeners();
                    reject(new Error('Video failed to load'));
                };

                video.addEventListener('loadedmetadata', onLoadedMetadata);
                video.addEventListener('playing', onPlaying);
                video.addEventListener('error', onError);

                video.play()
                    .then(() => {
                        setTimeout(() => {
                            if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
                                cleanupListeners();
                                resolve();
                            }
                        }, 500);
                    })
                    .catch((err) => {
                        cleanupListeners();
                        reject(err);
                    });
            });

            setServerStatus(prev => ({ ...prev, camera: 'ready' }));
            setDetectionActive(true);
            setErrorMessage(null);

            if (canvasRef.current) {
                canvasRef.current.style.display = 'block';
                canvasRef.current.style.visibility = 'visible';
                canvasRef.current.style.opacity = '1';
            }

            setTimeout(() => {
                console.log('Starting detection loop, detectionActive:', detectionActive);
                startDetectionLoop();
            }, 300);
        } catch (error: any) {
            console.error('Camera access error:', error);
            let errorMsg = 'Failed to access camera. ';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMsg += 'Please grant camera permissions.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMsg += 'No camera found.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMsg += 'Camera is already in use.';
            } else {
                errorMsg += error.message || 'Please check your camera.';
            }
            setErrorMessage(errorMsg);
            setServerStatus(prev => ({ ...prev, camera: 'not_initialized' }));

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
    };

    const stopDetection = () => {
        console.log('Stopping detection...');
        isRunningRef.current = false;
        setDetectionActive(false);

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        previousFrameRef.current = null;
        detectionHistoryRef.current = [];
        currentDetectionsRef.current = [];
        trackedFishesRef.current.clear();
        nextTrackIdRef.current = 1;
    };

    const cleanup = () => {
        stopDetection();
        if (modelRef.current) {
            modelRef.current.dispose();
            modelRef.current = null;
            useMLModelRef.current = false;
        }
        modelLoadingRef.current = false;
    };

    const classifyFishSize = (length: number, width: number): string => {
        if (length <= 5 && width <= 2) return 'Small';
        if (length <= 10 && width <= 4) return 'Medium';
        return 'Large';
    };

    const startDetectionLoop = () => {
        console.log('startDetectionLoop called, isRunningRef:', isRunningRef.current);

        if (isRunningRef.current) {
            console.log('Loop already running, cancelling previous');
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }

        isRunningRef.current = true;
        frameSkipCounterRef.current = 0;
        lastDetectionTimeRef.current = 0;

        // Create offscreen canvas for processing (smaller resolution for performance)
        if (!processingCanvasRef.current) {
            processingCanvasRef.current = document.createElement('canvas');
        }

        const detect = async () => {
            // Use ref to check state instead of closure variable
            if (!isRunningRef.current || !videoRef.current || !canvasRef.current) {
                console.log('Stopping loop - isRunning:', isRunningRef.current, 'video:', !!videoRef.current, 'canvas:', !!canvasRef.current);
                isRunningRef.current = false;
                animationFrameRef.current = null;
                return;
            }

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: false }); // Optimize context

            if (!ctx) {
                animationFrameRef.current = requestAnimationFrame(detect);
                return;
            }

            // Ensure canvas is visible
            if (canvas.style.display === 'none') {
                canvas.style.display = 'block';
            }

            // Check video state
            if (video.readyState >= video.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
                // Set canvas dimensions
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    console.log('Canvas dimensions set:', video.videoWidth, 'x', video.videoHeight);
                }

                // Draw video frame immediately (smooth display)
                try {
                    // Clear canvas before drawing new frame
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Draw bounding boxes on every frame (persist between detection runs)
                    if (currentDetectionsRef.current.length > 0) {
                        currentDetectionsRef.current.forEach((detection) => {
                            // Ensure coordinates are within canvas bounds
                            const x = Math.max(0, Math.min(detection.x, canvas.width - 1));
                            const y = Math.max(0, Math.min(detection.y, canvas.height - 1));
                            const width = Math.max(1, Math.min(detection.width, canvas.width - x));
                            const height = Math.max(1, Math.min(detection.height, canvas.height - y));

                            // Draw bounding box with rounded corners effect
                            ctx.strokeStyle = detection.color;
                            ctx.lineWidth = detection.isTilapia ? 4 : 3;
                            ctx.setLineDash([]);

                            // Draw main rectangle
                            ctx.strokeRect(x, y, width, height);

                            // Draw corner markers for better visibility
                            const cornerSize = 12;
                            ctx.lineWidth = detection.isTilapia ? 3 : 2;

                            // Top-left corner
                            ctx.beginPath();
                            ctx.moveTo(x, y + cornerSize);
                            ctx.lineTo(x, y);
                            ctx.lineTo(x + cornerSize, y);
                            ctx.stroke();

                            // Top-right corner
                            ctx.beginPath();
                            ctx.moveTo(x + width - cornerSize, y);
                            ctx.lineTo(x + width, y);
                            ctx.lineTo(x + width, y + cornerSize);
                            ctx.stroke();

                            // Bottom-left corner
                            ctx.beginPath();
                            ctx.moveTo(x, y + height - cornerSize);
                            ctx.lineTo(x, y + height);
                            ctx.lineTo(x + cornerSize, y + height);
                            ctx.stroke();

                            // Bottom-right corner
                            ctx.beginPath();
                            ctx.moveTo(x + width - cornerSize, y + height);
                            ctx.lineTo(x + width, y + height);
                            ctx.lineTo(x + width, y + height - cornerSize);
                            ctx.stroke();

                            // Draw label background with better visibility
                            ctx.font = 'bold 14px Arial';
                            const textMetrics = ctx.measureText(detection.label);
                            const labelHeight = 20;
                            const labelY = Math.max(labelHeight + 2, y);

                            // Semi-transparent background for label
                            ctx.fillStyle = detection.color;
                            ctx.globalAlpha = 0.85;
                            ctx.fillRect(x, labelY - labelHeight - 2, textMetrics.width + 8, labelHeight);
                            ctx.globalAlpha = 1.0;

                            // Draw label text with better contrast
                            ctx.fillStyle = '#FFFFFF';
                            ctx.font = 'bold 13px Arial';
                            ctx.fillText(detection.label, x + 4, labelY - 6);
                        });
                    }

                    // Update FPS
                    fpsCounterRef.current.count++;
                    const now = Date.now();
                    if (now - fpsCounterRef.current.lastTime >= 1000) {
                        setServerStatus(prev => ({ ...prev, fps: fpsCounterRef.current.count.toString() }));
                        fpsCounterRef.current.count = 0;
                        fpsCounterRef.current.lastTime = now;
                    }

                    // REAL-TIME: Process every 3rd frame for better performance (reduced from every 2nd)
                    frameSkipCounterRef.current++;
                    const shouldProcess = frameSkipCounterRef.current % 3 === 0; // Process every 3rd frame
                    const timeSinceLastDetection = now - lastDetectionTimeRef.current;
                    const minDetectionInterval = 100; // Minimum 100ms between detections (~10 FPS for performance)

                    if (shouldProcess && timeSinceLastDetection >= minDetectionInterval) {
                        lastDetectionTimeRef.current = now;

                        // Use smaller resolution for processing to improve performance
                        const processScale = 0.5; // Process at 50% resolution for better performance
                        const processWidth = Math.floor(canvas.width * processScale);
                        const processHeight = Math.floor(canvas.height * processScale);

                        // Use offscreen canvas for processing
                        const processCanvas = processingCanvasRef.current;
                        if (processCanvas && (processCanvas.width !== processWidth || processCanvas.height !== processHeight)) {
                            processCanvas.width = processWidth;
                            processCanvas.height = processHeight;
                        }

                        if (processCanvas) {
                            const processCtx = processCanvas.getContext('2d', { willReadFrequently: false });
                            if (processCtx) {
                                try {
                                    // Draw video frame to processing canvas
                                    processCtx.drawImage(video, 0, 0, processWidth, processHeight);

                                    // Use Python backend (preferred) or TensorFlow.js model if available, otherwise use custom detection
                                    const detectionStartTime = performance.now();
                                    const imageData = processCtx.getImageData(0, 0, processWidth, processHeight);
                                    let detections: BoundingBox[] = [];

                                    // Note: The actual detection functions (detectFishWithPythonBackend, detectFishWithTensorFlowJS, detectFishInFrame)
                                    // and helper functions (isTilapia, matchDetectionsToTracks, updateTracks) need to be implemented
                                    // For now, this is a placeholder that will need the full implementation
                                    console.warn('Detection functions not yet implemented in FishDetection.tsx');

                                    // Continue loop immediately (smooth video display)
                                    animationFrameRef.current = requestAnimationFrame(detect);
                                } catch (detectionError) {
                                    console.error('Detection error:', detectionError);
                                    // Continue rendering even if detection fails
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Draw error:', error);
                }
            } else {
                // Video not ready, continue loop
            }

            // Continue loop immediately (smooth video display)
            animationFrameRef.current = requestAnimationFrame(detect);
        };

        // Start immediately
        animationFrameRef.current = requestAnimationFrame(detect);
    };

    return (
        <div className="w-full space-y-4 sm:space-y-6">
            {/* Status Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-black/30 rounded-lg border border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <i className="fas fa-server text-sm sm:text-base text-[#888]"></i>
                    <span className="text-[#e6e9ef]">
                        <span className="hidden sm:inline">Server: </span>
                        <span className={`font-semibold ${serverStatus.server === 'online' ? 'text-green-500' : serverStatus.server === 'offline' ? 'text-red-500' : 'text-yellow-400'}`}>
                            {serverStatus.server === 'online' ? 'Online' : serverStatus.server === 'offline' ? 'Offline' : 'Checking...'}
                        </span>
                    </span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <i className="fas fa-video text-sm sm:text-base text-[#888]"></i>
                    <span className="text-[#e6e9ef]">
                        <span className="hidden sm:inline">Camera: </span>
                        <span className={`font-semibold ${serverStatus.camera === 'ready' ? 'text-green-500' : serverStatus.camera === 'unknown' ? 'text-red-500' : 'text-yellow-400'}`}>
                            {serverStatus.camera === 'ready' ? 'Ready' : serverStatus.camera === 'unknown' ? 'Unknown' : 'Not initialized'}
                        </span>
                    </span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <i className="fas fa-brain text-sm sm:text-base text-[#888]"></i>
                    <span className="text-[#e6e9ef]">
                        <span className="hidden sm:inline">Model: </span>
                        <span className={`font-semibold ${serverStatus.model === 'loaded' ? 'text-green-500' : serverStatus.model === 'unknown' ? 'text-red-500' : 'text-yellow-400'}`}>
                            {serverStatus.model === 'loaded' ? 'Loaded' : serverStatus.model === 'unknown' ? 'Unknown' : 'Not loaded'}
                        </span>
                    </span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <i className="fas fa-tachometer-alt text-sm sm:text-base text-[#888]"></i>
                    <span className="text-[#e6e9ef]">
                        FPS: <span className="font-semibold text-yellow-400">{serverStatus.fps}</span>
                    </span>
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <button
                    className={`px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-bold border-none rounded-lg cursor-pointer transition-all duration-300 uppercase tracking-wider text-white ${detectionActive
                        ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.3)]'
                        : 'bg-gradient-to-br from-green-500 to-green-600 shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(34,197,94,0.4)]'
                        } ${serverStatus.model !== 'loaded' ? 'opacity-60 cursor-not-allowed shadow-none' : ''}`}
                    onClick={detectionActive ? stopDetection : startDetection}
                    disabled={serverStatus.model !== 'loaded'}
                >
                    <i className={`fas ${detectionActive ? 'fa-stop' : 'fa-play'} mr-2`}></i>
                    {detectionActive ? 'STOP DETECTION' : 'START DETECTION'}
                </button>
                <button
                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold border-2 border-blue-500/50 rounded-lg cursor-pointer transition-all duration-300 bg-white/5 text-blue-500 backdrop-blur-sm hover:bg-blue-500/10 hover:border-blue-500 hover:-translate-y-0.5"
                    onClick={() => setHistoryOpen(true)}
                >
                    <i className="fas fa-history mr-2"></i> History
                </button>
                <button
                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold border-2 border-green-500/50 rounded-lg cursor-pointer transition-all duration-300 bg-white/5 text-green-500 backdrop-blur-sm hover:bg-green-500/10 hover:border-green-500 hover:-translate-y-0.5"
                    onClick={() => {
                        const container = document.getElementById('camera-feed-container');
                        if (!fullscreen && container?.requestFullscreen) {
                            container.requestFullscreen();
                            setFullscreen(true);
                        } else if (fullscreen && document.exitFullscreen) {
                            document.exitFullscreen();
                            setFullscreen(false);
                        }
                    }}
                >
                    <i className={`fas ${fullscreen ? 'fa-compress' : 'fa-expand'} mr-2`}></i> Fullscreen
                </button>
            </div>

            {errorMessage && (
                <div className="text-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm font-semibold">
                    <span className="text-base mr-2">⚠️</span>
                    <span className="text-red-500">{errorMessage}</span>
                </div>
            )}

            {/* Camera Feed */}
            <div id="camera-feed-container" className="relative bg-black rounded-lg overflow-hidden min-h-[300px] sm:min-h-[400px] md:min-h-[500px] flex items-center justify-center border-2 border-white/10">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute opacity-0 pointer-events-none w-[640px] h-[480px] top-0 left-0 -z-10 block"
                />
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full object-contain bg-black relative z-10 ${detectionActive ? 'block' : 'hidden'}`}
                    style={{ imageRendering: 'auto' }}
                />
                {!detectionActive && (
                    <div className="text-[#888] text-center p-4 sm:p-6">
                        <i className="fas fa-video-slash text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 text-[#555]"></i>
                        <p className="text-sm sm:text-base mb-1">Click &quot;Start Detection&quot; to begin</p>
                        <small className="text-xs text-[#666]">Camera access will be requested</small>
                    </div>
                )}
            </div>

            {/* Real-Time Detection Data */}
            <div className="p-4 sm:p-5 bg-black/30 rounded-lg border border-white/10">
                <h4 className="mb-4 text-base sm:text-lg text-[#e6e9ef] flex items-center gap-2 flex-wrap">
                    <i className="fas fa-chart-line text-blue-500"></i> Real-Time Detection
                    {allDetections.length > 0 && (
                        <span className="ml-1 text-xs sm:text-sm text-yellow-400 font-semibold">
                            ({allDetections.length} {allDetections.length === 1 ? 'fish' : 'fish'} detected)
                        </span>
                    )}
                </h4>

                {/* Show all detected fish in real-time */}
                {allDetections.length > 0 && (
                    <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/5">
                        <div className="text-sm text-[#888] mb-3 font-semibold uppercase tracking-wider">
                            Real-Time Fish Data ({allDetections.length} {allDetections.length === 1 ? 'fish' : 'fish'}):
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {allDetections.map((det, idx) => {
                                const isTilapia = det.fishType === 'tilapia';
                                const boxColor = isTilapia ? '#00ff00' : '#808080';
                                const fishNumber = idx + 1;
                                const exceedsLengthThreshold = det.length >= harvestThreshold;
                                const exceedsWidthThreshold = det.width >= harvestWidthThreshold;
                                const exceedsThreshold = exceedsLengthThreshold || exceedsWidthThreshold;

                                return (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded border text-sm transition-all ${exceedsThreshold
                                            ? 'bg-red-500/10 border-red-500/40 ring-2 ring-red-500/30'
                                            : 'bg-white/3 border-white/5'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: boxColor }}
                                            ></div>
                                            <span className="font-semibold text-[#e6e9ef]">
                                                Fish {fishNumber}
                                            </span>
                                            {exceedsThreshold && (
                                                <span className="ml-auto px-2 py-1 bg-red-500/30 text-red-300 rounded text-xs font-bold animate-pulse">
                                                    ⚠️ HARVEST
                                                </span>
                                            )}
                                        </div>
                                        <div className={`${exceedsThreshold ? 'text-red-200 font-semibold' : 'text-[#888]'}`}>
                                            L: {det.length.toFixed(2)}cm × W: {det.width.toFixed(2)}cm
                                        </div>
                                        <div className="text-[#888]">
                                            {det.category} ({det.confidence.toFixed(1)}%)
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Detection Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 p-3 bg-white/3 rounded-lg border border-white/5">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg text-base text-blue-500 shrink-0">
                            <i className="fas fa-ruler-horizontal"></i>
                        </div>
                        <div className="flex-1 flex flex-col gap-0 min-w-0">
                            <span className="text-xs uppercase text-[#888] font-semibold tracking-wider">Length</span>
                            <span className="text-base md:text-lg font-bold text-[#e6e9ef]">{detectionInfo.length?.toFixed(2) || '--'}</span>
                            <span className="text-xs text-[#888]">cm</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white/3 rounded-lg border border-white/5">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg text-base text-blue-500 shrink-0">
                            <i className="fas fa-ruler-vertical"></i>
                        </div>
                        <div className="flex-1 flex flex-col gap-0 min-w-0">
                            <span className="text-xs uppercase text-[#888] font-semibold tracking-wider">Width</span>
                            <span className="text-base md:text-lg font-bold text-[#e6e9ef]">{detectionInfo.width?.toFixed(2) || '--'}</span>
                            <span className="text-xs text-[#888]">cm</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white/3 rounded-lg border border-white/5">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg text-base shrink-0 ${detectionInfo.category?.toLowerCase() === 'small' ? 'bg-green-500/10 text-green-500' :
                            detectionInfo.category?.toLowerCase() === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                                detectionInfo.category?.toLowerCase() === 'large' ? 'bg-red-500/10 text-red-500' :
                                    'bg-blue-500/10 text-blue-500'
                            }`}>
                            <i className="fas fa-fish"></i>
                        </div>
                        <div className="flex-1 flex flex-col gap-0 min-w-0">
                            <span className="text-xs uppercase text-[#888] font-semibold tracking-wider">Category</span>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${detectionInfo.category?.toLowerCase() === 'small' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                                detectionInfo.category?.toLowerCase() === 'medium' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                    detectionInfo.category?.toLowerCase() === 'large' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                                        'text-[#e6e9ef]'
                                }`}>
                                {detectionInfo.category || '--'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white/3 rounded-lg border border-white/5">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg text-base text-blue-500 shrink-0">
                            <i className="fas fa-percentage"></i>
                        </div>
                        <div className="flex-1 flex flex-col gap-0 min-w-0">
                            <span className="text-xs uppercase text-[#888] font-semibold tracking-wider">Confidence</span>
                            <span className="text-base md:text-lg font-bold text-[#e6e9ef]">{detectionInfo.confidence?.toFixed(1) || '--'}</span>
                            <span className="text-xs text-[#888]">%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Modal - Keep this as a modal */}
            {historyOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/70 z-[10000]"
                        onClick={() => setHistoryOpen(false)}
                    ></div>
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[800px] w-[90%] max-h-[85vh] rounded-2xl bg-gradient-to-b from-white/8 to-white/3 border border-white/14 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] z-[10001] overflow-y-auto text-[#e6e9ef] p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-xl md:text-2xl font-bold text-[#e6e9ef]">
                                    <i className="fas fa-history text-blue-500 mr-2"></i> Detection History
                                </h3>
                                <p className="text-sm text-[#888] mt-1">
                                    {detectionActive
                                        ? `Real-time data: ${detectionHistory.length} ${detectionHistory.length === 1 ? 'fish' : 'fish'} currently detected`
                                        : 'Latest detections from database'
                                    }
                                    {detectionActive && <span className="text-green-400 ml-2">● Live</span>}
                                </p>
                            </div>
                            <button
                                className="bg-white/10 border-none text-[#e6e9ef] text-3xl w-10 h-10 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center hover:bg-white/20"
                                onClick={() => setHistoryOpen(false)}
                                aria-label="Close history"
                            >
                                &times;
                            </button>
                        </div>

                        {loadingHistory ? (
                            <div className="text-center py-16">
                                <i className="fas fa-spinner fa-spin text-4xl text-blue-500 mb-3"></i>
                                <p className="text-base text-[#a2a8b6]">Loading history...</p>
                            </div>
                        ) : detectionHistory.length === 0 ? (
                            <div className="text-center py-16">
                                <i className="fas fa-inbox text-5xl text-[#555] mb-4"></i>
                                <p className="text-base text-[#a2a8b6]">No detection history yet</p>
                                <p className="text-sm text-[#888] mt-2">Start detecting fish to see history here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {detectionHistory.map((detection) => {
                                    const exceedsLengthThreshold = parseFloat(detection.detectedLength.toString()) >= harvestThreshold;
                                    const exceedsWidthThreshold = parseFloat(detection.detectedWidth.toString()) >= harvestWidthThreshold;
                                    const exceedsThreshold = exceedsLengthThreshold || exceedsWidthThreshold;

                                    return (
                                        <div
                                            key={detection.id}
                                            className={`p-4 rounded-lg border transition-colors ${exceedsThreshold
                                                ? 'bg-red-500/10 border-red-500/40 ring-2 ring-red-500/30'
                                                : 'bg-black/30 border-white/10 hover:bg-black/40'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <div className={`w-3 h-3 rounded-full shrink-0 ${detection.sizeCategory === 'Small' ? 'bg-green-500' :
                                                            detection.sizeCategory === 'Medium' ? 'bg-yellow-500' :
                                                                'bg-red-500'
                                                            }`}></div>
                                                        <span className="font-semibold text-base text-[#e6e9ef]">
                                                            Fish {detection.id}
                                                        </span>
                                                        {exceedsThreshold && (
                                                            <span className="px-2 py-1 bg-red-500/30 text-red-300 rounded text-xs font-bold animate-pulse">
                                                                ⚠️ READY FOR HARVEST
                                                            </span>
                                                        )}
                                                        {detection.confidenceScore !== null && (
                                                            <span className="text-xs text-[#888] whitespace-nowrap">
                                                                ({(parseFloat(detection.confidenceScore.toString()) * 100).toFixed(1)}% confidence)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                                        <div>
                                                            <span className="text-[#888]">Length: </span>
                                                            <span className={`font-semibold ${exceedsLengthThreshold ? 'text-red-300' : 'text-[#e6e9ef]'}`}>
                                                                {parseFloat(detection.detectedLength.toString()).toFixed(2)} cm
                                                                {exceedsLengthThreshold && (
                                                                    <span className="ml-1 text-red-400">⚠️</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[#888]">Width: </span>
                                                            <span className={`font-semibold ${exceedsWidthThreshold ? 'text-red-300' : 'text-[#e6e9ef]'}`}>
                                                                {parseFloat(detection.detectedWidth.toString()).toFixed(2)} cm
                                                                {exceedsWidthThreshold && (
                                                                    <span className="ml-1 text-red-400">⚠️</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[#888]">Category: </span>
                                                            <span className="font-semibold text-[#e6e9ef]">
                                                                {detection.sizeCategory}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[#888]">Time: </span>
                                                            <span className="font-semibold text-[#e6e9ef]">
                                                                {new Date(detection.detectionTimestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {exceedsThreshold && (
                                                        <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-200">
                                                            <i className="fas fa-exclamation-triangle mr-1"></i>
                                                            This fish exceeds the harvest threshold
                                                            {exceedsLengthThreshold && (
                                                                <span> (Length: {harvestThreshold}cm, exceeded by {(parseFloat(detection.detectedLength.toString()) - harvestThreshold).toFixed(2)}cm)</span>
                                                            )}
                                                            {exceedsWidthThreshold && (
                                                                <span> (Width: {harvestWidthThreshold}cm, exceeded by {(parseFloat(detection.detectedWidth.toString()) - harvestWidthThreshold).toFixed(2)}cm)</span>
                                                            )}.
                                                            Consider harvesting soon.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

