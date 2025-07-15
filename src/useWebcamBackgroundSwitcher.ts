import { useRef, useEffect, useState, useCallback } from 'react';
import { WebcamManager, WebcamStatus, WebcamError } from './utils/webcam';
import { MediaPipeLoader, DEFAULT_MEDIAPIPE_CDN } from './mediapipe/loader';
import { preloadBackgrounds, BackgroundOption, LoadedBackground } from './utils/backgrounds';
import { compositeFrame, compositeFrameWithBeautyFilters } from './utils/compositor';
import { JeelizManager } from './utils/jeeliz';
import { BeautyFilterRenderer, BeautyFilter } from './utils/faceFilters';

// Extend Window interface for Jeeliz
declare global {
    interface Window {
        JEEFACEFILTER?: any;
    }
}

/**
 * React hook for webcam background switching using MediaPipe Selfie Segmentation.
 * 
 * FIXED: Maximum update depth exceeded error was caused by:
 * 1. Options object being recreated on every render in components
 * 2. useEffect dependencies including options properties that change on every render
 * 
 * Solution:
 * - Components should use useMemo to memoize options object
 * - Hook dependencies optimized to avoid unnecessary re-runs
 * - Callback functions optimized to prevent re-renders
 */
import { FaceFilter, JeelizFaceDetection, JeelizManagerOptions } from './types/jeeliz';

export interface UseWebcamBackgroundSwitcherOptions {
    backgrounds: BackgroundOption[];
    width?: number;
    height?: number;
    onError?: (err: Error | WebcamError) => void;
    defaultMode?: string;
    modelSelection?: 0 | 1;
    blurRadius?: number;
    mirror?: boolean;
    cdnUrl?: string;
    debug?: boolean;
    frameSkip?: number;
    // Face filter options
    enableFaceFilters?: boolean;
    faceFilters?: FaceFilter[];
    jeelizOptions?: JeelizManagerOptions;
}

// Utility to dynamically load the MediaPipe camera_utils script
async function loadCameraUtilsScript(): Promise<void> {
    if (typeof window === 'undefined') return;
    if ((window as any).Camera) return;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load MediaPipe camera_utils.js'));
        document.head.appendChild(script);
    });
}

// Utility to load Jeeliz script synchronously
function loadJeelizScript(): void {
    if (typeof window === 'undefined') return;
    if ((window as any).JEEFACEFILTER) return;

    const script = document.createElement('script');
    script.src = 'https://appstatic.jeeliz.com/faceFilter/jeelizFaceFilter.js';
    script.async = false; // Synchronous loading
    script.type = 'text/javascript';
    document.head.appendChild(script);
}

