'use client';

import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
// NOTE: COCO-SSD is installed but not used - it doesn't detect fish
// import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface FishDetectionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
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

export default function FishDetectionModal({
  isOpen = true,
  onClose,
  harvestThreshold: propHarvestThreshold,
  harvestWidthThreshold: propHarvestWidthThreshold,
  onWarningsUpdate,
}: FishDetectionModalProps) {
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
  const modelRef = useRef<tf.GraphModel | null>(null); // TensorFlow.js fish detection model
  const animationFrameRef = useRef<number | null>(null);
  const useMLModelRef = useRef(false); // Use TensorFlow.js model if loaded
  const modelLoadingRef = useRef(false); // Prevent multiple simultaneous loads
  const fpsCounterRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: Date.now() });
  const isRunningRef = useRef(false); // Track if loop is actually running
  const previousFrameRef = useRef<ImageData | null>(null); // For motion detection
  const detectionHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]); // Track detection positions
  const frameSkipCounterRef = useRef(0); // Skip frames for performance
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null); // Offscreen canvas for processing
  const lastSavedDetectionRef = useRef<{ length: number; width: number; category: string; time: number } | null>(null); // Track last saved detection to prevent duplicates
  const lastDetectionTimeRef = useRef<number>(0); // Throttle detections
  const currentDetectionsRef = useRef<Array<{ x: number; y: number; width: number; height: number; color: string; label: string; isTilapia?: boolean; confidence?: number; id?: number }>>([]); // Store current detections for drawing
  const lastSmsSentRef = useRef<number>(0); // Track last SMS send time for throttling
  const userPhoneRef = useRef<string | null>(null); // Store user phone number
  const lastLargeFishSavedRef = useRef<number>(0); // Track last time a large fish was saved to history (10-second cooldown)

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
    age: number; // Frames since first detection
    velocityX: number;
    velocityY: number;
    length: number; // Real-time length in cm
    width_cm: number; // Real-time width in cm
    category: string; // Real-time category
  }
  const trackedFishesRef = useRef<Map<number, TrackedFish>>(new Map());
  const nextTrackIdRef = useRef<number>(1);
  const maxTrackAge = 15; // Maximum frames to keep a track without detection
  const trackSmoothingFactor = 0.7; // Smoothing factor for position updates (0-1, higher = more smoothing)

  // Initialize TensorFlow.js and load model
  useEffect(() => {
      initializeModel();
      // Fetch user phone number for SMS notifications
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
    // Only send for large fish
    if (category !== 'Large') {
      return;
    }

    // Check throttle (2 minutes)
    const now = Date.now();
    if (lastSmsSentRef.current && (now - lastSmsSentRef.current) < 2 * 60 * 1000) {
      return; // Skip, still in throttle period
    }

    // Create SMS message (max 50 characters)
    const message = `Large fish detected! ${length.toFixed(1)}cm x ${width.toFixed(1)}cm`;
    const truncatedMessage = message.length > 50 ? message.substring(0, 47) + '...' : message;

    try {
      // Send SMS - phone number will be handled by API (from env or user profile)
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: truncatedMessage,
          // Phone number is optional - API will use DEFAULT_PHONE_NUMBER from env if not provided
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

      // Check if Python backend is available (preferred for TensorFlow models)
      // Python backend is optimized and easier to set up than TensorFlow.js conversion
      try {
        const healthResponse = await fetch('http://localhost:5000/health', {
          method: 'GET',
          signal: AbortSignal.timeout(2000), // 2 second timeout
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

      // Fallback: Try to load TensorFlow.js model (browser-based)
      // Model should be placed in: public/models/fish-detection-tfjs/model.json
      if (!modelLoadingRef.current) {
        modelLoadingRef.current = true;
        try {
          console.log('Attempting to load TensorFlow.js fish detection model...');
          const modelUrl = '/models/fish-detection-tfjs/model.json';

          // Check if model exists by trying to fetch it
          const modelCheck = await fetch(modelUrl, { method: 'HEAD' });
          if (modelCheck.ok) {
            // Load the TensorFlow.js model
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

      // Try different camera constraints - OPTIMIZED for performance
      let stream: MediaStream | null = null;
      const constraints = [
        { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' } }, // Lower resolution first
        { video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'environment' } }, // Even lower for performance
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

      // Wait for video element
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

      // Attach stream
      video.srcObject = stream;
      streamRef.current = stream;

      // Set video element styles for proper rendering
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

      // Wait for video to be ready and playing
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

      // Set states AFTER video is confirmed playing
      setServerStatus(prev => ({ ...prev, camera: 'ready' }));
      setDetectionActive(true);
      setErrorMessage(null);

      // Ensure canvas is visible
      if (canvasRef.current) {
        canvasRef.current.style.display = 'block';
        canvasRef.current.style.visibility = 'visible';
        canvasRef.current.style.opacity = '1';
      }

      // Start detection loop with a small delay
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

    // Reset previous frame for motion detection
    previousFrameRef.current = null;
    // Clear detection history
    detectionHistoryRef.current = [];
    // Clear current detections and tracked fishes
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

  // Detect if fish is tilapia based on color and characteristics
  const isTilapia = (
    colorData: Array<{ r: number; g: number; b: number; gray: number }>,
    box: BoundingBox,
    width: number,
    height: number
  ): boolean => {
    // OPTIMIZATION: Larger sample step for faster tilapia detection
    const sampleStep = Math.max(2, Math.floor(Math.min(box.width, box.height) / 15)); // Reduced sampling density
    let tilapiaColorPixels = 0;
    let totalSamples = 0;
    let avgBrightness = 0;
    let avgSaturation = 0;

    for (let y = box.y; y < box.y + box.height && y < height; y += sampleStep) {
      for (let x = box.x; x < box.x + box.width && x < width; x += sampleStep) {
        const idx = y * width + x;
        if (idx >= 0 && idx < colorData.length) {
          totalSamples++;
          const { r, g, b } = colorData[idx];
          const maxColor = Math.max(r, g, b);
          const minColor = Math.min(r, g, b);
          const saturation = maxColor === 0 ? 0 : (maxColor - minColor) / maxColor;
          const brightness = (r + g + b) / 3;

          avgBrightness += brightness;
          avgSaturation += saturation;

          // Tilapia characteristics: gray/silver with low saturation
          // Typical tilapia: gray-silver, low saturation (<0.25), medium brightness (60-160)
          const isTilapiaColor =
            (saturation < 0.25 && brightness > 60 && brightness < 160) || // Gray/silver
            (saturation < 0.20 && brightness > 50 && brightness < 170) || // Very low saturation
            (r > 90 && g > 85 && b > 80 && r < 150 && g < 145 && b < 140 && saturation < 0.22); // Gray tones

          if (isTilapiaColor) {
            tilapiaColorPixels++;
          }
        }
      }
    }

    if (totalSamples === 0) return false;

    avgBrightness /= totalSamples;
    avgSaturation /= totalSamples;
    const tilapiaColorRatio = tilapiaColorPixels / totalSamples;

    // Tilapia detection criteria:
    // 1. At least 70% of pixels match tilapia color characteristics
    // 2. Low average saturation (<0.25)
    // 3. Medium brightness (50-170)
    return tilapiaColorRatio >= 0.70 && avgSaturation < 0.25 && avgBrightness >= 50 && avgBrightness <= 170;
  };

  // Match new detections with existing tracked fishes
  const matchDetectionsToTracks = (
    detections: BoundingBox[],
    trackedFishes: Map<number, TrackedFish>,
    width: number,
    height: number
  ): Array<{ detection: BoundingBox; trackId: number | null }> => {
    const matches: Array<{ detection: BoundingBox; trackId: number | null }> = [];
    const usedTrackIds = new Set<number>();
    const iouThreshold = 0.3; // Lower threshold for matching

    // Calculate IoU between two boxes
    const calculateIoU = (box1: BoundingBox, box2: { x: number; y: number; width: number; height: number }): number => {
      const x1 = Math.max(box1.x, box2.x);
      const y1 = Math.max(box1.y, box2.y);
      const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
      const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

      if (x2 <= x1 || y2 <= y1) return 0;

      const intersection = (x2 - x1) * (y2 - y1);
      const area1 = box1.width * box1.height;
      const area2 = box2.width * box2.height;
      const union = area1 + area2 - intersection;

      return union > 0 ? intersection / union : 0;
    };

    // Calculate distance between box centers
    const calculateDistance = (box1: BoundingBox, box2: { x: number; y: number; width: number; height: number }): number => {
      const center1X = box1.x + box1.width / 2;
      const center1Y = box1.y + box1.height / 2;
      const center2X = box2.x + box2.width / 2;
      const center2Y = box2.y + box2.height / 2;
      return Math.sqrt(Math.pow(center1X - center2X, 2) + Math.pow(center1Y - center2Y, 2));
    };

    // First pass: match detections to existing tracks based on IoU and distance
    for (const detection of detections) {
      let bestMatch: { trackId: number; iou: number; distance: number } | null = null;

      for (const [trackId, track] of trackedFishes.entries()) {
        if (usedTrackIds.has(trackId)) continue;

        const iou = calculateIoU(detection, track);
        const distance = calculateDistance(detection, track);
        const maxDistance = Math.max(track.width, track.height) * 1.5; // Maximum expected movement

        if (iou > iouThreshold && distance < maxDistance) {
          if (!bestMatch || iou > bestMatch.iou) {
            bestMatch = { trackId, iou, distance };
          }
        }
      }

      if (bestMatch) {
        matches.push({ detection, trackId: bestMatch.trackId });
        usedTrackIds.add(bestMatch.trackId);
      } else {
        matches.push({ detection, trackId: null });
      }
    }

    return matches;
  };

  // Update tracked fishes with new detections - dynamic based on actual detections
  const updateTracks = (
    matchedDetections: Array<{ detection: BoundingBox; trackId: number | null }>,
    isTilapiaResults: boolean[],
    trackedFishes: Map<number, TrackedFish>
  ): Map<number, TrackedFish> => {
    const now = Date.now();
    const updatedTracks = new Map(trackedFishes);
    const updatedTrackIds = new Set<number>();
    const smoothingFactor = 0.7;
    const pixelToCmRatio = 0.08; // Conversion ratio from pixels to centimeters

    // Update existing tracks or create new ones
    for (let index = 0; index < matchedDetections.length; index++) {
      const { detection, trackId } = matchedDetections[index];
      const isTilapia = isTilapiaResults[index] || false;
      const fishType = 'Fish';
      const color = isTilapia ? '#00ff00' : '#808080';

      // Calculate real-time measurements
      const length = Math.max(detection.width, detection.height) * pixelToCmRatio;
      const width_cm = Math.min(detection.width, detection.height) * pixelToCmRatio;
      const category = classifyFishSize(length, width_cm);

      if (trackId !== null && updatedTracks.has(trackId)) {
        // Update existing track
        const track = updatedTracks.get(trackId)!;
        const newX = detection.x;
        const newY = detection.y;
        const newWidth = detection.width;
        const newHeight = detection.height;

        // Calculate velocity for prediction
        const velocityX = (newX - track.x) * (1 - smoothingFactor);
        const velocityY = (newY - track.y) * (1 - smoothingFactor);

        // Smooth position update
        updatedTracks.set(trackId, {
          ...track,
          x: track.x + (newX - track.x) * (1 - smoothingFactor),
          y: track.y + (newY - track.y) * (1 - smoothingFactor),
          width: track.width + (newWidth - track.width) * (1 - smoothingFactor),
          height: track.height + (newHeight - track.height) * (1 - smoothingFactor),
          confidence: Math.max(track.confidence * 0.95, detection.confidence),
          lastSeen: now,
          age: track.age + 1,
          velocityX: track.velocityX * 0.7 + velocityX * 0.3,
          velocityY: track.velocityY * 0.7 + velocityY * 0.3,
          length: track.length + (length - track.length) * 0.3, // Smooth length updates
          width_cm: track.width_cm + (width_cm - track.width_cm) * 0.3, // Smooth width updates
          category: category, // Update category in real-time
        });
        updatedTrackIds.add(trackId);
      } else {
        // Create new track for newly detected fish
        const newTrackId = nextTrackIdRef.current++;
        updatedTracks.set(newTrackId, {
          id: newTrackId,
          x: detection.x,
          y: detection.y,
          width: detection.width,
          height: detection.height,
          color,
          label: `${fishType} ${(detection.confidence * 100).toFixed(1)}%`,
          isTilapia,
          confidence: detection.confidence,
          lastSeen: now,
          age: 0,
          velocityX: 0,
          velocityY: 0,
          length: parseFloat(length.toFixed(2)),
          width_cm: parseFloat(width_cm.toFixed(2)),
          category: category,
        });
        updatedTrackIds.add(newTrackId);
      }
    }

    // Predict positions for tracks without detections (keep them alive briefly)
    for (const [trackId, track] of updatedTracks.entries()) {
      const wasUpdated = updatedTrackIds.has(trackId);
      if (!wasUpdated) {
        if (track.age < maxTrackAge) {
          // Predict position based on velocity and keep track alive
          updatedTracks.set(trackId, {
            ...track,
            x: track.x + track.velocityX,
            y: track.y + track.velocityY,
            confidence: track.confidence * 0.95, // Slow decay when not detected
            age: track.age + 1,
            velocityX: track.velocityX * 0.85, // Slow velocity decay
            velocityY: track.velocityY * 0.85,
          });
        } else {
          // Remove old tracks that haven't been detected recently
          updatedTracks.delete(trackId);
        }
      }
    }

    return updatedTracks;
  };

  // Non-Maximum Suppression (NMS) for better duplicate removal
  const applyNMS = (detections: BoundingBox[], iouThreshold: number = 0.4): BoundingBox[] => {
    if (detections.length === 0) return [];

    // Sort by confidence (highest first)
    const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
    const selected: BoundingBox[] = [];

    // Calculate Intersection over Union (IoU)
    const calculateIoU = (box1: BoundingBox, box2: BoundingBox): number => {
      const x1 = Math.max(box1.x, box2.x);
      const y1 = Math.max(box1.y, box2.y);
      const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
      const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

      if (x2 <= x1 || y2 <= y1) return 0;

      const intersection = (x2 - x1) * (y2 - y1);
      const area1 = box1.width * box1.height;
      const area2 = box2.width * box2.height;
      const union = area1 + area2 - intersection;

      return union > 0 ? intersection / union : 0;
    };

    while (sorted.length > 0) {
      const best = sorted.shift()!;
      selected.push(best);

      // Remove all boxes with high IoU overlap
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (calculateIoU(best, sorted[i]) > iouThreshold) {
          sorted.splice(i, 1);
        }
      }
    }

    return selected;
  };

  // Simplified contour extraction - just collect edge points (much faster)
  const extractContourPoints = (
    edgeData: Uint8Array,
    box: BoundingBox,
    width: number,
    height: number,
    visited: Set<number>
  ): Array<[number, number]> => {
    const points: Array<[number, number]> = [];
    // Sample edge points from the bounding box region with larger step for performance
    const step = 3; // Sample every 3 pixels for better performance
    const maxPoints = 500; // Limit points for performance
    for (let y = Math.max(0, box.y); y < Math.min(height, box.y + box.height) && points.length < maxPoints; y += step) {
      for (let x = Math.max(0, box.x); x < Math.min(width, box.x + box.width) && points.length < maxPoints; x += step) {
        const idx = y * width + x;
        if (edgeData[idx] > 0 && !visited.has(idx)) {
          points.push([x, y]);
          visited.add(idx);
        }
      }
    }
    return points;
  };

  // Calculate minimum area bounding box from contour points (more accurate for elongated fish)
  const calculateMinAreaBox = (points: Array<[number, number]>, imgWidth: number, imgHeight: number): BoundingBox | null => {
    if (points.length < 4) return null;

    // Find axis-aligned bounding box from contour points
    let minX = points[0][0], maxX = points[0][0];
    let minY = points[0][1], maxY = points[0][1];

    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    // Return tight axis-aligned bounding box with minimal padding
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;

    // Add minimal padding (1 pixel) for visual clarity
    const padding = 1;
    return {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.min(imgWidth - Math.max(0, minX - padding), boxWidth + 2 * padding),
      height: Math.min(imgHeight - Math.max(0, minY - padding), boxHeight + 2 * padding),
      confidence: 0.8,
    };
  };

  // Simplified and faster bounding box refinement
  const refineBoundingBox = (
    edgeData: Uint8Array,
    box: BoundingBox,
    width: number,
    height: number,
    visited: Set<number>
  ): BoundingBox => {
    // Quick refinement: collect edge points from the bounding box region
    const points = extractContourPoints(edgeData, box, width, height, visited);

    if (points.length < 10) return box;

    // Calculate tight bounding box from edge points
    const refinedBox = calculateMinAreaBox(points, width, height);
    if (refinedBox) {
      refinedBox.confidence = box.confidence;
      return refinedBox;
    }

    return box;
  };

  // Detect fish using Python backend API (optimized server-side inference)
  const detectFishWithPythonBackend = async (
    imageData: ImageData,
    width: number,
    height: number
  ): Promise<BoundingBox[]> => {
    try {
      // Convert ImageData to base64
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];

      ctx.putImageData(imageData, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

      // Call Python backend API
      const response = await fetch('http://localhost:5000/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: base64Image,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.detections) {
        return [];
      }

      // Convert API detections to BoundingBox format
      // API returns: [{ bbox: [y1, x1, y2, x2], score: number, class: number }]
      // Coordinates are normalized (0-1) and may be relative to processed image size
      // We scale them to the current image dimensions (width, height parameters)
      const imageSize = result.image_size || { width: width, height: height };
      const originalWidth = imageSize.width || width;
      const originalHeight = imageSize.height || height;

      const detections: BoundingBox[] = result.detections.map((det: any) => {
        // Convert from [y1, x1, y2, x2] (normalized 0-1) to [x, y, width, height] (pixels)
        const [y1, x1, y2, x2] = det.bbox;

        // Scale normalized coordinates to original image size
        const x = Math.round(x1 * originalWidth);
        const y = Math.round(y1 * originalHeight);
        const w = Math.round((x2 - x1) * originalWidth);
        const h = Math.round((y2 - y1) * originalHeight);

        // Then scale to current processing dimensions if different
        const scaleX = width / originalWidth;
        const scaleY = height / originalHeight;

        return {
          x: Math.max(0, Math.min(Math.round(x * scaleX), width - 1)),
          y: Math.max(0, Math.min(Math.round(y * scaleY), height - 1)),
          width: Math.max(1, Math.min(Math.round(w * scaleX), width)),
          height: Math.max(1, Math.min(Math.round(h * scaleY), height)),
          confidence: det.score || 0.5,
        };
      });

      return detections;
    } catch (error: any) {
      console.error('Python backend detection error:', error);
      // Fall back to custom detection on error
      return [];
    }
  };

  // Detect fish using TensorFlow.js model (browser-based inference - fallback)
  const detectFishWithTensorFlowJS = async (
    imageData: ImageData,
    width: number,
    height: number
  ): Promise<BoundingBox[]> => {
    if (!modelRef.current || !useMLModelRef.current) {
      return [];
    }

    try {
      const model = modelRef.current;

      // Create a canvas to convert ImageData to tensor
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];

      ctx.putImageData(imageData, 0, 0);

      // Convert image to tensor
      // TensorFlow Object Detection models typically expect:
      // - Input shape: [1, height, width, 3] (batch, height, width, channels)
      // - Pixel values: 0-255 (uint8) or normalized 0-1 (float32)
      let imageTensor = tf.browser.fromPixels(canvas);

      // Resize to model input size if needed (most models expect 640x640 or similar)
      // Check model input shape
      const modelInputShape = model.inputs[0].shape;
      let modelInputHeight = height;
      let modelInputWidth = width;

      if (modelInputShape && modelInputShape.length >= 3) {
        modelInputHeight = modelInputShape[1] || 640;
        modelInputWidth = modelInputShape[2] || 640;

        if (width !== modelInputWidth || height !== modelInputHeight) {
          imageTensor = tf.image.resizeBilinear(imageTensor, [modelInputHeight, modelInputWidth]);
        }
      }

      // Normalize to 0-1 range (common for TensorFlow models)
      imageTensor = imageTensor.toFloat().div(255.0);

      // Add batch dimension: [1, height, width, 3]
      const batched = imageTensor.expandDims(0);

      // Run inference
      const predictions = await model.executeAsync(batched) as tf.Tensor[];

      // Clean up intermediate tensors
      imageTensor.dispose();
      batched.dispose();

      // Process predictions
      // TensorFlow Object Detection API models typically output:
      // - detection_boxes: [1, num_detections, 4] (normalized coordinates [y1, x1, y2, x2])
      // - detection_scores: [1, num_detections]
      // - detection_classes: [1, num_detections]
      // - num_detections: [1]

      let boxes: number[][] = [];
      let scores: number[] = [];

      // Try to find the correct output tensors
      for (let i = 0; i < predictions.length; i++) {
        const pred = predictions[i];
        const shape = pred.shape;
        const data = await pred.array();

        // Check if this is boxes tensor [1, N, 4]
        if (shape.length === 3 && shape[0] === 1 && shape[2] === 4) {
          boxes = (data as number[][][])[0];
        }
        // Check if this is scores tensor [1, N]
        else if (shape.length === 2 && shape[0] === 1) {
          scores = (data as number[][])[0];
        }
        // Check if this is num_detections [1]
        else if (shape.length === 1 && shape[0] === 1) {
          // Limit detections to this number
          const numDetections = (data as number[])[0];
          if (boxes.length > numDetections) {
            boxes = boxes.slice(0, numDetections);
          }
          if (scores.length > numDetections) {
            scores = scores.slice(0, numDetections);
          }
        }

        pred.dispose();
      }

      // Convert to BoundingBox format
      // Note: Box coordinates are normalized (0-1) relative to the model input size
      // We need to scale them to the original image size (width, height parameters)
      const detections: BoundingBox[] = [];
      const minConfidence = 0.3;

      // Use the model input size we determined earlier
      // modelInputHeight and modelInputWidth are already set from the input shape check

      for (let i = 0; i < Math.min(boxes.length, scores.length); i++) {
        if (scores[i] >= minConfidence) {
          // Box format: [y1, x1, y2, x2] (normalized 0-1 relative to model input)
          const [y1, x1, y2, x2] = boxes[i];

          // Convert normalized coordinates to pixel coordinates
          // First scale to model input size, then to original image size
          const xModel = x1 * modelInputWidth;
          const yModel = y1 * modelInputHeight;
          const wModel = (x2 - x1) * modelInputWidth;
          const hModel = (y2 - y1) * modelInputHeight;

          // Scale to original image dimensions
          const scaleX = width / modelInputWidth;
          const scaleY = height / modelInputHeight;

          const x = Math.round(xModel * scaleX);
          const y = Math.round(yModel * scaleY);
          const w = Math.round(wModel * scaleX);
          const h = Math.round(hModel * scaleY);

          detections.push({
            x: Math.max(0, Math.min(x, width - 1)),
            y: Math.max(0, Math.min(y, height - 1)),
            width: Math.max(1, Math.min(w, width - x)),
            height: Math.max(1, Math.min(h, height - y)),
            confidence: scores[i],
          });
        }
      }

      return detections;
    } catch (error) {
      console.error('TensorFlow.js detection error:', error);
      // Fall back to custom detection on error
      return [];
    }
  };

  // NOTE: COCO-SSD doesn't have a "fish" class, so we use custom detection
  // For fish-specific detection, you would need:
  // 1. A custom YOLO model trained on fish (e.g., from Roboflow, HuggingFace)
  // 2. Or use a fish detection API service
  // 3. Or use the TensorFlow fish detection model from kwea123/fish_detection
  // For now, we use optimized custom edge-based detection which works well for fish

  // Enhanced fish detection with improved contour-based bounding boxes (fallback)
  const detectFishInFrame = (imageData: ImageData, width: number, height: number): BoundingBox[] => {
    const data = imageData.data;
    const detections: BoundingBox[] = [];
    const grayData = new Uint8Array(width * height);
    const edgeData = new Uint8Array(width * height);

    // Convert to grayscale and analyze colors
    const colorData = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b); // Better grayscale conversion
      grayData[idx] = gray;
      colorData[idx] = { r, g, b, gray };
    }

    // Simplified edge detection - faster Sobel without directions
    const edgeMagnitudes: number[] = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        // Simplified Sobel operator (faster)
        const gx = -grayData[(y - 1) * width + (x - 1)] + grayData[(y - 1) * width + (x + 1)]
          - 2 * grayData[y * width + (x - 1)] + 2 * grayData[y * width + (x + 1)]
          - grayData[(y + 1) * width + (x - 1)] + grayData[(y + 1) * width + (x + 1)];
        const gy = -grayData[(y - 1) * width + (x - 1)] - 2 * grayData[(y - 1) * width + x] - grayData[(y - 1) * width + (x + 1)]
          + grayData[(y + 1) * width + (x - 1)] + 2 * grayData[(y + 1) * width + x] + grayData[(y + 1) * width + (x + 1)];

        // Use squared magnitude for speed (avoid sqrt)
        const magnitudeSquared = gx * gx + gy * gy;
        edgeMagnitudes.push(magnitudeSquared);
      }
    }

    // Calculate adaptive thresholds (using squared magnitudes)
    const sortedMagnitudes = [...edgeMagnitudes].filter(m => m > 0).sort((a, b) => a - b);
    if (sortedMagnitudes.length === 0) return [];

    const medianMagnitude = sortedMagnitudes[Math.floor(sortedMagnitudes.length / 2)];
    const p75Magnitude = sortedMagnitudes[Math.floor(sortedMagnitudes.length * 0.75)];

    // Simplified thresholds (using squared values, so thresholds are squared too)
    const highThresholdSq = Math.max(1600, p75Magnitude * 1.2); // ~40^2
    const lowThresholdSq = Math.max(400, medianMagnitude * 0.6); // ~20^2

    // Simplified thresholding - single threshold for performance
    let edgeIdx = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const magnitudeSq = edgeMagnitudes[edgeIdx];

        // Single threshold for performance (simplified from dual threshold)
        if (magnitudeSq > lowThresholdSq) {
          edgeData[idx] = 255;
        } else {
          edgeData[idx] = 0;
        }
        edgeIdx++;
      }
    }

    // Skip expensive morphological closing for performance - use edgeData directly
    const closedEdgeData = edgeData;

    // Find contours and extract bounding boxes
    const visited = new Set<number>();
    const minArea = 1000; // Lower minimum area for better small fish detection
    const maxArea = width * height * 0.4; // Increased for larger fish

    // Use larger step size for better performance (faster scanning)
    const stepSize = Math.max(3, Math.floor(Math.min(width, height) / 120)); // Larger step for performance

    for (let y = stepSize; y < height - stepSize; y += stepSize) {
      for (let x = stepSize; x < width - stepSize; x += stepSize) {
        const idx = y * width + x;
        if (closedEdgeData[idx] > 0 && !visited.has(idx)) {
          const box = findConnectedComponent(closedEdgeData, x, y, width, height, visited);
          if (box) {
            // Refine bounding box using contour extraction for better accuracy
            const refinedBox = refineBoundingBox(closedEdgeData, box, width, height, visited);
            const area = refinedBox.width * refinedBox.height;
            const aspectRatio = refinedBox.width / refinedBox.height;

            // Validate aspect ratio and area - more precise for fish
            // Fish typically have aspect ratios between 1.5-4.5, but allow wider range for different angles
            const isValidAspectRatio = aspectRatio >= 1.2 && aspectRatio <= 6.0;
            const isValidArea = area >= minArea && area <= maxArea;
            const minDimension = Math.min(refinedBox.width, refinedBox.height);
            const maxDimension = Math.max(refinedBox.width, refinedBox.height);
            const isValidSize = minDimension >= 20 && maxDimension <= Math.min(width, height) * 0.8;

            if (isValidAspectRatio && isValidArea && isValidSize) {
              // Analyze the region for fish-like characteristics
              const fishScore = analyzeFishCharacteristics(
                colorData,
                refinedBox,
                width,
                height,
                aspectRatio,
                area,
                previousFrameRef.current
              );

              // Accept detection if it meets the threshold
              if (fishScore > 0.68) { // Balanced threshold for performance and accuracy
              const now = Date.now();
                detectionHistoryRef.current.push({ x: refinedBox.x, y: refinedBox.y, time: now });
                if (detectionHistoryRef.current.length > 50) {
                    detectionHistoryRef.current.shift();
                  }
                detections.push({ ...refinedBox, confidence: Math.min(fishScore, 0.98) });
              }
            }
          }
        }
      }
    }

    // Apply Non-Maximum Suppression with lower threshold for better accuracy
    return applyNMS(detections, 0.35).slice(0, 8); // Lower IoU threshold (0.35) for tighter boxes
  };

  const findConnectedComponent = (
    edgeData: Uint8Array,
    startX: number,
    startY: number,
    width: number,
    height: number,
    visited: Set<number>
  ): BoundingBox | null => {
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    const queue: [number, number][] = [[startX, startY]];
    visited.add(startY * width + startX);
    let pixelCount = 0;

    // Use 8-connected component analysis for better connectivity
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      pixelCount++;

      // Check 8 neighbors (including diagonals)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;

          // Ensure within bounds
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const nIdx = ny * width + nx;

          if (!visited.has(nIdx) && edgeData[nIdx] > 0) {
            visited.add(nIdx);
            queue.push([nx, ny]);
          }
        }
      }
    }

    // Require minimum pixel count for valid detection
    if (pixelCount < 50) return null;

    // Calculate bounding box dimensions
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;

    // Ensure valid dimensions
    if (boxWidth < 10 || boxHeight < 10) return null;

    return {
      x: minX,
      y: minY,
      width: boxWidth,
      height: boxHeight,
      confidence: 0.8
    };
  };

  // Multi-factor analysis to identify fish-like objects - GENERALIZED FOR ANY FISH TYPE
  const analyzeFishCharacteristics = (
    colorData: Array<{ r: number; g: number; b: number; gray: number }>,
    box: BoundingBox,
    width: number,
    height: number,
    aspectRatio: number,
    area: number,
    previousFrame: ImageData | null
  ): number => {
    let score = 0.0;
    let fishColorPixels = 0;

    // OPTIMIZATION: Larger sample step for faster processing
    const sampleStep = Math.max(2, Math.floor(Math.min(box.width, box.height) / 25)); // Reduced sampling density
    const samples: Array<{ r: number; g: number; b: number; x: number; y: number; gray: number }> = [];

    for (let y = box.y; y < box.y + box.height && y < height; y += sampleStep) {
      for (let x = box.x; x < box.x + box.width && x < width; x += sampleStep) {
        const idx = y * width + x;
        if (idx >= 0 && idx < colorData.length) {
          samples.push({ ...colorData[idx], x, y });
        }
      }
    }

    if (samples.length === 0) return 0;

    // FISH-SPECIFIC VALIDATION: Check torpedo/elliptical shape (wider in middle, tapering at ends)
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    let centerDensity = 0;
    let edgeDensity = 0;
    const centerRadius = Math.min(box.width, box.height) * 0.35; // Slightly larger center region

    for (const pixel of samples) {
      const distFromCenter = Math.sqrt(
        Math.pow(pixel.x - centerX, 2) + Math.pow(pixel.y - centerY, 2)
      );
      if (distFromCenter < centerRadius) {
        centerDensity++;
      } else {
        edgeDensity++;
      }
    }

    // Fish should have reasonable density distribution (not too uniform, not too scattered)
    // Fish typically have more content in the center (body) than edges
    const densityRatio = centerDensity / Math.max(1, edgeDensity);
    const shapeScore = densityRatio > 0.6 ? 1.0 : densityRatio > 0.4 ? 0.85 : densityRatio > 0.3 ? 0.65 : densityRatio > 0.2 ? 0.4 : 0.1;
    score += shapeScore * 0.15; // Increased to 15% weight for better shape validation

    // 1. Color analysis: GENERALIZED for any fish - accept wide range of aquatic colors
    let uniformColorCount = 0;
    let brightColorCount = 0;
    let totalSaturation = 0;
    let underwaterColorCount = 0; // Colors that work underwater

    for (const pixel of samples) {
      const { r, g, b } = pixel;
      const maxColor = Math.max(r, g, b);
      const minColor = Math.min(r, g, b);
      const saturation = maxColor === 0 ? 0 : (maxColor - minColor) / maxColor;
      const brightness = (r + g + b) / 3;
      totalSaturation += saturation;

      // Check for uniform colors (patterns/backgrounds are often very uniform)
      const colorRange = maxColor - minColor;
      if (colorRange < 25) {
        uniformColorCount++;
      }

      // Reject extremely bright/vibrant colors (patterns, decorative objects)
      if (brightness > 220 || saturation > 0.6) {
        brightColorCount++;
      }

      // GENERALIZED Fish colors: Accept wide range of aquatic colors
      // Works for: gray/silver fish, colorful tropical fish, brown fish, blue fish, etc.
      const isFishColor =
        // Gray/silver scales (tilapia, bass, etc.)
        (saturation < 0.25 && brightness > 40 && brightness < 200) ||
        // Blue tones (bluefish, certain tropical fish)
        (b > r + 20 && b > g + 15 && saturation < 0.50 && brightness < 200) ||
        // Green-gray (some tropical, bass)
        (g > r + 15 && g > b + 10 && saturation < 0.45 && brightness < 200) ||
        // Brown/tan (catfish, carp, etc.)
        (r > 80 && g > 70 && b > 60 && r < 180 && g < 170 && b < 160 && saturation < 0.40) ||
        // Yellow/gold (goldfish, some tropical)
        (r > 150 && g > 140 && b < 100 && saturation < 0.55 && brightness < 220) ||
        // Red/orange (koi, some tropical fish)
        (r > 120 && g < r - 20 && b < r - 30 && saturation < 0.60 && brightness < 210) ||
        // Dark fish (some species)
        (brightness < 80 && saturation < 0.30) ||
        // Medium tones (many fish species)
        (brightness >= 80 && brightness <= 160 && saturation < 0.35);

      if (isFishColor) {
        fishColorPixels++;
      }

      // Underwater color validation (blue/green tint common in underwater environments)
      if (b > g + 10 || g > r + 10) {
        underwaterColorCount++;
      }
    }

    const colorScore = fishColorPixels / samples.length;
    const uniformityRatio = uniformColorCount / samples.length;
    const brightRatio = brightColorCount / samples.length;
    const avgSaturation = totalSaturation / samples.length;
    const underwaterRatio = underwaterColorCount / samples.length;

    // Penalize uniform regions, but less harshly
    let adjustedColorScore = colorScore;
    if (uniformityRatio > 0.6) {
      adjustedColorScore *= 0.4; // Penalize very uniform regions
    } else if (uniformityRatio > 0.45) {
      adjustedColorScore *= 0.6;
    }

    // Reject extremely bright/vibrant objects
    if (brightRatio > 0.3) {
      adjustedColorScore *= 0.3;
    } else if (brightRatio > 0.2) {
      adjustedColorScore *= 0.5;
    }

    // Accept moderate saturation (colorful fish are valid)
    if (avgSaturation > 0.5) {
      adjustedColorScore *= 0.6; // Some colorful fish are valid
    } else if (avgSaturation > 0.4) {
      adjustedColorScore *= 0.8;
    }

    // Bonus for underwater colors (indicates aquatic environment)
    if (underwaterRatio > 0.3) {
      adjustedColorScore *= 1.1; // Slight boost for underwater colors
      adjustedColorScore = Math.min(adjustedColorScore, 1.0);
    }

    // Require at least 55% fish-colored pixels for better accuracy
    if (colorScore < 0.55) {
      adjustedColorScore *= 0.5; // More strict penalty
    } else if (colorScore < 0.65) {
      adjustedColorScore *= 0.7; // Moderate penalty for borderline cases
    }

    score += adjustedColorScore * 0.20; // 20% weight

    // 2. Aspect ratio validation - IMPROVED for better accuracy
    let aspectScore = 0;
    // Tighter range for typical fish shapes (most fish are 2.0-4.0)
    if (aspectRatio >= 2.0 && aspectRatio <= 4.0) {
      aspectScore = 1.0; // Ideal fish body ratio (most common)
    } else if (aspectRatio >= 1.8 && aspectRatio < 2.0) {
      aspectScore = 0.9; // Slightly rounder (still good)
    } else if (aspectRatio > 4.0 && aspectRatio <= 4.5) {
      aspectScore = 0.85; // Slightly elongated (still good)
    } else if (aspectRatio >= 1.5 && aspectRatio < 1.8) {
      aspectScore = 0.7; // Rounder fish (acceptable but less common)
    } else if (aspectRatio > 4.5 && aspectRatio <= 5.0) {
      aspectScore = 0.7; // Elongated (acceptable but less common)
    } else if (aspectRatio >= 1.3 && aspectRatio < 1.5) {
      aspectScore = 0.5; // Very round (suspicious)
    } else {
      aspectScore = 0.2; // Outside reasonable range - likely not a fish
    }
    score += aspectScore * 0.20; // Increased to 20% weight for better accuracy

    // 3. Size validation - GENERALIZED for different fish sizes
    let sizeScore = 0;
    const minDimension = Math.min(box.width, box.height);
    const maxDimension = Math.max(box.width, box.height);

    // More flexible size range for different fish types
    if (area >= 3000 && area <= 50000 && minDimension >= 30 && maxDimension <= 400) {
      sizeScore = 1.0; // Wide range for different fish sizes
    } else if (area >= 2000 && area < 3000 && minDimension >= 25) {
      sizeScore = 0.8; // Small fish
    } else if (area > 50000 && area <= 80000 && maxDimension <= 500) {
      sizeScore = 0.8; // Large fish
    } else if (minDimension < 25) {
      sizeScore = 0.2; // Too small - likely noise
    } else if (area > 80000) {
      sizeScore = 0.3; // Too large - likely multiple fish or background
    } else {
      sizeScore = 0.5; // Borderline
    }
    score += sizeScore * 0.12; // 12% weight

    // 4. Edge continuity analysis - GENERALIZED
    let edgeConsistency = 0;
    let edgeSampleCount = 0;
    const edgeSamples: number[] = [];

    // Sample edges of the bounding box
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      const edgeX = box.x + box.width * t;
      const edgeY = box.y + box.height * t;

      if (edgeX >= 0 && edgeX < width && edgeY >= 0 && edgeY < height) {
        const idx = Math.floor(edgeY) * width + Math.floor(edgeX);
        if (idx >= 0 && idx < colorData.length) {
          edgeSamples.push(colorData[idx].gray);
          edgeSampleCount++;
        }
      }
    }

    // Check edge consistency (fish edges are smoother than patterns)
    if (edgeSampleCount > 5) {
      let variance = 0;
      const mean = edgeSamples.reduce((a, b) => a + b, 0) / edgeSamples.length;
      for (const val of edgeSamples) {
        variance += Math.pow(val - mean, 2);
      }
      variance /= edgeSamples.length;

      // More flexible edge variance (fish can have varied edge patterns)
      if (variance > 150 && variance < 3000) {
        edgeConsistency = 1.0; // Good edge smoothness
      } else if (variance > 100 && variance < 4000) {
        edgeConsistency = 0.7; // Acceptable
      } else if (variance > 50 && variance < 5000) {
        edgeConsistency = 0.4; // Borderline
      } else {
        edgeConsistency = 0.2; // Too uniform or too chaotic
      }
    }

    score += edgeConsistency * 0.08; // 8% weight

    // 5. Motion detection - REDUCED WEIGHT for real-time tracking (allows static/still fish)
    let motionScore = 0.5; // Default to neutral score (allows static fish)
    if (previousFrame && previousFrame.width === width && previousFrame.height === height) {
      let motionPixels = 0;
      const motionThreshold = 15; // Lower threshold to catch subtle motion
      let totalSampled = 0;

      // OPTIMIZATION: Larger motion step for faster processing
      const motionStep = Math.max(2, Math.floor(sampleStep / 1.5)); // Less dense motion sampling
      for (let y = box.y; y < box.y + box.height && y < height; y += motionStep) {
        for (let x = box.x; x < box.x + box.width && x < width; x += motionStep) {
          const idx = (y * width + x) * 4;
          const prevIdx = (y * previousFrame.width + x) * 4;

          if (idx < previousFrame.data.length && prevIdx < previousFrame.data.length) {
            totalSampled++;
            const currGray = (colorData[y * width + x]?.gray || 0);
            const prevGray = Math.floor(
              (previousFrame.data[prevIdx] +
                previousFrame.data[prevIdx + 1] +
                previousFrame.data[prevIdx + 2]) / 3
            );

            const diff = Math.abs(currGray - prevGray);
            if (diff > motionThreshold) {
              motionPixels++;
            }
          }
        }
      }

      if (totalSampled > 0) {
        const motionRatio = motionPixels / totalSampled;
        // More lenient motion detection for real-time tracking
        // Bonus for motion, but don't penalize lack of motion heavily
        if (motionRatio > 0.25) {
          motionScore = 1.0; // Strong motion - bonus
        } else if (motionRatio > 0.15) {
          motionScore = 0.8; // Moderate motion - good
        } else if (motionRatio > 0.08) {
          motionScore = 0.6; // Weak motion - acceptable
        } else {
          motionScore = 0.5; // No motion - neutral (allows static fish)
        }
      }
    }
    score += motionScore * 0.15; // Reduced to 15% weight - motion is helpful but not critical

    // REMOVED: Motion penalties - allow static fish to be detected for real-time tracking

    return Math.min(score, 0.98);
  };

  const calculateConfidence = (box: BoundingBox, aspectRatio: number): number => {
    // This function is no longer used but kept for compatibility
    return 0.8;
  };

  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
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

                  if (useMLModelRef.current) {
                    // Try Python backend first (optimized server-side)
                    if (!modelRef.current) {
                      // Python backend - no model ref needed
                      detections = await detectFishWithPythonBackend(imageData, processWidth, processHeight);
                    } else {
                      // TensorFlow.js model (browser-based fallback)
                      detections = await detectFishWithTensorFlowJS(imageData, processWidth, processHeight);
                    }

                    // Scale detections to canvas size (both Python and TensorFlow.js return at processing resolution)
                    const scaleFactor = canvas.width / processWidth;
                    detections = detections.map(det => ({
                      ...det,
                      x: Math.round(det.x * scaleFactor),
                      y: Math.round(det.y * scaleFactor),
                      width: Math.round(det.width * scaleFactor),
                      height: Math.round(det.height * scaleFactor),
                    }));
                  } else {
                    // Use optimized custom edge-based detection (fallback)
                    detections = detectFishInFrame(imageData, processWidth, processHeight);

                // Scale detections back to original canvas size
                    const scaleFactor = canvas.width / processWidth;
                    detections = detections.map(det => ({
                  ...det,
                      x: Math.round(det.x * scaleFactor),
                      y: Math.round(det.y * scaleFactor),
                      width: Math.round(det.width * scaleFactor),
                      height: Math.round(det.height * scaleFactor),
                    }));
                  }

                  const scaledDetections = detections;

                  const detectionTime = performance.now() - detectionStartTime;
                  if (detectionTime > 100) {
                    const method = useMLModelRef.current
                      ? (modelRef.current ? 'TensorFlow.js' : 'Python Backend')
                      : 'Custom';
                    console.warn(`Detection took ${detectionTime.toFixed(2)}ms (${method})`);
                  }

                  // Store current frame for motion detection
                  previousFrameRef.current = imageData;

                  // Prepare color data for tilapia detection (at processing resolution)
                const colorData = new Array(processWidth * processHeight);
                for (let i = 0; i < imageData.data.length; i += 4) {
                  const idx = i / 4;
                  const r = imageData.data[i];
                  const g = imageData.data[i + 1];
                  const b = imageData.data[i + 2];
                  const gray = Math.floor((r + g + b) / 3);
                  colorData[idx] = { r, g, b, gray };
                }

                  // Check tilapia for each detection (use original detection coordinates at processing resolution)
                  // Note: isTilapiaResults indices must match scaledDetections indices
                  const isTilapiaResults: boolean[] = [];
                  detections.forEach((detection) => {
                    const isTilapiaFish = isTilapia(colorData, detection, processWidth, processHeight);
                    isTilapiaResults.push(isTilapiaFish);
                  });

                  // TRACKING SYSTEM: Match detections to existing tracks
                  const matchedDetections = matchDetectionsToTracks(
                    scaledDetections,
                    trackedFishesRef.current,
                    canvas.width,
                    canvas.height
                  );

                  // Update tracks with new detections
                  trackedFishesRef.current = updateTracks(
                    matchedDetections,
                    isTilapiaResults,
                    trackedFishesRef.current
                  );

                  // Convert tracked fishes to drawing format (REAL-TIME: draw all currently detected fish)
                  const fullDetections: FullDetectionInfo[] = [];
                  const detectionsToDraw: Array<{ x: number; y: number; width: number; height: number; color: string; label: string; isTilapia?: boolean; confidence?: number }> = [];

                  // Get all currently tracked fishes (only those with reasonable confidence)
                  const activeTracks = Array.from(trackedFishesRef.current.entries())
                    .map(([trackId, track]) => ({ trackId, track }))
                    .filter(({ track }) => track.confidence > 0.3) // Only show actively detected fish
                    .sort((a, b) => b.track.confidence - a.track.confidence); // Sort by confidence

                  // Draw all currently detected fish
                  activeTracks.forEach(({ trackId, track }, index) => {
                    const fishNumber = index + 1; // Assign number based on order (Fish 1, Fish 2, etc.)

                    detectionsToDraw.push({
                      x: Math.round(track.x),
                      y: Math.round(track.y),
                      width: Math.round(track.width),
                      height: Math.round(track.height),
                      color: track.color,
                      label: `Fish ${fishNumber} ${(track.confidence * 100).toFixed(1)}%`,
                      isTilapia: track.isTilapia,
                      confidence: track.confidence,
                    });

                    // Use real-time measurements from track
                    fullDetections.push({
                      length: track.length,
                      width: track.width_cm,
                      category: track.category,
                      confidence: parseFloat((track.confidence * 100).toFixed(1)),
                      x: Math.round(track.x),
                      y: Math.round(track.y),
                      fishType: track.isTilapia ? 'tilapia' : 'other',
                    });
                  });

                  // Update real-time fish data for history display (only currently detected fish)
                  const realTimeData = activeTracks.map(({ track }, index) => ({
                    fishNumber: index + 1, // Assign number 1, 2, 3... based on detection order
                    length: track.length,
                    width: track.width_cm,
                    category: track.category,
                    confidence: parseFloat((track.confidence * 100).toFixed(1)),
                    lastUpdate: track.lastSeen,
                  }));

                  setRealTimeFishData(realTimeData);

                  // Check for harvest threshold warnings (fish exceeding harvest size)
                  const warnings = realTimeData
                    .filter(fish => fish.length >= harvestThreshold || fish.width >= harvestWidthThreshold)
                    .map(fish => ({
                      fishNumber: fish.fishNumber,
                      length: fish.length,
                      width: fish.width,
                      timestamp: fish.lastUpdate,
                    }));

                  // Notify parent component (dashboard) of warnings
                  if (onWarningsUpdate) {
                    onWarningsUpdate(warnings);
                  }

                  // Create alerts for fish exceeding threshold (throttled - once per minute per fish)
                  if (warnings.length > 0) {
                    const now = Date.now();
                    const lastAlertKey = 'fish_harvest_last_alert';
                    const lastAlert = localStorage.getItem(lastAlertKey);
                    const lastAlertTime = lastAlert ? parseInt(lastAlert) : 0;

                    // Only create alert if it's been more than 1 minute since last alert
                    if (now - lastAlertTime > 60000) {
                      // Save to localStorage to prevent duplicate alerts
                      localStorage.setItem(lastAlertKey, now.toString());

                      // Create alert in alerts system (could be sent to API)
                      console.log('⚠️ HARVEST WARNING:', warnings.map(w => `Fish ${w.fishNumber}: ${w.length.toFixed(2)}cm x ${w.width.toFixed(2)}cm`).join(', '));
                    }
                  }

                  // Update the ref with tracked detections for persistent drawing
                  currentDetectionsRef.current = detectionsToDraw;

                  // Update state with all tracked detections
                  setAllDetections(fullDetections);

                  // Show the best detection (highest confidence) in the main display, or first detected fish
                  if (fullDetections.length > 0) {
                    const best = fullDetections.reduce((prev, current) =>
                      (current.confidence > prev.confidence) ? current : prev
                    );

                  setDetectionInfo({
                      length: best.length,
                      width: best.width,
                      category: best.category,
                      confidence: best.confidence,
                    });
                  } else {
                    // No tracked fishes, clear detection info
                    setDetectionInfo({ length: null, width: null, category: null, confidence: null });
                  }

                  // Auto-update history when detection is active (real-time updates)
                  // Show only currently detected fish (dynamic count)
                  if (detectionActive && realTimeData.length > 0) {
                    // Convert real-time data to history format - only show currently detected fish
                    const historyData = realTimeData.map((fish: { fishNumber: number; length: number; width: number; category: string; confidence: number; lastUpdate: number }) => ({
                      id: fish.fishNumber, // Use fish number as ID (1, 2, 3, etc.)
                      detectedLength: fish.length,
                      detectedWidth: fish.width,
                      sizeCategory: fish.category,
                      confidenceScore: parseFloat((fish.confidence / 100).toFixed(2)),
                      detectionTimestamp: new Date(fish.lastUpdate || Date.now()).toISOString(),
                    }));

                    // Set history to show only currently detected fish (dynamic count)
                    setDetectionHistory(historyData);
                  } else if (detectionActive && realTimeData.length === 0) {
                    // No fish detected currently - clear history
                    setDetectionHistory([]);
                  }

                  // Save best detection to database (throttled - only save if different from last saved)
                  if (fullDetections.length > 0) {
                    const bestDet = fullDetections.reduce((prev, current) =>
                      (current.confidence > prev.confidence) ? current : prev
                    );
                    const now = Date.now();
                    const detectionKey = {
                      length: parseFloat(bestDet.length.toFixed(2)),
                      width: parseFloat(bestDet.width.toFixed(2)),
                      category: bestDet.category,
                    };

                    // Check if this is a large fish and if cooldown has passed
                    const isLargeFish = detectionKey.category === 'Large';
                    const timeSinceLastLargeFish = now - lastLargeFishSavedRef.current;
                    const largeFishCooldownPassed = timeSinceLastLargeFish >= 10000; // 10 seconds cooldown

                    // For large fish: save if cooldown has passed (every 10 seconds)
                    // For other fish: save if different from last saved or if it's been more than 5 seconds
                    const shouldSave = isLargeFish
                      ? largeFishCooldownPassed // For large fish, save if cooldown passed
                      : (!lastSavedDetectionRef.current ||
                        lastSavedDetectionRef.current.length !== detectionKey.length ||
                        lastSavedDetectionRef.current.width !== detectionKey.width ||
                        lastSavedDetectionRef.current.category !== detectionKey.category ||
                        (now - lastSavedDetectionRef.current.time) > 5000); // Save at least every 5 seconds

                    if (shouldSave) {
                      lastSavedDetectionRef.current = {
                        ...detectionKey,
                        time: now,
                      };

                      // Update large fish save time if this is a large fish
                      if (isLargeFish) {
                        lastLargeFishSavedRef.current = now;
                      }

                      fetch('/api/fish-detection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include', // Include cookies for authentication
                        body: JSON.stringify({
                          length: detectionKey.length.toFixed(2),
                          width: detectionKey.width.toFixed(2),
                          category: detectionKey.category,
                          confidence: bestDet.confidence.toFixed(1),
                        }),
                      })
                        .then(response => {
                          if (!response.ok) {
                            return response.json().then(data => {
                              throw new Error(data.message || `Failed to save detection: ${response.status}`);
                            });
                          }
                          return response.json();
                        })
                        .then(data => {
                          if (data.success) {
                            console.log('Detection saved successfully');
                            if (isLargeFish) {
                              console.log('Large fish saved to history (10-second cooldown active)');
                            }

                            // Send SMS notification for large fish (throttled to once per 2 minutes)
                            if (isLargeFish) {
                              sendSmsNotification(detectionKey.category, detectionKey.length, detectionKey.width);
                            }
                          }
                        })
                        .catch(err => {
                          console.error('Save detection error:', err);
                          // Reset last saved to allow retry on next detection
                          if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
                            console.warn('Authentication failed - user may need to log in again');
                          }
                          // If save failed for large fish, don't update the cooldown timer
                          if (isLargeFish) {
                            lastLargeFishSavedRef.current = Math.max(0, lastLargeFishSavedRef.current - 10000); // Allow retry sooner
                          }
                        });
                    }
                  }

                  // Sound playback disabled
                } catch (detectionError) {
                  console.error('Detection error:', detectionError);
                  // Continue rendering even if detection fails
                }
              }
            }
          } else {
            // No detection processing this frame, but still draw video
            // Keep previous detections visible
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

  const toggleFullscreen = () => {
    const container = document.getElementById('camera-feed-container');
    if (!fullscreen && container?.requestFullscreen) {
      container.requestFullscreen();
      setFullscreen(true);
    } else if (fullscreen && document.exitFullscreen) {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const handleViewHistory = async () => {
    setHistoryOpen(true);

    // If detection is active, use real-time data (already set by detection loop)
    if (detectionActive && realTimeFishData.length > 0) {
      // History is already updated by the detection loop with current fish
      // Just ensure it's set correctly
      const historyData = realTimeFishData.map((fish: { fishNumber: number; length: number; width: number; category: string; confidence: number; lastUpdate: number }) => ({
        id: fish.fishNumber,
        detectedLength: fish.length,
        detectedWidth: fish.width,
        sizeCategory: fish.category,
        confidenceScore: parseFloat((fish.confidence / 100).toFixed(2)),
        detectionTimestamp: new Date(fish.lastUpdate || Date.now()).toISOString(),
      }));

      setDetectionHistory(historyData);
      setLoadingHistory(false);
      return;
    }

    // If detection is not active, load from database (latest detections)
    setLoadingHistory(true);
    try {
      const response = await fetch('/api/fish-detection?limit=50', {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();
      if (data.success) {
        // Show latest detections from database (no fixed count)
        const dbHistory = (data.data || []).map((item: any, index: number) => ({
          ...item,
          id: index + 1, // Assign numbers 1, 2, 3... based on order
        }));

        setDetectionHistory(dbHistory);
      } else {
        setErrorMessage(data.message || 'Failed to load detection history');
      }
    } catch (error: any) {
      console.error('History fetch error:', error);
      setErrorMessage(error.message || 'Error loading detection history');
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 text-[#e6e9ef]">
      <div className="mb-4 sm:mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-[#e6e9ef] flex items-center gap-2">
          <i className="fas fa-fish text-blue-500"></i>
          <span>Fish Size Detection</span>
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 p-3 sm:p-4 bg-black/30 rounded-lg border border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs sm:text-[13px]">
            <i className="fas fa-server text-sm sm:text-base text-[#888]"></i>
            <span className="text-[#e6e9ef]">
              <span className="hidden sm:inline">Server: </span>
              <span className={`font-semibold ${serverStatus.server === 'online' ? 'text-green-500' : serverStatus.server === 'offline' ? 'text-red-500' : 'text-yellow-400'}`}>
                {serverStatus.server === 'online' ? 'Online' : serverStatus.server === 'offline' ? 'Offline' : 'Checking...'}
              </span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs sm:text-[13px]">
            <i className="fas fa-video text-sm sm:text-base text-[#888]"></i>
            <span className="text-[#e6e9ef]">
              <span className="hidden sm:inline">Camera: </span>
              <span className={`font-semibold ${serverStatus.camera === 'ready' ? 'text-green-500' : serverStatus.camera === 'unknown' ? 'text-red-500' : 'text-yellow-400'}`}>
                {serverStatus.camera === 'ready' ? 'Ready' : serverStatus.camera === 'unknown' ? 'Unknown' : 'Not initialized'}
              </span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs sm:text-[13px]">
            <i className="fas fa-brain text-sm sm:text-base text-[#888]"></i>
            <span className="text-[#e6e9ef]">
              <span className="hidden sm:inline">Model: </span>
              <span className={`font-semibold ${serverStatus.model === 'loaded' ? 'text-green-500' : serverStatus.model === 'unknown' ? 'text-red-500' : 'text-yellow-400'}`}>
                {serverStatus.model === 'loaded' ? 'Loaded' : serverStatus.model === 'unknown' ? 'Unknown' : 'Not loaded'}
                <span className="hidden md:inline"> (TensorFlow.js)</span>
              </span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs sm:text-[13px]">
            <i className="fas fa-tachometer-alt text-sm sm:text-base text-[#888]"></i>
            <span className="text-[#e6e9ef]">
              FPS: <span className="font-semibold text-yellow-400">{serverStatus.fps}</span>
            </span>
          </div>
        </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button
          className={`flex-1 sm:flex-initial px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-bold border-none rounded-lg cursor-pointer transition-all duration-300 uppercase tracking-wider text-white ${detectionActive
            ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)]'
            : 'bg-gradient-to-br from-green-500 to-green-600 shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:shadow-[0_6px_20px_rgba(34,197,94,0.4)]'
              } ${serverStatus.model !== 'loaded' ? 'opacity-60 cursor-not-allowed shadow-none' : ''}`}
            onClick={detectionActive ? stopDetection : startDetection}
            disabled={serverStatus.model !== 'loaded'}
          >
            <i className={`fas ${detectionActive ? 'fa-stop' : 'fa-play'} mr-2`}></i>
            {detectionActive ? 'STOP DETECTION' : 'START DETECTION'}
          </button>
          <button
          className="px-4 sm:px-6 py-3 sm:py-3.5 text-sm font-semibold border-2 border-blue-500/50 rounded-lg cursor-pointer transition-all duration-300 bg-white/5 text-blue-500 backdrop-blur-sm hover:bg-blue-500/10 hover:border-blue-500"
            onClick={handleViewHistory}
          >
          <i className="fas fa-history mr-2"></i> History
          </button>
          <button
          className="px-4 sm:px-6 py-3 sm:py-3.5 text-sm font-semibold border-2 border-green-500/50 rounded-lg cursor-pointer transition-all duration-300 bg-white/5 text-green-500 backdrop-blur-sm hover:bg-green-500/10 hover:border-green-500"
            onClick={toggleFullscreen}
          >
          <i className={`fas ${fullscreen ? 'fa-compress' : 'fa-expand'} mr-2`}></i>
          <span className="hidden sm:inline">Fullscreen</span>
          </button>
        </div>

        {errorMessage && (
          <div className="text-center mb-2 md:mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs sm:text-sm font-semibold">
            <span className="text-sm sm:text-base mr-2">⚠️</span>
            <span className="text-red-500">{errorMessage}</span>
          </div>
        )}

      <div id="camera-feed-container" className="mb-4 sm:mb-6">
        <div className="relative bg-black rounded-xl overflow-hidden min-h-[250px] sm:min-h-[350px] md:min-h-[450px] lg:min-h-[550px] flex items-center justify-center border-2 border-white/10 shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute opacity-0 pointer-events-none w-[640px] h-[480px] top-0 left-0 -z-10 block"
            />
            <canvas
              ref={canvasRef}
            className={`w-full h-full min-h-[250px] sm:min-h-[350px] md:min-h-[450px] lg:min-h-[550px] object-contain bg-black relative z-10 ${detectionActive ? 'block' : 'hidden'}`}
              style={{ imageRendering: 'auto' }}
            />
            {!detectionActive && (
              <div className="text-[#888] text-center p-2 sm:p-3 md:p-4">
                <i className="fas fa-video-slash text-2xl sm:text-3xl md:text-4xl mb-1 sm:mb-2 text-[#555]"></i>
                <p className="text-[10px] sm:text-xs md:text-sm mb-0.5 md:mb-1">Click &quot;Start Detection&quot; to begin</p>
                <small className="text-[9px] sm:text-[10px] text-[#666]">Camera access will be requested</small>
              </div>
            )}
          </div>
        </div>

      {/* Real-Time Detection Results */}
            {allDetections.length > 0 && (
        <div className="p-4 sm:p-5 bg-black/30 rounded-xl border border-white/10">
          <h4 className="mb-4 text-lg font-bold text-[#e6e9ef] flex items-center gap-2">
            <i className="fas fa-chart-line text-blue-500"></i>
            <span>Detected Fish ({allDetections.length})</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
                  className={`p-4 rounded-lg border transition-all ${exceedsThreshold
                    ? 'bg-red-500/10 border-red-500/40 ring-2 ring-red-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: boxColor }}
                        ></div>
                      <span className="font-bold text-[#e6e9ef]">Fish {fishNumber}</span>
                      </div>
                    {exceedsThreshold && (
                      <span className="px-2 py-1 bg-red-500/30 text-red-300 rounded text-xs font-bold">
                        ⚠️ HARVEST
                      </span>
                    )}
              </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888]">Length:</span>
                      <span className={`font-semibold ${exceedsLengthThreshold ? 'text-red-300' : 'text-[#e6e9ef]'}`}>
                        {det.length.toFixed(2)} cm
                      </span>
              </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888]">Width:</span>
                      <span className={`font-semibold ${exceedsWidthThreshold ? 'text-red-300' : 'text-[#e6e9ef]'}`}>
                        {det.width.toFixed(2)} cm
                      </span>
            </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888]">Category:</span>
                      <span className={`font-semibold ${det.category === 'Large' ? 'text-red-400' :
                        det.category === 'Medium' ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                        {det.category}
                </span>
              </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888]">Confidence:</span>
                      <span className="font-semibold text-[#e6e9ef]">{det.confidence.toFixed(1)}%</span>
            </div>
              </div>
              </div>
              );
            })}
            </div>
          </div>
      )}

      {/* History Modal */}
      {historyOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[10000]"
            onClick={() => setHistoryOpen(false)}
          ></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[800px] w-[90%] max-h-[85vh] rounded-2xl bg-gradient-to-b from-white/8 to-white/3 border border-white/14 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] z-[10001] overflow-y-auto text-[#e6e9ef] p-6">
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#e6e9ef]">
                <i className="fas fa-history text-blue-500 mr-2"></i> Detection History
              </h3>
                <p className="text-xs sm:text-sm text-[#888] mt-1">
                  {detectionActive
                    ? `Real-time data: ${detectionHistory.length} ${detectionHistory.length === 1 ? 'fish' : 'fish'} currently detected`
                    : 'Latest detections from database'
                  }
                  {detectionActive && <span className="text-green-400 ml-2">● Live</span>}
                </p>
              </div>
              <button
                className="bg-white/10 border-none text-[#e6e9ef] text-2xl sm:text-3xl w-8 h-8 sm:w-10 sm:h-10 md:w-10 md:h-10 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center hover:bg-white/20 active:bg-white/30 touch-manipulation"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close history"
              >
                &times;
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-10 sm:py-16">
                <i className="fas fa-spinner fa-spin text-3xl sm:text-4xl text-blue-500 mb-3"></i>
                <p className="text-sm sm:text-base text-[#a2a8b6]">Loading history...</p>
              </div>
            ) : detectionHistory.length === 0 ? (
              <div className="text-center py-10 sm:py-16">
                <i className="fas fa-inbox text-4xl sm:text-5xl text-[#555] mb-3 sm:mb-4"></i>
                <p className="text-sm sm:text-base text-[#a2a8b6]">No detection history yet</p>
                <p className="text-xs sm:text-sm text-[#888] mt-2">Start detecting fish to see history here</p>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {detectionHistory.length === 0 ? (
                  <div className="text-center py-10 sm:py-16">
                    <i className="fas fa-fish text-4xl sm:text-5xl text-[#555] mb-3 sm:mb-4"></i>
                    <p className="text-sm sm:text-base text-[#a2a8b6]">
                      {detectionActive
                        ? 'No fish detected currently. Make sure the camera is positioned correctly.'
                        : 'No detection history available'
                      }
                    </p>
                  </div>
                ) : (
                  detectionHistory.map((detection) => {
                    const exceedsLengthThreshold = parseFloat(detection.detectedLength.toString()) >= harvestThreshold;
                    const exceedsWidthThreshold = parseFloat(detection.detectedWidth.toString()) >= harvestWidthThreshold;
                    const exceedsThreshold = exceedsLengthThreshold || exceedsWidthThreshold;

                    return (
                  <div
                    key={detection.id}
                        className={`p-3 sm:p-4 rounded-lg border transition-colors touch-manipulation ${exceedsThreshold
                          ? 'bg-red-500/10 border-red-500/40 ring-2 ring-red-500/30'
                          : 'bg-black/30 border-white/10 hover:bg-black/40 active:bg-black/50'
                          }`}
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${detection.sizeCategory === 'Small' ? 'bg-green-500' :
                            detection.sizeCategory === 'Medium' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}></div>
                          <span className="font-semibold text-sm sm:text-base text-[#e6e9ef]">
                                Fish {detection.id}
                          </span>
                              {exceedsThreshold && (
                                <span className="px-2 py-0.5 bg-red-500/30 text-red-300 rounded text-xs font-bold animate-pulse">
                                  ⚠️ READY FOR HARVEST
                                </span>
                              )}
                          {detection.confidenceScore !== null && (
                            <span className="text-[10px] sm:text-xs text-[#888] whitespace-nowrap">
                              ({(parseFloat(detection.confidenceScore.toString()) * 100).toFixed(1)}% confidence)
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 text-xs sm:text-sm">
                          <div className="break-words">
                            <span className="text-[#888]">Length: </span>
                                <span className={`font-semibold ${exceedsLengthThreshold ? 'text-red-300' : 'text-[#e6e9ef]'}`}>
                              {parseFloat(detection.detectedLength.toString()).toFixed(2)} cm
                                  {exceedsLengthThreshold && (
                                    <span className="ml-1 text-red-400">⚠️</span>
                                  )}
                            </span>
                          </div>
                          <div className="break-words">
                            <span className="text-[#888]">Width: </span>
                                <span className={`font-semibold ${exceedsWidthThreshold ? 'text-red-300' : 'text-[#e6e9ef]'}`}>
                              {parseFloat(detection.detectedWidth.toString()).toFixed(2)} cm
                                  {exceedsWidthThreshold && (
                                    <span className="ml-1 text-red-400">⚠️</span>
                                  )}
                            </span>
                          </div>
                              <div className="break-words">
                                <span className="text-[#888]">Category: </span>
                                <span className="font-semibold text-[#e6e9ef]">
                                  {detection.sizeCategory}
                                </span>
                              </div>
                              <div className="break-words">
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
                  })
            )}
          </div>
      )}
          </div>
    </>
      )}
    </div>
  );
}
