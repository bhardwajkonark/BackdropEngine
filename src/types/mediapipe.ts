/**
 * Model selection for MediaPipe Selfie Segmentation.
 * 0 = Landscape (Fast), 1 = Selfie (Better)
 */
export type MediaPipeModelSelection = 0 | 1;

/**
 * Default CDN URL for MediaPipe Selfie Segmentation.
 */
export const DEFAULT_MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation';

/**
 * Options for initializing the MediaPipeLoader.
 * If cdnUrl is not provided, the default CDN will be used.
 */
export interface MediaPipeLoaderOptions {
    cdnUrl?: string; // Base URL for MediaPipe scripts (default: DEFAULT_MEDIAPIPE_CDN)
    modelSelection?: MediaPipeModelSelection;
    debug?: boolean;
}

// Extend the Window interface to include SelfieSegmentation for type safety
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
    interface Window {
        SelfieSegmentation?: any;
    }
} 