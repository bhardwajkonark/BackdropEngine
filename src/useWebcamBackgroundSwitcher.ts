import { useRef, useEffect, useState, useCallback } from 'react';
import { WebcamManager, WebcamStatus, WebcamError } from './utils/webcam';
import { MediaPipeLoader, DEFAULT_MEDIAPIPE_CDN } from './mediapipe/loader';
import { preloadBackgrounds, BackgroundOption, LoadedBackground } from './utils/backgrounds';
import { compositeFrame, CompositingOptions, CompositingMode } from './utils/compositor';

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

    // Managers
    const webcamManagerRef = useRef<WebcamManager | null>(null);
    const mediapipeLoaderRef = useRef<MediaPipeLoader | null>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);

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
    }, [options.backgrounds, options.defaultMode]);

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

        async function init() {
            try {
                // Start webcam
                const stream = await webcamManagerRef.current!.start();
                if (options.debug) {
                    console.log('[WebcamBG Debug] Webcam stream started:', stream);
                }
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => { });
                }
                // Load MediaPipe
                await mediapipeLoaderRef.current!.load();
                if (options.debug) {
                    console.log('[WebcamBG Debug] MediaPipe loaded');
                }
                if (isMounted) setStatus('ready');
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
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (options.debug) {
                console.log('[WebcamBG Debug] Cleanup: webcam/mediapipe effect');
            }
        };
    }, [options.cdnUrl, modelSelection]);

    // Compositing loop (replaced with MediaPipe Camera utility)
    useEffect(() => {
        if (options.debug) {
            console.log('[WebcamBG Debug] Compositing effect triggered. Status:', status, 'Current background:', currentBackground, 'Blur radius:', blurRadius, 'Mirror:', mirror);
        }
        if (status !== 'ready' || !videoRef.current || !canvasRef.current || !currentBackground) return;
        let camera: any = null;
        let stopped = false;
        const loader = mediapipeLoaderRef.current;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const bg = currentBackground;
        const frameSkip = options.frameSkip ?? 1;
        let frameCount = 0;
        let cancelled = false;
        (async () => {
            await loadCameraUtilsScript();
            if (cancelled) return;
            const Camera = (window as any).Camera;
            if (!Camera) {
                console.error('[WebcamBG Error] MediaPipe Camera utility not found on window after script load.');
                return;
            }
            const selfieSegmentation = loader?.getInstance();
            selfieSegmentation.onResults((results: any) => {
                if (stopped) return;
                if (results.segmentationMask) {
                    compositeFrame({
                        inputImage: video,
                        segmentationMask: results.segmentationMask,
                        outputCanvas: canvas,
                        options: {
                            mode: bg.option.type,
                            blurRadius,
                            backgroundImage: bg.image,
                            mirror,
                        },
                    });
                } else if (options.debug) {
                    console.warn('[WebcamBG Debug] No segmentation mask in results:', results);
                }
            });
            camera = new Camera(video, {
                onFrame: async () => {
                    frameCount = (frameCount + 1) % frameSkip;
                    if (frameCount !== 0) return;
                    await selfieSegmentation.send({ image: video });
                },
                width: options.width || 640,
                height: options.height || 480,
            });
            camera.start();
            if (options.debug) {
                console.log('[WebcamBG Debug] MediaPipe Camera started');
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
    }, [status, currentBackground, blurRadius, mirror, options.frameSkip, options.width, options.height]);

    // API methods
    const setBackground = useCallback((bg: LoadedBackground) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] setBackground called:', bg);
        }
        setCurrentBackground(bg);
    }, [options.debug]);
    const setModel = useCallback((model: 0 | 1) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] setModel called:', model);
        }
        setModelSelection(model);
        mediapipeLoaderRef.current?.setModelSelection(model);
    }, [options.debug]);
    const setMirrorMode = useCallback((val: boolean) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] setMirror called:', val);
        }
        setMirror(val);
    }, [options.debug]);
    const setBlur = useCallback((val: number) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] setBlurRadius called:', val);
        }
        setBlurRadius(val);
    }, [options.debug]);

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
    };
} 