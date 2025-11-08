'use client';

import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

interface FishDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function FishDetectionModal({ isOpen, onClose }: FishDetectionModalProps) {
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
  const [soundEnabled, setSoundEnabled] = useState(true);
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<tf.GraphModel | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fpsCounterRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: Date.now() });
  const isRunningRef = useRef(false); // Track if loop is actually running
  const previousFrameRef = useRef<ImageData | null>(null); // For motion detection
  const detectionHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]); // Track detection positions
  const frameSkipCounterRef = useRef(0); // Skip frames for performance
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null); // Offscreen canvas for processing
  const lastSavedDetectionRef = useRef<{ length: number; width: number; category: string; time: number } | null>(null); // Track last saved detection to prevent duplicates
  const lastDetectionTimeRef = useRef<number>(0); // Throttle detections
  const currentDetectionsRef = useRef<Array<{ x: number; y: number; width: number; height: number; color: string; label: string; isTilapia?: boolean }>>([]); // Store current detections for drawing
  const lastSmsSentRef = useRef<number>(0); // Track last SMS send time for throttling
  const userPhoneRef = useRef<string | null>(null); // Store user phone number
  const lastLargeFishSavedRef = useRef<number>(0); // Track last time a large fish was saved to history (10-second cooldown)

  // Initialize TensorFlow.js and load model
  useEffect(() => {
    if (isOpen) {
      initializeModel();
      // Fetch user phone number for SMS notifications
      fetchUserPhone();
    } else {
      stopDetection();
      cleanup();
    }
    return () => {
      stopDetection();
      cleanup();
    };
  }, [isOpen]);

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
      setServerStatus(prev => ({ ...prev, model: 'loaded', server: 'online' }));
      setErrorMessage(null);
    } catch (error) {
      console.error('Model initialization error:', error);
      setServerStatus(prev => ({ ...prev, model: 'not_loaded', server: 'offline' }));
      setErrorMessage('Failed to initialize detection model. Please refresh the page.');
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
    // Clear current detections
    currentDetectionsRef.current = [];
  };

  const cleanup = () => {
    stopDetection();
    if (modelRef.current) {
      modelRef.current.dispose();
      modelRef.current = null;
    }
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

  // Enhanced fish detection with multiple validation layers - GENERALIZED FOR ANY FISH
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
      const gray = Math.floor((r + g + b) / 3);
      grayData[idx] = gray;
      colorData[idx] = { r, g, b, gray };
    }

    // Enhanced edge detection using Sobel operator with improved adaptive threshold
    let edgeMagnitudes: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const gx = -grayData[(y - 1) * width + (x - 1)] + grayData[(y - 1) * width + (x + 1)]
          - 2 * grayData[y * width + (x - 1)] + 2 * grayData[y * width + (x + 1)]
          - grayData[(y + 1) * width + (x - 1)] + grayData[(y + 1) * width + (x + 1)];
        const gy = -grayData[(y - 1) * width + (x - 1)] - 2 * grayData[(y - 1) * width + x] - grayData[(y - 1) * width + (x + 1)]
          + grayData[(y + 1) * width + (x - 1)] + 2 * grayData[(y + 1) * width + x] + grayData[(y + 1) * width + (x + 1)];
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edgeMagnitudes.push(magnitude);
      }
    }

    // Calculate adaptive threshold from all edge magnitudes
    const sortedMagnitudes = [...edgeMagnitudes].sort((a, b) => a - b);
    const medianMagnitude = sortedMagnitudes[Math.floor(sortedMagnitudes.length / 2)];
    const meanMagnitude = edgeMagnitudes.reduce((a, b) => a + b, 0) / edgeMagnitudes.length;
    // Use a combination of median and mean for better threshold
    const adaptiveThreshold = Math.max(40, Math.min(medianMagnitude * 1.2, meanMagnitude * 0.8));

    // Apply threshold to edge data
    let edgeIdx = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        edgeData[idx] = edgeMagnitudes[edgeIdx] > adaptiveThreshold ? 255 : 0;
        edgeIdx++;
      }
    }

    // Find connected components with fish-like characteristics
    const visited = new Set<number>();
    // Improved size range for better accuracy - reject very small objects
    const minArea = 2000; // Increased minimum to reduce false positives from small debris
    const maxArea = width * height * 0.25; // Slightly reduced max to avoid large background objects

    // Balanced step size for accuracy and performance
    const stepSize = Math.max(2, Math.floor(Math.min(width, height) / 180)); // Smaller step for better detection
    for (let y = stepSize; y < height - stepSize; y += stepSize) {
      for (let x = stepSize; x < width - stepSize; x += stepSize) {
        const idx = y * width + x;
        if (edgeData[idx] > 0 && !visited.has(idx)) {
          const box = findConnectedComponent(edgeData, x, y, width, height, visited);
          if (box) {
            const area = box.width * box.height;
            const aspectRatio = box.width / box.height;

            // Improved aspect ratio range for fish (1.5 to 5.0) - tighter range reduces false positives
            // Most fish have aspect ratios between 2.0 and 4.5
            if (area >= minArea && area <= maxArea && aspectRatio >= 1.5 && aspectRatio <= 5.0) {
              // Analyze the region for fish-like characteristics
              const fishScore = analyzeFishCharacteristics(
                colorData,
                box,
                width,
                height,
                aspectRatio,
                area,
                previousFrameRef.current
              );

              // Enhanced check: Reject detections in same location repeatedly (static objects)
              const now = Date.now();
              const recentDetections = detectionHistoryRef.current.filter(
                d => Math.abs(d.x - box.x) < 40 && Math.abs(d.y - box.y) < 40 && (now - d.time) < 3000
              );

              // If same location detected multiple times with no motion, it's likely static
              // Require fewer static detections to filter out immobile objects
              if (recentDetections.length <= 2) {
                // Increased threshold (0.82) for better accuracy - reduce false positives
                if (fishScore > 0.82) {
                  // Record this detection location
                  detectionHistoryRef.current.push({ x: box.x, y: box.y, time: now });
                  // Keep only last 20 detections for better tracking
                  if (detectionHistoryRef.current.length > 20) {
                    detectionHistoryRef.current.shift();
                  }
                  detections.push({ ...box, confidence: Math.min(fishScore, 0.98) });
                }
              }
            }
          }
        }
      }
    }

    // Return all detections sorted by confidence
    // Filter out overlapping detections (keep the one with higher confidence)
    const sortedDetections = detections.sort((a, b) => b.confidence - a.confidence);
    const filteredDetections: BoundingBox[] = [];

    for (const detection of sortedDetections) {
      let isOverlapping = false;
      for (const existing of filteredDetections) {
        // Improved overlap detection - use 30% threshold for better filtering
        const overlapX = Math.max(0, Math.min(detection.x + detection.width, existing.x + existing.width) - Math.max(detection.x, existing.x));
        const overlapY = Math.max(0, Math.min(detection.y + detection.height, existing.y + existing.height) - Math.max(detection.y, existing.y));
        const overlapArea = overlapX * overlapY;
        const detectionArea = detection.width * detection.height;
        const existingArea = existing.width * existing.height;
        const minArea = Math.min(detectionArea, existingArea);
        const maxArea = Math.max(detectionArea, existingArea);

        // Check both minimum area overlap (30%) and maximum area overlap (20%) for better filtering
        if (overlapArea / minArea > 0.30 || overlapArea / maxArea > 0.20) {
          isOverlapping = true;
          break;
        }
      }

      if (!isOverlapping) {
        filteredDetections.push(detection);
        // Limit to maximum 8 detections for performance
        if (filteredDetections.length >= 8) break;
      }
    }

    return filteredDetections;
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

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          const nIdx = ny * width + nx;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
            !visited.has(nIdx) && edgeData[nIdx] > 0) {
            visited.add(nIdx);
            queue.push([nx, ny]);
          }
        }
      }
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, confidence: 0.8 };
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

    // 5. Motion detection - CRITICAL FILTER (fish move, static objects don't)
    let motionScore = 0.0;
    if (previousFrame && previousFrame.width === width && previousFrame.height === height) {
      let motionPixels = 0;
      const motionThreshold = 20; // Lower threshold to catch subtle motion
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
        // Improved motion detection - stricter thresholds for better accuracy
        // Fish typically show 20-60% motion in their bounding box when moving
        if (motionRatio > 0.30 && motionRatio < 0.60) {
          motionScore = 1.0; // Strong consistent motion (ideal range)
        } else if (motionRatio > 0.20 && motionRatio < 0.70) {
          motionScore = 0.85; // Good motion (slightly wider range)
        } else if (motionRatio > 0.15 && motionRatio < 0.80) {
          motionScore = 0.65; // Moderate motion (acceptable)
        } else if (motionRatio > 0.10) {
          motionScore = 0.4; // Weak motion (suspicious)
        } else if (motionRatio > 0.05) {
          motionScore = 0.15; // Very weak motion (likely static)
        } else {
          motionScore = 0.0; // NO motion - reject static objects
        }
      } else {
        motionScore = 0.0;
      }
    } else {
      // No previous frame - be more conservative (lower initial score)
      motionScore = 0.3;
    }
    score += motionScore * 0.35; // Increased to 35% weight - motion is CRITICAL for accuracy

    // FINAL VALIDATION: Motion is critical for accuracy - stricter penalties
    if (motionScore < 0.15) {
      score *= 0.4; // Strong penalty for very weak/no motion
    } else if (motionScore < 0.3) {
      score *= 0.6; // Moderate penalty for weak motion
    } else if (motionScore < 0.5) {
      score *= 0.8; // Slight reduction for moderate motion
    }

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

    const detect = () => {
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
              // Draw bounding box - thicker line for tilapia (green)
              ctx.strokeStyle = detection.color;
              ctx.lineWidth = detection.isTilapia ? 4 : 3; // Thicker line for tilapia (green)
              ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);

              // Draw label background with tilapia-specific color
              ctx.fillStyle = detection.color;
              ctx.font = 'bold 14px Arial';
              const textMetrics = ctx.measureText(detection.label);
              const labelHeight = 18;
              ctx.fillRect(detection.x, detection.y - labelHeight - 2, textMetrics.width + 4, labelHeight);

              // Draw label text
              ctx.fillStyle = '#000000';
              ctx.fillText(detection.label, detection.x + 2, detection.y - 4);
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

          // OPTIMIZATION: Skip frames and throttle detection (process every 3rd frame = ~10-15 FPS detection)
          frameSkipCounterRef.current++;
          const shouldProcess = frameSkipCounterRef.current % 3 === 0; // Process every 3rd frame
          const timeSinceLastDetection = now - lastDetectionTimeRef.current;
          const minDetectionInterval = 100; // Minimum 100ms between detections (10 FPS max)

          if (shouldProcess && timeSinceLastDetection >= minDetectionInterval) {
            lastDetectionTimeRef.current = now;

            // Use smaller resolution for processing to improve performance
            const processScale = 0.6; // Process at 60% resolution for speed
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
                // Draw scaled down version for processing
                processCtx.drawImage(video, 0, 0, processWidth, processHeight);

                // Get image data at lower resolution
                const imageData = processCtx.getImageData(0, 0, processWidth, processHeight);

                // Run detection on scaled image
                const detections = detectFishInFrame(imageData, processWidth, processHeight);

                // Scale detections back to original canvas size
                const scaleFactor = 1 / processScale;
                const scaledDetections = detections.map(det => ({
                  ...det,
                  x: Math.floor(det.x * scaleFactor),
                  y: Math.floor(det.y * scaleFactor),
                  width: Math.floor(det.width * scaleFactor),
                  height: Math.floor(det.height * scaleFactor),
                }));

                // Store current frame for motion detection (use scaled version)
                previousFrameRef.current = imageData;

                // Draw bounding boxes for ALL detections
                const pixelToCmRatio = 0.08;
                const fullDetections: FullDetectionInfo[] = [];

                // Prepare color data for tilapia detection
                const colorData = new Array(processWidth * processHeight);
                for (let i = 0; i < imageData.data.length; i += 4) {
                  const idx = i / 4;
                  const r = imageData.data[i];
                  const g = imageData.data[i + 1];
                  const b = imageData.data[i + 2];
                  const gray = Math.floor((r + g + b) / 3);
                  colorData[idx] = { r, g, b, gray };
                }

                if (scaledDetections.length > 0) {
                  // Store detections for persistent drawing
                  const detectionsToDraw: Array<{ x: number; y: number; width: number; height: number; color: string; label: string; isTilapia?: boolean }> = [];

                  scaledDetections.forEach((detection, index) => {
                    // Check if this detection is tilapia (use scaled coordinates for color data)
                    const scaledBox = {
                      x: Math.floor(detection.x * processScale),
                      y: Math.floor(detection.y * processScale),
                      width: Math.floor(detection.width * processScale),
                      height: Math.floor(detection.height * processScale),
                    };
                    const isTilapiaFish = isTilapia(colorData, { ...scaledBox, confidence: detection.confidence }, processWidth, processHeight);
                    // Green for tilapia, grey for other fish
                    // Use bright green (#00ff00) for tilapia to make it clearly visible
                    const color = isTilapiaFish ? '#00ff00' : '#808080'; // Bright green for tilapia, grey for other fish

                    // Prepare label
                    const fishType = isTilapiaFish ? 'Tilapia' : 'Fish';
                    const label = `${fishType} ${index + 1} ${(detection.confidence * 100).toFixed(1)}%`;

                    // Store detection for drawing on every frame
                    // Include isTilapia flag for enhanced drawing
                    detectionsToDraw.push({
                      x: detection.x,
                      y: detection.y,
                      width: detection.width,
                      height: detection.height,
                      color,
                      label,
                      isTilapia: isTilapiaFish, // Store tilapia flag for enhanced drawing
                    });

                    // Calculate measurements
                    const length = Math.max(detection.width, detection.height) * pixelToCmRatio;
                    const width = Math.min(detection.width, detection.height) * pixelToCmRatio;
                    const category = classifyFishSize(length, width);
                    const confidence = detection.confidence * 100;

                    fullDetections.push({
                      length: parseFloat(length.toFixed(2)),
                      width: parseFloat(width.toFixed(2)),
                      category,
                      confidence: parseFloat(confidence.toFixed(1)),
                      x: detection.x,
                      y: detection.y,
                      fishType: isTilapiaFish ? 'tilapia' : 'other',
                    });
                  });

                  // Update the ref with current detections for persistent drawing
                  currentDetectionsRef.current = detectionsToDraw;

                  // Update state with all detections
                  setAllDetections(fullDetections);

                  // Show the best detection (highest confidence) in the main display
                  const best = scaledDetections[0];
                  const bestLength = Math.max(best.width, best.height) * pixelToCmRatio;
                  const bestWidth = Math.min(best.width, best.height) * pixelToCmRatio;
                  const bestCategory = classifyFishSize(bestLength, bestWidth);
                  const bestConfidence = best.confidence * 100;

                  setDetectionInfo({
                    length: parseFloat(bestLength.toFixed(2)),
                    width: parseFloat(bestWidth.toFixed(2)),
                    category: bestCategory,
                    confidence: parseFloat(bestConfidence.toFixed(1)),
                  });

                  // Save first detection to database (throttled - only save if different from last saved)
                  if (fullDetections.length > 0) {
                    const firstDet = fullDetections[0];
                    const now = Date.now();
                    const detectionKey = {
                      length: parseFloat(firstDet.length.toFixed(2)),
                      width: parseFloat(firstDet.width.toFixed(2)),
                      category: firstDet.category,
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
                          confidence: firstDet.confidence.toFixed(1),
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

                  if (soundEnabled && scaledDetections.length > 0) {
                    playNotificationSound();
                  }
                } else {
                  // Clear detections if none found
                  currentDetectionsRef.current = [];
                  setDetectionInfo({ length: null, width: null, category: null, confidence: null });
                  setAllDetections([]);
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
    setLoadingHistory(true);
    try {
      const response = await fetch('/api/fish-detection?limit=50', {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();
      if (data.success) {
        setDetectionHistory(data.data || []);
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

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-[9998] flex items-center justify-center"
        onClick={onClose}
      ></div>

      <div className="fixed top-0 left-0 right-0 bottom-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-[1000px] md:w-[90%] md:max-h-[98vh] md:min-h-[85vh] w-full h-full md:h-auto md:rounded-2xl p-3 sm:p-4 md:p-4 bg-gradient-to-b from-white/8 to-white/3 border-0 md:border border-white/14 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] z-[9999] overflow-y-auto overflow-x-hidden text-[#e6e9ef]">
        <button
          className="absolute top-2 right-2 md:top-3 md:right-3 bg-white/10 border-none text-[#e6e9ef] text-xl md:text-2xl w-7 h-7 md:w-9 md:h-9 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center hover:bg-white/20"
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>

        <h2 className="mt-0 mb-1.5 md:mb-2 text-base sm:text-lg md:text-xl text-center text-[#e6e9ef]">
          <i className="fas fa-fish text-blue-500 mr-2"></i> Fish Size Detection
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 mb-1.5 md:mb-2 p-2 sm:p-2.5 md:p-2.5 bg-black/30 rounded-lg border border-white/10">
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

        <div className="mb-1.5 md:mb-2 text-center">
          <button
            className={`w-full sm:w-auto px-5 sm:px-7 md:px-9 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm md:text-sm font-bold border-none rounded-lg cursor-pointer transition-all duration-300 uppercase tracking-wider text-white ${detectionActive
              ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.3)]'
              : 'bg-gradient-to-br from-green-500 to-green-600 shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(34,197,94,0.4)]'
              } ${serverStatus.model !== 'loaded' ? 'opacity-60 cursor-not-allowed shadow-none' : ''}`}
            onClick={detectionActive ? stopDetection : startDetection}
            disabled={serverStatus.model !== 'loaded'}
          >
            <i className={`fas ${detectionActive ? 'fa-stop' : 'fa-play'} mr-2`}></i>
            {detectionActive ? 'STOP DETECTION' : 'START DETECTION'}
          </button>
        </div>

        <div className="flex gap-1.5 justify-center flex-wrap mb-1.5 md:mb-2">
          <button
            className="px-[18px] py-2.5 text-sm font-semibold border-2 border-blue-500/50 rounded-lg cursor-pointer transition-all duration-300 bg-white/5 text-blue-500 backdrop-blur-sm hover:bg-blue-500/10 hover:border-blue-500 hover:-translate-y-0.5"
            onClick={handleViewHistory}
          >
            <i className="fas fa-history mr-1.5"></i> History
          </button>
          <button
            className="px-3 sm:px-[18px] py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border-2 border-green-500/50 rounded-lg cursor-pointer transition-all duration-300 bg-white/5 text-green-500 backdrop-blur-sm hover:bg-green-500/10 hover:border-green-500 hover:-translate-y-0.5"
            onClick={toggleFullscreen}
          >
            <i className={`fas ${fullscreen ? 'fa-compress' : 'fa-expand'} mr-1 sm:mr-1.5`}></i> <span className="hidden sm:inline">Fullscreen</span>
          </button>
          <button
            className="px-3 sm:px-[18px] py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border-2 border-gray-400/50 rounded-lg cursor-pointer transition-all duration-300 bg-white/5 text-gray-400 backdrop-blur-sm hover:bg-gray-400/10 hover:border-gray-400 hover:-translate-y-0.5"
            onClick={toggleSound}
          >
            <i className={`fas ${soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'} mr-1 sm:mr-1.5`}></i> <span className="hidden sm:inline">Sound</span>
          </button>
        </div>

        {errorMessage && (
          <div className="text-center mb-2 md:mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs sm:text-sm font-semibold">
            <span className="text-sm sm:text-base mr-2">⚠️</span>
            <span className="text-red-500">{errorMessage}</span>
          </div>
        )}

        <div id="camera-feed-container" className="mb-2 md:mb-3">
          <div className="relative bg-black rounded-lg overflow-hidden min-h-[150px] sm:min-h-[200px] md:min-h-[220px] max-h-[220px] sm:max-h-[280px] md:max-h-[260px] flex items-center justify-center border-2 border-white/10">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute opacity-0 pointer-events-none w-[640px] h-[480px] top-0 left-0 -z-10 block"
            />
            <canvas
              ref={canvasRef}
              className={`w-full h-auto max-h-[220px] sm:max-h-[280px] md:max-h-[260px] object-contain bg-black relative z-10 ${detectionActive ? 'block' : 'hidden'}`}
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

        <div className="mb-0 p-2 sm:p-2.5 md:p-2.5 bg-black/30 rounded-lg border border-white/10">
          <h4 className="m-0 mb-1.5 md:mb-2 text-xs sm:text-sm md:text-sm text-[#e6e9ef] flex items-center gap-1.5 flex-wrap">
            <i className="fas fa-chart-line text-blue-500 text-sm"></i> Latest Detection
            {allDetections.length > 0 && (
              <span className="ml-1 text-[10px] sm:text-xs text-yellow-400 font-semibold">
                ({allDetections.length} {allDetections.length === 1 ? 'fish' : 'fish detected'})
              </span>
            )}
          </h4>

          {/* Show all detections if multiple */}
          {allDetections.length > 1 && (
            <div className="mb-1.5 p-1.5 bg-white/5 rounded-lg border border-white/5">
              <div className="text-xs text-[#888] mb-2 font-semibold uppercase tracking-wider">All Detections:</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {allDetections.map((det, idx) => {
                  const isTilapia = det.fishType === 'tilapia';
                  const boxColor = isTilapia ? '#00ff00' : '#808080';
                  return (
                    <div key={idx} className="p-2 bg-white/3 rounded border border-white/5 text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: boxColor }}
                        ></div>
                        <span className="font-semibold text-[#e6e9ef]">
                          {isTilapia ? 'Tilapia' : 'Fish'} {idx + 1}
                        </span>
                      </div>
                      <div className="text-[#888]">
                        L: {det.length}cm × W: {det.width}cm
                      </div>
                      <div className="text-[#888]">
                        {det.category} ({det.confidence}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 md:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 md:p-2 bg-white/3 rounded-lg border border-white/5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center bg-blue-500/10 rounded-lg text-sm sm:text-base text-blue-500 shrink-0">
                <i className="fas fa-ruler-horizontal"></i>
              </div>
              <div className="flex-1 flex flex-col gap-0 min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase text-[#888] font-semibold tracking-wider">Length</span>
                <span className="text-sm sm:text-base md:text-lg font-bold text-[#e6e9ef]">{detectionInfo.length?.toFixed(2) || '--'}</span>
                <span className="text-[10px] sm:text-xs text-[#888]">cm</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 md:p-2 bg-white/3 rounded-lg border border-white/5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center bg-blue-500/10 rounded-lg text-sm sm:text-base text-blue-500 shrink-0">
                <i className="fas fa-ruler-vertical"></i>
              </div>
              <div className="flex-1 flex flex-col gap-0 min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase text-[#888] font-semibold tracking-wider">Width</span>
                <span className="text-sm sm:text-base md:text-lg font-bold text-[#e6e9ef]">{detectionInfo.width?.toFixed(2) || '--'}</span>
                <span className="text-[10px] sm:text-xs text-[#888]">cm</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 md:p-2 bg-white/3 rounded-lg border border-white/5">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg text-sm sm:text-base shrink-0 ${detectionInfo.category?.toLowerCase() === 'small' ? 'bg-green-500/10 text-green-500' :
                detectionInfo.category?.toLowerCase() === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                  detectionInfo.category?.toLowerCase() === 'large' ? 'bg-red-500/10 text-red-500' :
                    'bg-blue-500/10 text-blue-500'
                }`}>
                <i className="fas fa-fish"></i>
              </div>
              <div className="flex-1 flex flex-col gap-0 min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase text-[#888] font-semibold tracking-wider">Category</span>
                <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-[20px] text-[10px] sm:text-xs font-semibold ${detectionInfo.category?.toLowerCase() === 'small' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                  detectionInfo.category?.toLowerCase() === 'medium' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                    detectionInfo.category?.toLowerCase() === 'large' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                      'text-[#e6e9ef]'
                  }`}>
                  {detectionInfo.category || '--'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 md:p-2 bg-white/3 rounded-lg border border-white/5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center bg-blue-500/10 rounded-lg text-sm sm:text-base text-blue-500 shrink-0">
                <i className="fas fa-percentage"></i>
              </div>
              <div className="flex-1 flex flex-col gap-0 min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase text-[#888] font-semibold tracking-wider">Confidence</span>
                <span className="text-sm sm:text-base md:text-lg font-bold text-[#e6e9ef]">{detectionInfo.confidence?.toFixed(1) || '--'}</span>
                <span className="text-[10px] sm:text-xs text-[#888]">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {historyOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[10000]"
            onClick={() => setHistoryOpen(false)}
          ></div>
          <div className="fixed top-0 left-0 right-0 bottom-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-[800px] md:w-[90%] md:max-h-[85vh] md:h-auto w-full h-full rounded-none md:rounded-2xl bg-gradient-to-b from-white/8 to-white/3 border-0 md:border border-white/14 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] z-[10001] overflow-y-auto overflow-x-hidden text-[#e6e9ef] p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#e6e9ef]">
                <i className="fas fa-history text-blue-500 mr-2"></i> Detection History
              </h3>
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
                {detectionHistory.map((detection) => (
                  <div
                    key={detection.id}
                    className="p-3 sm:p-4 bg-black/30 rounded-lg border border-white/10 hover:bg-black/40 active:bg-black/50 transition-colors touch-manipulation"
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${detection.sizeCategory === 'Small' ? 'bg-green-500' :
                            detection.sizeCategory === 'Medium' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}></div>
                          <span className="font-semibold text-sm sm:text-base text-[#e6e9ef]">
                            {detection.sizeCategory} Fish
                          </span>
                          {detection.confidenceScore !== null && (
                            <span className="text-[10px] sm:text-xs text-[#888] whitespace-nowrap">
                              ({(parseFloat(detection.confidenceScore.toString()) * 100).toFixed(1)}% confidence)
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 text-xs sm:text-sm">
                          <div className="break-words">
                            <span className="text-[#888]">Length: </span>
                            <span className="font-semibold text-[#e6e9ef]">
                              {parseFloat(detection.detectedLength.toString()).toFixed(2)} cm
                            </span>
                          </div>
                          <div className="break-words">
                            <span className="text-[#888]">Width: </span>
                            <span className="font-semibold text-[#e6e9ef]">
                              {parseFloat(detection.detectedWidth.toString()).toFixed(2)} cm
                            </span>
                          </div>
                          <div className="col-span-1 sm:col-span-2 md:col-span-2 break-words">
                            <span className="text-[#888]">Time: </span>
                            <span className="font-semibold text-[#e6e9ef]">
                              {new Date(detection.detectionTimestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
