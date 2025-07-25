import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { WebcamManager, WebcamStatus, WebcamError } from './utils/webcam';
import { MediaPipeLoader, DEFAULT_MEDIAPIPE_CDN } from './mediapipe/loader';
import { preloadBackgrounds, BackgroundOption, LoadedBackground } from './utils/backgrounds';
import { preloadBeautyFilters, BeautyFilterOption, LoadedBeautyFilter } from './types/beauty-filters';
import { compositeFrame } from './utils/compositor';
import { applyBeautyFilter } from './utils/beauty-filters';

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
export interface UseWebcamBackgroundSwitcherOptions {
    backgrounds: BackgroundOption[];
    beautyFilters?: BeautyFilterOption[];
    width?: number;
    height?: number;
    onError?: (err: Error | WebcamError) => void;
    defaultMode?: string;
    defaultBeautyFilter?: string;
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
        console.log('[WebcamBG Debug] Hook initialized');
    }
    // Refs for video and canvas
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // State
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [error, setError] = useState<Error | WebcamError | null>(null);
    const [currentBackground, setCurrentBackground] = useState<LoadedBackground | null>(null);
    const [availableBackgrounds, setAvailableBackgrounds] = useState<LoadedBackground[]>([]);
    const [currentBeautyFilter, setCurrentBeautyFilter] = useState<LoadedBeautyFilter | null>(null);
    const [availableBeautyFilters, setAvailableBeautyFilters] = useState<LoadedBeautyFilter[]>([]);
    const [modelSelection, setModelSelection] = useState<0 | 1>(options.modelSelection ?? 0);
    const [mirror, setMirror] = useState<boolean>(options.mirror ?? true);
    const [blurRadius, setBlurRadius] = useState<number>(options.blurRadius ?? 10);

    // Managers
    const webcamManagerRef = useRef<WebcamManager | null>(null);
    const mediapipeLoaderRef = useRef<MediaPipeLoader | null>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Debounce ref for background changes
    const lastBgChangeRef = useRef<number>(0);
    const BG_CHANGE_DEBOUNCE_MS = 300;

    // Ref for animation frame in 'none' mode
    const noneModeAnimationRef = useRef<number | null>(null);

    // Memoize beauty filter options to prevent unnecessary re-renders
    const beautyFilterOptions = useMemo(() => options.beautyFilters || [], [options.beautyFilters]);

    // Preload backgrounds on mount or when options.backgrounds changes
    useEffect(() => {
        if (options.debug) {
            console.log('[WebcamBG Debug] Preloading backgrounds');
        }
        setStatus('loading');
        preloadBackgrounds(options.backgrounds).then((loaded) => {
            if (options.debug) {
                console.log('[WebcamBG Debug] Backgrounds loaded');
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
    }, [options.backgrounds, options.defaultMode, options.debug]);

    // Preload beauty filters on mount or when options.beautyFilters changes
    useEffect(() => {
        if (!beautyFilterOptions || beautyFilterOptions.length === 0) {
            setAvailableBeautyFilters([]);
            setCurrentBeautyFilter(null);
            return;
        }

        if (options.debug) {
            console.log('[WebcamBG Debug] Preloading beauty filters');
        }

        preloadBeautyFilters(beautyFilterOptions).then((loaded) => {
            if (options.debug) {
                console.log('[WebcamBG Debug] Beauty filters loaded');
            }
            setAvailableBeautyFilters(loaded);
            // Set default beauty filter
            let defaultFilter = loaded[0] || null;
            if (options.defaultBeautyFilter) {
                const found = loaded.find((filter) => filter.option.label === options.defaultBeautyFilter);
                if (found) defaultFilter = found;
            }
            setCurrentBeautyFilter(defaultFilter);
        }).catch((err) => {
            if (options.debug) {
                console.error('[WebcamBG Debug] Error preloading beauty filters:', err);
            }
            // Don't fail the entire hook for beauty filter errors
            console.warn('[WebcamBG Warning] Beauty filters failed to load:', err);
        });
        return () => {
            if (options.debug) {
                console.log('[WebcamBG Debug] Cleanup: beauty filters effect');
            }
        };
    }, [beautyFilterOptions, options.defaultBeautyFilter, options.debug]);

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
                if (options.debug) {
                    console.log('[WebcamBG Debug] Starting webcam initialization...');
                }

                // Start webcam
                const stream = await webcamManagerRef.current!.start();
                if (options.debug) {
                    console.log('[WebcamBG Debug] Webcam stream started:', stream);
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch((playErr) => {
                        if (options.debug) {
                            console.warn('[WebcamBG Debug] Video play failed:', playErr);
                        }
                    });
                }

                if (options.debug) {
                    console.log('[WebcamBG Debug] Starting MediaPipe loading...');
                }

                // Load MediaPipe
                await mediapipeLoaderRef.current!.load();
                if (options.debug) {
                    console.log('[WebcamBG Debug] MediaPipe loaded successfully');
                }

                if (isMounted) {
                    if (options.debug) {
                        console.log('[WebcamBG Debug] Setting status to ready');
                    }
                    setStatus('ready');
                }
            } catch (err: any) {
                if (options.debug) {
                    console.error('[WebcamBG Debug] Error initializing webcam/MediaPipe:', err);
                    console.error('[WebcamBG Debug] Error details:', {
                        name: err.name,
                        message: err.message,
                        stack: err.stack
                    });
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
    }, [options.cdnUrl, modelSelection, options.debug]);

    // Compositing loop (replaced with MediaPipe Camera utility)
    useEffect(() => {
        if (options.debug) {
            console.log('[WebcamBG Debug] Compositing effect triggered. Status:', status, 'Current background:', currentBackground, 'Blur radius:', blurRadius, 'Mirror:', mirror);
        }
        const bg = currentBackground;
        const bgType = bg?.option?.type ?? 'none';
        const isNoneMode = bgType === 'none';
        if (
            status !== 'ready' ||
            !videoRef.current ||
            !canvasRef.current ||
            (!isNoneMode && !bg)
        ) {
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
        // Cancel any previous 'none' mode animation
        if (noneModeAnimationRef.current) {
            cancelAnimationFrame(noneModeAnimationRef.current);
            noneModeAnimationRef.current = null;
        }
        let cleanupListener: (() => void) | null = null;
        if (bgType === 'none') {
            // For 'none' mode, use a direct animation frame loop and do NOT use MediaPipe Camera utility at all
            const startDrawLoop = () => {
                if (options.debug) console.log('[WebcamBG Debug] Starting draw loop for none mode');
                const drawFrame = () => {
                    if (stopped) return;
                    const video = videoRef.current!;
                    const canvas = canvasRef.current!;
                    const ctx = canvas.getContext('2d');
                    if (video.paused && video.srcObject) {
                        video.play().then(() => {
                            if (options.debug) console.log('[WebcamBG Debug] drawFrame: video.play() forced while paused');
                        }).catch((err) => {
                            if (options.debug) console.warn('[WebcamBG Debug] drawFrame: video.play() failed', err);
                        });
                        noneModeAnimationRef.current = requestAnimationFrame(drawFrame);
                        return;
                    }
                    if (options.debug) {
                        console.log('[WebcamBG Debug] drawFrame video size:', video.videoWidth, video.videoHeight, 'paused:', video.paused);
                    }
                    if (video.videoWidth === 0 || video.videoHeight === 0) {
                        noneModeAnimationRef.current = requestAnimationFrame(drawFrame);
                        return;
                    }
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        // Apply beauty filters in none mode
                        if (currentBeautyFilter && currentBeautyFilter.option.type !== 'none') {
                            try {
                                if (options.debug) {
                                    console.log('[WebcamBG Debug] Applying beauty filter in none mode draw loop:', currentBeautyFilter.option);
                                }
                                applyBeautyFilter(canvas, {
                                    type: currentBeautyFilter.option.type,
                                    intensity: currentBeautyFilter.option.intensity || 0.5,
                                });
                            } catch (err) {
                                console.warn('[WebcamBG Debug] Failed to apply beauty filter in none mode:', err);
                            }
                        }
                    }
                    noneModeAnimationRef.current = requestAnimationFrame(drawFrame);
                };
                drawFrame();
            };
            (async () => {
                // Step 1: Check and restart webcam if needed
                const stream = webcamManagerRef.current?.getStream();
                if (stream) {
                    const videoTrack = stream.getVideoTracks()[0];
                    if (!videoTrack || videoTrack.readyState !== 'live') {
                        if (options.debug) console.warn('[WebcamBG Debug] Video track not live, restarting webcam');
                        await webcamManagerRef.current?.stop();
                        await webcamManagerRef.current?.start();
                    }
                }
                // Step 2: Hard reset the video element
                const oldVideo = video;
                const parent = oldVideo.parentElement;
                let targetVideo = oldVideo;
                if (parent) {
                    const newVideo = document.createElement('video');
                    // Copy attributes from old video
                    for (const attr of oldVideo.attributes) {
                        newVideo.setAttribute(attr.name, attr.value);
                    }
                    newVideo.style.cssText = oldVideo.style.cssText;
                    newVideo.autoplay = true;
                    newVideo.muted = true;
                    newVideo.playsInline = true;
                    // Replace in DOM
                    parent.replaceChild(newVideo, oldVideo);
                    // Update ref
                    videoRef.current = newVideo;
                    targetVideo = newVideo;
                    if (options.debug) console.log('[WebcamBG Debug] Video element hard reset and replaced in DOM');
                }
                // Attach stream
                if (webcamManagerRef.current) {
                    const stream = webcamManagerRef.current.getStream();
                    if (stream) {
                        targetVideo.srcObject = stream;
                        if (options.debug) console.log('[WebcamBG Debug] Stream attached to video element');
                    }
                }
                // Always wait for loadedmetadata before starting draw loop
                let started = false;
                const onReady = () => {
                    if (started) return;
                    started = true;
                    if (options.debug) console.log('[WebcamBG Debug] onloadedmetadata fired, starting draw loop');
                    targetVideo.removeEventListener('loadedmetadata', onReady);
                    // Force play before starting draw loop
                    targetVideo.play().then(() => {
                        if (options.debug) console.log('[WebcamBG Debug] onloadedmetadata: video.play() called');
                        startDrawLoop();
                    }).catch((err) => {
                        if (options.debug) console.warn('[WebcamBG Debug] onloadedmetadata: video.play() failed', err);
                        startDrawLoop(); // Still try to start draw loop
                    });
                };
                targetVideo.addEventListener('loadedmetadata', onReady);
                cleanupListener = () => targetVideo.removeEventListener('loadedmetadata', onReady);
                // Fallback: start after 2s if metadata never loads
                setTimeout(() => {
                    if (!started && targetVideo.videoWidth > 0 && targetVideo.videoHeight > 0) {
                        started = true;
                        if (options.debug) console.log('[WebcamBG Debug] Fallback timeout: video ready, starting draw loop');
                        targetVideo.removeEventListener('loadedmetadata', onReady);
                        targetVideo.play().then(() => {
                            if (options.debug) console.log('[WebcamBG Debug] Fallback: video.play() called');
                            startDrawLoop();
                        }).catch((err) => {
                            if (options.debug) console.warn('[WebcamBG Debug] Fallback: video.play() failed', err);
                            startDrawLoop();
                        });
                    }
                }, 2000);
                // Try to play video immediately
                targetVideo.play().catch((err) => {
                    if (options.debug) console.warn('[WebcamBG Debug] video.play() failed after attaching stream:', err);
                });
            })();
            return () => {
                stopped = true;
                if (noneModeAnimationRef.current) {
                    cancelAnimationFrame(noneModeAnimationRef.current);
                    noneModeAnimationRef.current = null;
                }
                if (cleanupListener) cleanupListener();
                if (options.debug) {
                    console.log('[WebcamBG Debug] Cleanup: none mode draw loop');
                }
            };
        }
        // For all other modes, use MediaPipe Camera utility
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
                    const beautyFilterOptions = currentBeautyFilter ? {
                        type: currentBeautyFilter.option.type,
                        intensity: currentBeautyFilter.option.intensity || 0.5,
                    } : undefined;

                    if (options.debug) {
                        console.log('[WebcamBG Debug] Current beauty filter:', currentBeautyFilter);
                        console.log('[WebcamBG Debug] Beauty filter options being passed:', beautyFilterOptions);
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
                            beautyFilter: beautyFilterOptions,
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
    }, [status, currentBackground, currentBeautyFilter, blurRadius, mirror, options.frameSkip, options.width, options.height]);

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

    const setBeautyFilter = useCallback((filter: LoadedBeautyFilter) => {
        if (options.debug) {
            console.log('[WebcamBG Debug] setBeautyFilter called:', filter);
        }
        setCurrentBeautyFilter(filter);
        if (options.debug) {
            console.log('[WebcamBG Debug] Beauty filter state updated to:', filter);
        }
    }, [options.debug]);

    return {
        videoRef,
        canvasRef,
        setBackground,
        setBeautyFilter,
        setModel,
        setMirror: setMirrorMode,
        setBlurRadius: setBlur,
        status,
        error,
        currentBackground,
        availableBackgrounds,
        currentBeautyFilter,
        availableBeautyFilters,
        modelSelection,
        mirror,
        blurRadius,
    };
} 