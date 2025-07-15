import {
    JeelizFaceDetection,
    JeelizInitOptions,
    JeelizStatus,
    JeelizError,
    JeelizCallbacks,
    JeelizManagerOptions,
} from '../types/jeeliz';

/**
 * Default Jeeliz neural network path
 */
export const DEFAULT_JEELIZ_NN_PATH = 'https://cdn.jsdelivr.net/npm/facefilter@3.4.3/neuralNets/NN_DEFAULT.json';

/**
 * Jeeliz FaceFilter manager
 * Handles initialization, face detection, and lifecycle management
 */
export class JeelizManager {
    private faceFilter: any = null;
    private isInitialized = false;
    private status: JeelizStatus = 'loading';
    private error: JeelizError | null = null;
    private options: JeelizManagerOptions;
    private callbacks: JeelizCallbacks;
    private frameCount = 0;
    private lastDetections: JeelizFaceDetection[] = [];

    constructor(options: JeelizManagerOptions = {}, callbacks: JeelizCallbacks = {}) {
        this.options = {
            NNPath: DEFAULT_JEELIZ_NN_PATH,
            maxFaces: 1,
            detectionThreshold: 0.8,
            frameSkip: 1,
            debug: false,
            ...options,
        };
        this.callbacks = callbacks;
    }

    /**
 * Initialize Jeeliz FaceFilter
 */
    async init(canvas: HTMLCanvasElement): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        this.status = 'loading';
        this.error = null;

