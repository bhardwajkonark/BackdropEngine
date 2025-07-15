/**
 * Jeeliz FaceFilter integration types
 */

/**
 * Face detection state from Jeeliz
 * 0: not detected, 1: detected
 */
export type JeelizDetectionState = 0 | 1;

/**
 * Facial landmarks from Jeeliz (468 points)
 */
export type FacialLandmarks = number[][];

/**
 * Face detection result from Jeeliz
 */
export interface JeelizFaceDetection {
    state: JeelizDetectionState; // 0: not detected, 1: detected
    rotation: [number, number, number]; // [x, y, z] in radians
    mouth: number; // 0: closed, 1: open
    landmarks: FacialLandmarks; // 468 facial landmarks
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence?: number; // Detection confidence (0-1)
}

/**
 * Face filter types
 */
export type FaceFilterType = 'overlay' | 'color' | 'distortion' | 'animation';

/**
 * Filter position on face
 */
export type FilterPosition = 'eyes' | 'nose' | 'mouth' | 'face' | 'forehead' | 'cheeks';

/**
 * Filter transformation options
 */
export interface FilterTransform {
    scale?: number;
    rotation?: number; // in radians
    offset?: { x: number; y: number };
    opacity?: number; // 0-1
}

/**
 * Face filter configuration
 */
export interface FaceFilter {
    id: string;
    type: FaceFilterType;
    source?: string; // URL or data URL for overlay images
    position: FilterPosition;
    transform?: FilterTransform;
    enabled?: boolean;
    // For color filters
    color?: string;
    intensity?: number; // 0-1
    // For animation filters
    animation?: {
        duration: number; // in milliseconds
        loop?: boolean;
        keyframes?: any[];
    };
}

/**
 * Jeeliz manager options
 */
export interface JeelizManagerOptions {
    NNPath?: string; // Neural network path
    maxFaces?: number; // Maximum faces to detect
    detectionThreshold?: number; // Detection confidence threshold
    frameSkip?: number; // Process every Nth frame
    debug?: boolean; // Enable debug logging
}

/**
 * Jeeliz manager status
 */
export type JeelizStatus = 'loading' | 'ready' | 'error';

/**
 * Jeeliz manager error
 */
export interface JeelizError {
    type: 'initialization' | 'detection' | 'network' | 'compatibility';
    message: string;
    details?: any;
}

/**
 * Jeeliz callback functions
 */
export interface JeelizCallbacks {
    onReady?: () => void;
    onTrack?: (detectedStates: JeelizFaceDetection[]) => void;
    onError?: (error: JeelizError) => void;
}

/**
 * Jeeliz initialization options
 */
export interface JeelizInitOptions extends JeelizManagerOptions, JeelizCallbacks {
    canvas: HTMLCanvasElement;
    callbackReady?: () => void;
    callbackTrack?: (detectedStates: any[]) => void;
}

// Extend the Window interface to include Jeeliz for type safety
declare global {
    interface Window {
        JEELIZFACEFILTER?: any;
        JEEFACEFILTER?: any; // Fallback for older versions
    }
} 