export function useWebcamBackgroundSwitcher(options: UseWebcamBackgroundSwitcherOptions) {
    if (options.debug) {
        console.log('[WebcamBG Debug] Hook initialized with options:', options);
    }
    // Refs for video and canvas
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // State
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [error, setError] = useState<Error | WebcamError | null>(null);
    const [currentBackground, setCurrentBackground] = useState<LoadedBackground | null>(null);
    const [availableBackgrounds, setAvailableBackgrounds] = useState<LoadedBackground[]>([]);
    const [modelSelection, setModelSelection] = useState<0 | 1>(options.modelSelection ?? 0);
    const [mirror, setMirror] = useState<boolean>(options.mirror ?? true);
    const [blurRadius, setBlurRadius] = useState<number>(options.blurRadius ?? 10);

    // Beauty filter state
    const [faceDetections, setFaceDetections] = useState<JeelizFaceDetection[]>([]);
    const [beautyFilters, setBeautyFilters] = useState<BeautyFilter[]>([]);
    const [jeelizStatus, setJeelizStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    // Managers
    const webcamManagerRef = useRef<WebcamManager | null>(null);
    const mediapipeLoaderRef = useRef<MediaPipeLoader | null>(null);
    const jeelizManagerRef = useRef<JeelizManager | null>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Debounce ref for background changes
    const lastBgChangeRef = useRef<number>(0);
    const BG_CHANGE_DEBOUNCE_MS = 300;

    // Ref for animation frame in 'none' mode
    const noneModeAnimationRef = useRef<number | null>(null);

    // Preload backgrounds on mount or when options.backgrounds changes
    useEffect(() => {
        if (options.debug) {
            console.log('[WebcamBG Debug] Preloading backgrounds:', options.backgrounds);
        }
        setStatus('loading');
        preloadBackgrounds(options.backgrounds).then((loaded) => {
            if (options.debug) {
                console.log('[WebcamBG Debug] Backgrounds loaded:', loaded);
            }
            setAvailableBackgrounds(loaded);
            // Set default background
            let defaultBg = loaded[0] || null;
            if (options.defaultMode) {
                const found = loaded.find((bg) => bg.option.label === options.defaultMode);
                if (found) defaultBg = found;
            }
            setCurrentBackground(defaultBg);
        }).catch((err) => {
            if (options.debug) {
                console.error('[WebcamBG Debug] Error preloading backgrounds:', err);
            }
            setError(err);
            setStatus('error');
            options.onError?.(err);
        });
        return () => {
            if (options.debug) {
                console.log('[WebcamBG Debug] Cleanup: backgrounds effect');
            }
        };
    }, [options.backgrounds, options.defaultMode, options.debug, options.onError]);

    // Initialize webcam and MediaPipe
    useEffect(() => {
        if (options.debug) {
            console.log('[WebcamBG Debug] Initializing webcam and MediaPipe');
        }
        let isMounted = true;
        setStatus('loading');
        setError(null);
        webcamManagerRef.current = new WebcamManager();
        mediapipeLoaderRef.current = new MediaPipeLoader({
            cdnUrl: options.cdnUrl || DEFAULT_MEDIAPIPE_CDN,
            modelSelection,
        });

        // Load Jeeliz script early if face filters are enabled
        if (options.enableFaceFilters) {
            if (options.debug) {
                console.log('[WebcamBG Debug] Loading Jeeliz script...');
            }
            loadJeelizScript();

            // Check if script loaded after a delay
            setTimeout(() => {
                if (options.debug) {
                    console.log('[WebcamBG Debug] Jeeliz script check:', {
                        windowJEELIZFACEFILTER: !!window.JEELIZFACEFILTER,
                        windowJEEFACEFILTER: !!window.JEEFACEFILTER,
                        scriptElements: document.querySelectorAll('script[src*="jeeliz"]').length
                    });
                }
            }, 2000);

            jeelizManagerRef.current = new JeelizManager(
                options.jeelizOptions || {},
                {
                    onReady: () => {
                        if (options.debug) {
                            console.log('[WebcamBG Debug] Jeeliz ready');
                        }
                        setJeelizStatus('ready');
                    },
                    onTrack: (detections) => {
                        if (options.debug) {
                            console.log('[WebcamBG Debug] Face detections received:', detections.length);
                        }
                        setFaceDetections(detections);
                    },
                    onError: (error) => {
                        if (options.debug) {
                            console.error('[WebcamBG Debug] Jeeliz error:', error);
                        }
                        setJeelizStatus('error');
                        options.onError?.(new Error(`Jeeliz Error: ${error.message}`));
                    },
                }
            );
        }

        async function init() {
            try {
                // Start webcam
                const stream = await webcamManagerRef.current!.start();
                if (options.debug) {
                    console.log('[WebcamBG Debug] Webcam stream started:', stream);
                }

                // Ensure video element gets the stream
                const attachStreamToVideo = () => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        if (options.debug) {
                            console.log('[WebcamBG Debug] Stream attached to video element:', {
                                streamActive: stream.active,
                                streamTracks: stream.getTracks().length,
                                videoReadyState: videoRef.current.readyState,
                                videoWidth: videoRef.current.videoWidth,
                                videoHeight: videoRef.current.videoHeight,
                            });
                        }

                        // Wait for video to be ready
                        const onLoadedMetadata = () => {
                            if (options.debug) {
                                console.log('[WebcamBG Debug] onloadedmetadata fired, starting draw loop');
                            }
                            videoRef.current!.play().then(() => {
                                if (options.debug) {
                                    console.log('[WebcamBG Debug] onloadedmetadata: video.play() called');
                                }
                            }).catch((err) => {
                                if (options.debug) {
                                    console.warn('[WebcamBG Debug] onloadedmetadata: video.play() failed:', err);
                                }
                            });
                            videoRef.current!.removeEventListener('loadedmetadata', onLoadedMetadata);
                        };

                        videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
                        videoRef.current.play().catch(() => { });
                    } else {
                        // Video element not ready yet, try again in 100ms
                        setTimeout(attachStreamToVideo, 100);
                    }
                };

                attachStreamToVideo();
                // Load MediaPipe
                await mediapipeLoaderRef.current!.load();
                if (options.debug) {
                    console.log('[WebcamBG Debug] MediaPipe loaded');
                }

                // Set status to ready first, then initialize Jeeliz when canvas is ready
                if (isMounted) setStatus('ready');

                // Initialize Jeeliz after a delay to ensure canvas is ready
                if (options.enableFaceFilters && jeelizManagerRef.current) {
                    const initJeeliz = async (retryCount = 0) => {
                        if (!isMounted) return;

                        if (options.debug) {
                            console.log('[WebcamBG Debug] Delayed Jeeliz initialization check (attempt ' + (retryCount + 1) + '):', {
                                canvasExists: !!canvasRef.current,
                                canvasParent: !!canvasRef.current?.parentElement,
                                canvasWidth: canvasRef.current?.width,
                                canvasHeight: canvasRef.current?.height
                            });
                        }

                        if (!canvasRef.current || !canvasRef.current.parentElement) {
                            if (options.debug) {
                                console.log('[WebcamBG Debug] Canvas not ready for Jeeliz, will retry later');
                            }
                            // Retry up to 3 times with increasing delays
                            if (retryCount < 3) {
                                setTimeout(() => initJeeliz(retryCount + 1), 1000 * (retryCount + 1));
                            }
                            return;
                        }

                        if (options.debug) {
                            console.log('[WebcamBG Debug] Starting Jeeliz initialization...');
                        }

                        try {
                            // Check Jeeliz script availability
                            const scriptCheck = {
                                windowJEELIZFACEFILTER: !!window.JEELIZFACEFILTER,
                                windowJEEFACEFILTER: !!window.JEEFACEFILTER,
                                scriptElements: document.querySelectorAll('script[src*="jeeliz"]').length
                            };

                            if (options.debug) {
                                console.log('[WebcamBG Debug] Jeeliz script check:', scriptCheck);
                            }

                            // Ensure Jeeliz script is loaded before initialization
                            if (!window.JEELIZFACEFILTER) {
                                if (options.debug) {
                                    console.log('[WebcamBG Debug] Waiting for Jeeliz script to load...');
                                }
                                // Wait a bit more for the script to load
                                await new Promise(resolve => setTimeout(resolve, 2000));

                                if (!window.JEELIZFACEFILTER) {
                                    throw new Error('Jeeliz script not loaded after timeout');
                                }
                            }

                            await jeelizManagerRef.current!.init(canvasRef.current);
                            if (options.debug) {
                                console.log('[WebcamBG Debug] Jeeliz initialized successfully');
                            }
                            setJeelizStatus('ready');
                        } catch (err) {
                            if (options.debug) {
                                console.error('[WebcamBG Debug] Jeeliz initialization failed:', err);
                                console.warn('[WebcamBG Debug] Continuing without face filters');
                            }
                            // Continue without face filters if Jeeliz fails
                            setJeelizStatus('error');
                        }
                    };

                    // Start the initialization after a delay
                    setTimeout(() => initJeeliz(0), 1000);
                } else {
                    if (options.debug) {
                        console.log('[WebcamBG Debug] Jeeliz not enabled or manager not ready:', {
                            enableFaceFilters: options.enableFaceFilters,
                            jeelizManager: !!jeelizManagerRef.current
                        });
                    }
                }
            } catch (err: any) {
                if (options.debug) {
                    console.error('[WebcamBG Debug] Error initializing webcam/MediaPipe:', err);
                }
                setError(err);
                setStatus('error');
                options.onError?.(err);
            }
        }
        init();
        return () => {
            isMounted = false;
            webcamManagerRef.current?.stop();
            jeelizManagerRef.current?.destroy();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (options.debug) {
                console.log('[WebcamBG Debug] Cleanup: webcam/mediapipe effect');
            }
        };
    }, [options.cdnUrl, modelSelection, options.debug]);

    // Compositing loop (replaced with MediaPipe Camera utility)
    useEffect(() => {
        if (options.debug) {
            console.log('[WebcamBG Debug] Compositing effect triggered. Status:', status, 'Current background:', currentBackground, 'Blur radius:', blurRadius, 'Mirror:', mirror);
        }
        const bg = currentBackground;
        const bgType = bg?.option?.type ?? 'none';
        const isNoneMode = bgType === 'none';

        if (options.debug) {
            console.log('[WebcamBG Debug] Background analysis:', {
                bgType,
                isNoneMode,
                bgExists: !!bg,
                bgOption: bg?.option,
                status,
                videoExists: !!videoRef.current,
                canvasExists: !!canvasRef.current,
                conditionCheck: {
                    statusNotReady: status !== 'ready',
                    noVideo: !videoRef.current,
                    noCanvas: !canvasRef.current,
                    noBgForNonNone: (!isNoneMode && !bg)
                }
            });
        }

        if (
            status !== 'ready' ||
            !videoRef.current ||
            !canvasRef.current ||
            (!isNoneMode && !bg)
        ) {
            if (options.debug) {
                console.log('[WebcamBG Debug] Compositing effect early return due to conditions not met');
            }
            return;
        }
        let camera: any = null;
        let stopped = false;
        const loader = mediapipeLoaderRef.current;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const frameSkip = options.frameSkip ?? 1;
        let frameCount = 0;
        let cancelled = false;
        let lastDebugTime = 0; // Track last debug log time
        // Cancel any previous 'none' mode animation
        if (noneModeAnimationRef.current) {
            cancelAnimationFrame(noneModeAnimationRef.current);
            noneModeAnimationRef.current = null;
        }
        let cleanupListener: (() => void) | null = null;
        if (bgType === 'none') {
            if (options.debug) {
                console.log('[WebcamBG Debug] Using none mode (simple draw loop)');
            }
            // For 'none' mode, use a direct animation frame loop
            const startDrawLoop = () => {
                if (options.debug) console.log('[WebcamBG Debug] Starting draw loop for none mode');

                const drawFrame = () => {
                    if (stopped) return;
                    const video = videoRef.current!;
                    const canvas = canvasRef.current!;

                    // Check if canvas element exists and is attached to DOM
                    if (!canvas || !canvas.parentElement) {
                        if (options.debug) {
                            console.error('[WebcamBG Debug] Canvas not available or not attached to DOM');
                        }
                        noneModeAnimationRef.current = requestAnimationFrame(drawFrame);
                        return;
                    }

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        if (options.debug) {
                            console.error('[WebcamBG Debug] No canvas context available');
                        }
                        noneModeAnimationRef.current = requestAnimationFrame(drawFrame);
                        return;
                    }

                    // Check if video is ready
                    if (video.videoWidth === 0 || video.videoHeight === 0) {
                        if (options.debug) {
                            console.log('[WebcamBG Debug] Video not ready yet, retrying...', {
                                videoWidth: video.videoWidth,
                                videoHeight: video.videoHeight,
                                readyState: video.readyState,
                                srcObject: !!video.srcObject,
                            });
                        }

                        // Check if video has a stream attached, if not, try to reattach
                        if (!video.srcObject && webcamManagerRef.current) {
                            const stream = webcamManagerRef.current.getStream();
                            if (stream && stream.active) {
                                if (options.debug) {
                                    console.log('[WebcamBG Debug] Reattaching stream to video element');
                                }
                                video.srcObject = stream;
                                video.play().catch(() => { });
                            }
                        }

                        noneModeAnimationRef.current = requestAnimationFrame(drawFrame);
                        return;
                    }

                    // Set canvas size to match video
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    // Draw video to canvas
                    if (options.debug) {
                        const now = Date.now();
                        if (now - lastDebugTime > 1000) {
                            lastDebugTime = now;
                            console.log('[WebcamBG Debug] Drawing video to canvas:', {
                                videoWidth: video.videoWidth,
                                videoHeight: video.videoHeight,
                                canvasWidth: canvas.width,
                                canvasHeight: canvas.height,
                                videoReadyState: video.readyState,
                                videoPaused: video.paused,
                            });
                        }
                    }

                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Apply beauty filters if enabled
                    if (options.enableFaceFilters && beautyFilters.length > 0 && faceDetections.length > 0) {
                        if (options.debug) {
                            console.log('[WebcamBG Debug] Applying beauty filters in none mode. Detections:', faceDetections.length, 'Filters:', beautyFilters.length);
                        }
                        // Apply beauty filters asynchronously without blocking the draw loop
                        (async () => {
                            try {
                                const { BeautyFilterRenderer } = await import('./utils/faceFilters');
                                const beautyFilterRenderer = new BeautyFilterRenderer();
                                await beautyFilterRenderer.applyBeautyFilters(canvas, faceDetections, beautyFilters);
                            } catch (error) {
                                if (options.debug) {
                                    console.error('[WebcamBG Debug] Error applying beauty filters in none mode:', error);
                                }
                            }
                        })();
                    } else if (options.enableFaceFilters && beautyFilters.length > 0 && faceDetections.length === 0) {
                        if (options.debug) {
                            const now = Date.now();
                            if (now - lastDebugTime > 2000) { // Log every 2 seconds to avoid spam
                                lastDebugTime = now;
                                console.log('[WebcamBG Debug] Beauty filters available but no face detections. Filters:', beautyFilters.length, 'Detections:', faceDetections.length, 'Jeeliz status:', jeelizStatus);
                            }
                        }
                    }

                    noneModeAnimationRef.current = requestAnimationFrame(drawFrame);
                };

                drawFrame();
            };

            // Start the draw loop immediately
            startDrawLoop();

            return () => {
                stopped = true;
                if (noneModeAnimationRef.current) {
                    cancelAnimationFrame(noneModeAnimationRef.current);
                    noneModeAnimationRef.current = null;
                }
                if (options.debug) {
                    console.log('[WebcamBG Debug] Cleanup: none mode draw loop');
                }
            };
        }
        // For all other modes, use MediaPipe Camera utility
        if (options.debug) {
            console.log('[WebcamBG Debug] Using MediaPipe mode (background processing)');
        }
        (async () => {
            await loadCameraUtilsScript();
            if (cancelled) return;
            const Camera = (window as any).Camera;
            if (!Camera) {
                console.error('[WebcamBG Error] MediaPipe Camera utility not found on window after script load.');
                return;
            }
            const selfieSegmentation = loader?.getInstance();
            selfieSegmentation.onResults(async (results: any) => {
                if (stopped) return;
                if (results.segmentationMask) {
                    // Use face filter compositing if face filters are enabled and available
                    if (options.enableFaceFilters && beautyFilters.length > 0) {
                        if (options.debug) {
                            console.log('[WebcamBG Debug] Using beauty filter compositing. Face detections:', faceDetections.length, 'Beauty filters:', beautyFilters.length);
                            console.log('[WebcamBG Debug] Canvas details:', {
                                width: canvas.width,
                                height: canvas.height,
                                offsetWidth: canvas.offsetWidth,
                                offsetHeight: canvas.offsetHeight,
                                hasContext: !!canvas.getContext('2d'),
                            });
                        }
                        await compositeFrameWithBeautyFilters({
                            inputImage: video,
                            segmentationMask: results.segmentationMask,
                            faceDetections,
                            beautyFilters,
                            outputCanvas: canvas,
                            options: {
                                mode: bgType,
                                blurRadius,
                                backgroundImage: bg?.image,
                                mirror,
                            },
                        });
                    } else if (options.enableFaceFilters && beautyFilters.length === 0) {
                        if (options.debug) {
                            console.log('[WebcamBG Debug] Face filters enabled but no filters active. Face detections:', faceDetections.length);
                        }
                        compositeFrame({
                            inputImage: video,
                            segmentationMask: results.segmentationMask,
                            outputCanvas: canvas,
                            options: {
                                mode: bgType,
                                blurRadius,
                                backgroundImage: bg?.image,
                                mirror,
                            },
                        });
                    } else {
                        compositeFrame({
                            inputImage: video,
                            segmentationMask: results.segmentationMask,
                            outputCanvas: canvas,
                            options: {
                                mode: bgType,
                                blurRadius,
                                backgroundImage: bg?.image,
                                mirror,
                            },
                        });
                    }
                } else if (options.debug) {
                    console.warn('[WebcamBG Debug] No segmentation mask in results:', results);
                }
            });
            camera = new Camera(video, {
                onFrame: async () => {
                    frameCount = (frameCount + 1) % frameSkip;
                    if (frameCount !== 0) return;

                    // Validate video dimensions before sending to MediaPipe
                    if (video.videoWidth === 0 || video.videoHeight === 0) {
                        if (options.debug) {
                            console.warn('[WebcamBG Debug] Skipping MediaPipe frame - video not ready:', {
                                videoWidth: video.videoWidth,
                                videoHeight: video.videoHeight,
                                readyState: video.readyState,
                                srcObject: !!video.srcObject,
                            });
                        }
                        return;
                    }

                    await selfieSegmentation.send({ image: video });
                },
                width: options.width || 640,
                height: options.height || 480,
            });

            // Only start camera if video is ready
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                camera.start();
                if (options.debug) {
                    console.log('[WebcamBG Debug] MediaPipe Camera started');
                }
            } else {
                if (options.debug) {
                    console.warn('[WebcamBG Debug] Delaying MediaPipe Camera start - video not ready');
                }
                // Wait for video to be ready
                const checkVideoReady = () => {
                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                        camera.start();
                        if (options.debug) {
                            console.log('[WebcamBG Debug] MediaPipe Camera started (delayed)');
                        }
                    } else {
                        setTimeout(checkVideoReady, 100);
                    }
                };
                checkVideoReady();
            }
        })();
        return () => {
            stopped = true;
            cancelled = true;
            if (camera && camera.stop) camera.stop();
            if (options.debug) {
                console.log('[WebcamBG Debug] Cleanup: MediaPipe Camera effect');
            }
        };
    }, [status, currentBackground, blurRadius, mirror]);

    // API methods
    const setBackground = useCallback((bg: LoadedBackground) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] setBackground called:', bg);
        }
        const now = Date.now();
        if (now - lastBgChangeRef.current < BG_CHANGE_DEBOUNCE_MS) {
            if (options.debug) {
                console.warn('[WebcamBG Debug] Background change debounced.');
            }
            return;
        }
        lastBgChangeRef.current = now;
        setCurrentBackground(bg);
    }, []);
    const setModel = useCallback((model: 0 | 1) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] setModel called:', model);
        }
        setModelSelection(model);
        mediapipeLoaderRef.current?.setModelSelection(model);
    }, []);
    const setMirrorMode = useCallback((val: boolean) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] setMirror called:', val);
        }
        setMirror(val);
    }, []);
    const setBlur = useCallback((val: number) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] setBlurRadius called:', val);
        }
        setBlurRadius(val);
    }, []);

    // Beauty filter API methods
    const updateBeautyFilters = useCallback((filters: BeautyFilter[]) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] setBeautyFilters called:', filters);
        }
        setBeautyFilters(filters);
    }, []);

    const addBeautyFilter = useCallback((filter: BeautyFilter) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] addBeautyFilter called:', filter);
        }
        setBeautyFilters(prev => [...prev, filter]);
    }, []);

    const removeBeautyFilter = useCallback((filterId: string) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] removeBeautyFilter called:', filterId);
        }
        setBeautyFilters(prev => prev.filter(f => f.id !== filterId));
    }, []);

    const clearBeautyFilters = useCallback(() => {
        if (options.debug) {
            console.log('[WebcamBG Debug] clearBeautyFilters called');
        }
        setBeautyFilters([]);
    }, []);

    return {
        videoRef,
        canvasRef,
        setBackground,
        setModel,
        setMirror: setMirrorMode,
        setBlurRadius: setBlur,
        status,
        error,
        currentBackground,
        availableBackgrounds,
        modelSelection,
        mirror,
        blurRadius,
        // Beauty filter methods
        faceDetections,
        beautyFilters,
        setBeautyFilters: updateBeautyFilters,
        addBeautyFilter,
        removeBeautyFilter,
        clearBeautyFilters,
        jeelizStatus,
    };
} 