        try {
            // Wait for Jeeliz to be available (script should already be loading)
            await this.waitForJeeliz();

            if (!window.JEELIZFACEFILTER) {
                throw new Error('Jeeliz FaceFilter not available after script load');
            }

            // Try multiple neural network paths
            const nnPaths = [
                this.options.NNPath,
                'https://appstatic.jeeliz.com/faceFilter/neuralNets/NN_DEFAULT.json',
                'https://cdn.jsdelivr.net/npm/facefilter@3.4.3/neuralNets/NN_DEFAULT.json',
                'https://unpkg.com/facefilter@3.4.3/neuralNets/NN_DEFAULT.json'
            ];

            let lastError: any = null;

            for (const nnPath of nnPaths) {
                try {
                    // Initialize Jeeliz with options
                    const initOptions: JeelizInitOptions = {
                        canvas,
                        ...this.options,
                        NNPath: nnPath,
                        callbackReady: this.onReady.bind(this),
                        callbackTrack: this.onTrack.bind(this),
                    };

                    // Add additional error handling for the init call
                    if (this.options.debug) {
                        console.log('[Jeeliz Debug] About to call JEELIZFACEFILTER.init with options:', {
                            canvas: canvas.width + 'x' + canvas.height,
                            NNPath: nnPath,
                            maxFaces: this.options.maxFaces,
                            detectionThreshold: this.options.detectionThreshold
                        });
                    }

                    if (this.options.debug) {
                        console.log('[Jeeliz Debug] Trying NN path:', nnPath);
                    }

                    this.faceFilter = await window.JEELIZFACEFILTER.init(initOptions);

                    if (this.options.debug) {
                        console.log('[Jeeliz Debug] FaceFilter initialized successfully with path:', nnPath);
                        console.log('[Jeeliz Debug] FaceFilter object:', this.faceFilter);
                    }
                    return; // Success, exit the function
                } catch (err) {
                    lastError = err;
                    if (this.options.debug) {
                        console.warn('[Jeeliz Debug] Failed to initialize with path:', nnPath);
                        console.warn('[Jeeliz Debug] Error details:', err);
                        if (err instanceof Error) {
                            console.warn('[Jeeliz Debug] Error message:', err.message);
                            console.warn('[Jeeliz Debug] Error stack:', err.stack);
                        }
                        // Log additional debugging info
                        console.warn('[Jeeliz Debug] JEELIZFACEFILTER version:', window.JEELIZFACEFILTER?.VERSION);
                        console.warn('[Jeeliz Debug] Available methods:', Object.keys(window.JEELIZFACEFILTER || {}));
                    }
                    // Continue to next path
                }
            }

            // If we get here, all paths failed
            throw new Error(`All neural network paths failed. Last error: ${lastError?.message || 'Unknown error'}`);
        } catch (err) {
            const error: JeelizError = {
                type: 'initialization',
                message: err instanceof Error ? err.message : 'Failed to initialize Jeeliz FaceFilter',
                details: err,
            };
            this.error = error;
            this.status = 'error';
            this.callbacks.onError?.(error);
            throw error;
        }
    }

    /**
 * Wait for Jeeliz to be available
 */
    private async waitForJeeliz(): Promise<void> {
        const maxAttempts = 50; // 5 seconds max (reduced from 100)
        let attempts = 0;

        // Check for the correct global variable name first
        while (!window.JEELIZFACEFILTER && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;

            if (this.options.debug && attempts % 10 === 0) {
                console.log(`[Jeeliz Debug] Waiting for script to load... (${attempts}/50)`);
                console.log(`[Jeeliz Debug] window.JEELIZFACEFILTER:`, window.JEELIZFACEFILTER);
                console.log(`[Jeeliz Debug] window object keys:`, Object.keys(window).filter(key => key.includes('JEE')));

                // Check if script is in DOM
                const scripts = document.querySelectorAll('script[src*="jeeliz"]');
                console.log(`[Jeeliz Debug] Scripts in DOM:`, Array.from(scripts).map(s => (s as HTMLScriptElement).src));
            }
        }

        if (!window.JEELIZFACEFILTER) {
            // Try alternative detection methods
            const alternativeNames = ['JEELIZFACEFILTER', 'JEEFACEFILTER', 'JeelizFaceFilter', 'jeelizFaceFilter', 'Jeeliz'];
            let found = false;

            for (const name of alternativeNames) {
                if ((window as any)[name]) {
                    (window as any).JEELIZFACEFILTER = (window as any)[name];
                    found = true;
                    if (this.options.debug) {
                        console.log(`[Jeeliz Debug] Found Jeeliz under name: ${name}`);
                    }
                    break;
                }
            }

            // Try to find it in the global scope
            if (!found) {
                const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;
                for (const name of alternativeNames) {
                    if ((globalScope as any)[name]) {
                        (window as any).JEELIZFACEFILTER = (globalScope as any)[name];
                        found = true;
                        if (this.options.debug) {
                            console.log(`[Jeeliz Debug] Found Jeeliz in global scope under name: ${name}`);
                        }
                        break;
                    }
                }
            }

            if (!found) {
                throw new Error('Jeeliz FaceFilter failed to load within 5 seconds timeout');
            }
        }

        if (this.options.debug) {
            console.log('[Jeeliz Debug] Script loaded successfully');
            console.log('[Jeeliz Debug] JEELIZFACEFILTER object:', window.JEELIZFACEFILTER);
        }
    }

    /**
 * Load Jeeliz FaceFilter script synchronously
 */
    private loadJeelizScript(): void {
        if (window.JEELIZFACEFILTER) {
            if (this.options.debug) {
                console.log('[Jeeliz Debug] Script already loaded');
            }
            return;
        }

        // Use multiple CDN sources for reliability
        const cdnUrls = [
            'https://appstatic.jeeliz.com/faceFilter/jeelizFaceFilter.js',
            'https://cdn.jsdelivr.net/npm/facefilter@3.4.3/dist/jeelizFaceFilter.js',
            'https://unpkg.com/facefilter@3.4.3/dist/jeelizFaceFilter.js',
            'https://cdn.jsdelivr.net/npm/@jeeliz/facefilter@3.4.3/dist/jeelizFaceFilter.js'
        ];

        let currentUrlIndex = 0;

        const tryLoadScript = () => {
            if (currentUrlIndex >= cdnUrls.length) {
                if (this.options.debug) {
                    console.error('[Jeeliz Debug] All CDN sources failed');
                }
                return;
            }

            const script = document.createElement('script');
            script.src = cdnUrls[currentUrlIndex];
            script.async = false; // Synchronous loading
            script.type = 'text/javascript';

            // Add error handling
            script.onerror = () => {
                if (this.options.debug) {
                    console.error(`[Jeeliz Debug] Failed to load from: ${cdnUrls[currentUrlIndex]}`);
                }
                currentUrlIndex++;
                setTimeout(tryLoadScript, 100); // Try next CDN with delay
            };

            script.onload = () => {
                if (this.options.debug) {
                    console.log(`[Jeeliz Debug] Script loaded successfully from: ${cdnUrls[currentUrlIndex]}`);
                    console.log('[Jeeliz Debug] window.JEELIZFACEFILTER after load:', window.JEELIZFACEFILTER);
                }
            };

            // Append to head
            document.head.appendChild(script);

            if (this.options.debug) {
                console.log(`[Jeeliz Debug] Loading from: ${cdnUrls[currentUrlIndex]}`);
            }
        };

        tryLoadScript();
    }

    /**
     * Called when Jeeliz is ready
     */
    private onReady(): void {
        this.isInitialized = true;
        this.status = 'ready';
        if (this.options.debug) {
            console.log('[Jeeliz Debug] FaceFilter ready');
        }
        this.callbacks.onReady?.();
    }

    /**
     * Called when face detection results are available
     */
    private onTrack(detectedStates: any): void {
        this.frameCount = (this.frameCount + 1) % (this.options.frameSkip || 1);

        // Skip frames based on frameSkip setting
        if (this.frameCount !== 0) {
            return;
        }

        try {
            if (this.options.debug) {
                console.log('[Jeeliz Debug] onTrack called with states:', detectedStates);
                console.log('[Jeeliz Debug] States type:', typeof detectedStates, 'Is array:', Array.isArray(detectedStates));
                if (detectedStates && typeof detectedStates === 'object') {
                    console.log('[Jeeliz Debug] States keys:', Object.keys(detectedStates));
                }
            }

            // Handle different Jeeliz callback formats
            let statesArray: any[] = [];

            if (Array.isArray(detectedStates)) {
                // Direct array format
                statesArray = detectedStates;
            } else if (detectedStates && typeof detectedStates === 'object') {
                // Object format - check for common properties
                if (detectedStates.states) {
                    statesArray = detectedStates.states;
                } else if (detectedStates.detections) {
                    statesArray = detectedStates.detections;
                } else if (detectedStates.faces) {
                    statesArray = detectedStates.faces;
                } else {
                    // Single state object - this is what we're getting
                    statesArray = [detectedStates];
                }
            }

            if (this.options.debug) {
                console.log('[Jeeliz Debug] Processed states array:', statesArray);
                if (statesArray.length > 0) {
                    console.log('[Jeeliz Debug] First state keys:', Object.keys(statesArray[0]));
                }
            }

            if (this.options.debug) {
                console.log('[Jeeliz Debug] Processed states array:', statesArray);
            }

            // Convert Jeeliz format to our interface
            const detections: JeelizFaceDetection[] = statesArray
                .filter((state: any) => state && (state.state === 1 || state.detected > 0.5)) // Handle different state formats
                .map((state: any) => this.convertJeelizState(state))
                .filter((detection: JeelizFaceDetection) =>
                    detection.confidence && detection.confidence >= (this.options.detectionThreshold || 0.1) // Lower threshold for testing
                );

            this.lastDetections = detections;

            if (this.options.debug) {
                console.log('[Jeeliz Debug] Raw states:', statesArray.length, 'Detected faces:', detections.length);
                if (detections.length > 0) {
                    console.log('[Jeeliz Debug] First detection:', detections[0]);
                } else if (statesArray.length > 0) {
                    console.log('[Jeeliz Debug] Raw state sample:', statesArray[0]);
                }
            }

            this.callbacks.onTrack?.(detections);
        } catch (err) {
            if (this.options.debug) {
                console.error('[Jeeliz Debug] Error in onTrack:', err);
                console.error('[Jeeliz Debug] Error stack:', err instanceof Error ? err.stack : 'No stack');
                console.error('[Jeeliz Debug] detectedStates:', detectedStates);
            }
            const error: JeelizError = {
                type: 'detection',
                message: 'Error processing face detection results',
                details: err,
            };
            this.error = error;
            this.callbacks.onError?.(error);
        }
    }

    /**
     * Convert Jeeliz state format to our interface
     */
    private convertJeelizState(state: any): JeelizFaceDetection {
        if (this.options.debug) {
            console.log('[Jeeliz Debug] Converting state:', state);
        }

        try {
            // Handle the actual Jeeliz format we're receiving
            // The object has: detected, x, y, s, xRaw, yRaw, sRaw, etc.
            const stateValue = state.detected > 0.5 ? 1 : 0; // Convert confidence to state
            const confidence = state.detected || 0;

            // Calculate bounding box from x, y, s (scale)
            const x = state.x || 0;
            const y = state.y || 0;
            const s = state.s || 0;

            // Convert normalized coordinates to pixel coordinates
            const canvasWidth = 640; // Default canvas width
            const canvasHeight = 480; // Default canvas height

            const boundingBox = {
                x: x * canvasWidth - (s * canvasWidth) / 2,
                y: y * canvasHeight - (s * canvasHeight) / 2,
                width: s * canvasWidth,
                height: s * canvasHeight,
            };

            // For now, use default values for other properties
            const rotation: [number, number, number] = [0, 0, 0]; // No rotation data in this format
            const mouth = 0; // No mouth data in this format
            const landmarks: number[][] = []; // No landmarks in this format

            const result: JeelizFaceDetection = {
                state: stateValue as 0 | 1,
                rotation,
                mouth,
                landmarks,
                boundingBox,
                confidence,
            };

            if (this.options.debug) {
                console.log('[Jeeliz Debug] Converted result:', result);
            }

            return result;
        } catch (err) {
            if (this.options.debug) {
                console.error('[Jeeliz Debug] Error converting state:', err);
                console.error('[Jeeliz Debug] State that caused error:', state);
            }
            throw err;
        }
    }

    /**
     * Get current face detections
     */
    getDetections(): JeelizFaceDetection[] {
        return this.lastDetections;
    }

    /**
     * Get current status
     */
    getStatus(): JeelizStatus {
        return this.status;
    }

    /**
     * Get current error
     */
    getError(): JeelizError | null {
        return this.error;
    }

    /**
     * Check if Jeeliz is initialized
     */
    isReady(): boolean {
        return this.isInitialized && this.status === 'ready';
    }

    /**
     * Update options
     */
    updateOptions(options: Partial<JeelizManagerOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Update callbacks
     */
    updateCallbacks(callbacks: JeelizCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Destroy and cleanup
     */
    destroy(): void {
        if (this.faceFilter && typeof this.faceFilter.destroy === 'function') {
            this.faceFilter.destroy();
        }
        this.faceFilter = null;
        this.isInitialized = false;
        this.status = 'loading';
        this.error = null;
        this.lastDetections = [];
    }
} 