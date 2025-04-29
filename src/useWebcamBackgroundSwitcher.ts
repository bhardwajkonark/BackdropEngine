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
}

export function useWebcamBackgroundSwitcher(options: UseWebcamBackgroundSwitcherOptions) {
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
        setStatus('loading');
        preloadBackgrounds(options.backgrounds).then((loaded) => {
            setAvailableBackgrounds(loaded);
            // Set default background
            let defaultBg = loaded[0] || null;
            if (options.defaultMode) {
                const found = loaded.find((bg) => bg.option.label === options.defaultMode);
                if (found) defaultBg = found;
            }
            setCurrentBackground(defaultBg);
        }).catch((err) => {
            setError(err);
            setStatus('error');
            options.onError?.(err);
        });
    }, [options.backgrounds, options.defaultMode]);

    // Initialize webcam and MediaPipe
    useEffect(() => {
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
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                // Load MediaPipe
                await mediapipeLoaderRef.current!.load();
                if (isMounted) setStatus('ready');
            } catch (err: any) {
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
        };
    }, [options.cdnUrl, modelSelection]);

    // Compositing loop
    useEffect(() => {
        if (status !== 'ready' || !videoRef.current || !canvasRef.current || !currentBackground) return;
        let stopped = false;
        const loader = mediapipeLoaderRef.current;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const bg = currentBackground;
        const runFrame = async () => {
            if (stopped) return;
            try {
                // Only process if video is ready
                if (video.readyState >= 2 && loader) {
                    const selfieSegmentation = loader.getInstance();
                    // Run segmentation
                    await selfieSegmentation.send({ image: video });
                    // Get results (assume onResults sets a property)
                    const results = selfieSegmentation.lastResults || {};
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
                    }
                }
            } catch (err: any) {
                setError(err);
                setStatus('error');
                options.onError?.(err);
            }
            animationFrameRef.current = requestAnimationFrame(runFrame);
        };
        animationFrameRef.current = requestAnimationFrame(runFrame);
        return () => {
            stopped = true;
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [status, currentBackground, blurRadius, mirror]);

    // API methods
    const setBackground = useCallback((bg: LoadedBackground) => {
        setCurrentBackground(bg);
    }, []);
    const setModel = useCallback((model: 0 | 1) => {
        setModelSelection(model);
        mediapipeLoaderRef.current?.setModelSelection(model);
    }, []);
    const setMirrorMode = useCallback((val: boolean) => setMirror(val), []);
    const setBlur = useCallback((val: number) => setBlurRadius(val), []);

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