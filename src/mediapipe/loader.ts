import { MediaPipeModelSelection, MediaPipeLoaderOptions, DEFAULT_MEDIAPIPE_CDN } from '../types/mediapipe';
export { DEFAULT_MEDIAPIPE_CDN } from '../types/mediapipe';

/**
 * Loads the MediaPipe Selfie Segmentation model and exposes model selection.
 * Handles async loading, error reporting, and allows custom CDN/URL if needed.
 * If no cdnUrl is provided, uses the default CDN.
 */
export class MediaPipeLoader {
    private selfieSegmentation: any = null;
    private isLoaded = false;
    private loadError: Error | null = null;
    private cdnUrl: string;

    constructor(private options: MediaPipeLoaderOptions) {
        // Use default CDN if not provided
        this.cdnUrl = options.cdnUrl || DEFAULT_MEDIAPIPE_CDN;
    }

    /**
     * Loads the MediaPipe Selfie Segmentation model asynchronously.
     */
    async load(): Promise<void> {
        if (this.isLoaded) return;
        try {
            // @ts-ignore
            const SelfieSegmentation = window.SelfieSegmentation || (await this.loadScript(this.cdnUrl));
            this.selfieSegmentation = new SelfieSegmentation({
                locateFile: (file: string) => `${this.cdnUrl}/${file}`,
            });
            this.setModelSelection(this.options.modelSelection || 0);
            this.isLoaded = true;
        } catch (err) {
            this.loadError = err instanceof Error ? err : new Error(String(err));
            throw this.loadError;
        }
    }

    /**
     * Sets the segmentation model (0: landscape/fast, 1: selfie/better).
     */
    setModelSelection(model: MediaPipeModelSelection) {
        if (this.selfieSegmentation) {
            this.selfieSegmentation.setOptions({ modelSelection: model });
        }
    }

    /**
     * Returns the loaded MediaPipe SelfieSegmentation instance.
     */
    getInstance() {
        if (!this.isLoaded) throw new Error('MediaPipe not loaded');
        return this.selfieSegmentation;
    }

    /**
     * Loads a script dynamically if not already present.
     */
    private loadScript(src: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (window.SelfieSegmentation) return resolve(window.SelfieSegmentation);
            const script = document.createElement('script');
            script.src = `${src}/selfie_segmentation.js`;
            script.async = true;
            script.onload = () => resolve(window.SelfieSegmentation);
            script.onerror = () => reject(new Error('Failed to load MediaPipe script'));
            document.head.appendChild(script);
        });
    }

    /**
     * Returns the last error encountered during loading, if any.
     */
    getError() {
        return this.loadError;
    }
} 