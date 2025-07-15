import { JeelizFaceDetection } from '../types/jeeliz';
import { BeautyFilter, BeautyFilterRenderer } from './faceFilters';

export type CompositingMode = 'none' | 'blur' | 'image';

export interface CompositingOptions {
    mode: CompositingMode;
    blurRadius?: number; // Only for blur mode
    backgroundImage?: HTMLImageElement; // Only for image mode
    mirror?: boolean;
    debugMode?: 'video' | 'mask' | 'temp' | undefined; // Add debug mode
    // Beauty filter options
    faceDetections?: JeelizFaceDetection[];
    beautyFilters?: BeautyFilter[];
}

// Reusable offscreen canvas for compositing
let reusableTempCanvas: HTMLCanvasElement | null = null;
// Reusable conversion canvas for ImageBitmap to Canvas (for Firefox)
let reusableBitmapToCanvas: HTMLCanvasElement | null = null;

// Utility: Detect if running in Firefox
function isFirefox() {
    return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
}

// Utility: Convert ImageBitmap to Canvas (for Firefox optimization)
let hasLoggedBitmapToCanvas = false;
function imageBitmapToCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
    if (!reusableBitmapToCanvas) {
        reusableBitmapToCanvas = document.createElement('canvas');
    }
    reusableBitmapToCanvas.width = bitmap.width;
    reusableBitmapToCanvas.height = bitmap.height;
    const ctx = reusableBitmapToCanvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, bitmap.width, bitmap.height);
        ctx.drawImage(bitmap, 0, 0);
    }
    if (!hasLoggedBitmapToCanvas) {
        // eslint-disable-next-line no-console
        console.log('[WebcamBG Debug] Using Firefox ImageBitmap-to-Canvas optimization.');
        hasLoggedBitmapToCanvas = true;
    }
    return reusableBitmapToCanvas;
}

/**
 * Composites the person (from segmentation mask) with the chosen background on the output canvas.
 * - Supports 'none', 'blur', and 'image' modes.
 * - UI-agnostic: you provide the canvases and images.
 */
export function compositeFrame({
    inputImage,
    segmentationMask,
    outputCanvas,
    options,
}: {
    inputImage: CanvasImageSource;
    segmentationMask: CanvasImageSource;
    outputCanvas: HTMLCanvasElement;
    options: CompositingOptions;
}) {
    // Validate input image dimensions
    const inputWidth = (inputImage as any).width || (inputImage as any).videoWidth || 0;
    const inputHeight = (inputImage as any).height || (inputImage as any).videoHeight || 0;

    if (inputWidth === 0 || inputHeight === 0) {
        console.warn('[Compositor Debug] Input image has zero dimensions, skipping compositing:', {
            inputWidth,
            inputHeight,
            inputImageType: inputImage.constructor.name,
        });
        return;
    }

    // Validate canvas and get context
    if (!outputCanvas) {
        throw new Error('Output canvas is null or undefined');
    }

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) {
        console.error('[Compositor Debug] Canvas details:', {
            width: outputCanvas.width,
            height: outputCanvas.height,
            offsetWidth: outputCanvas.offsetWidth,
            offsetHeight: outputCanvas.offsetHeight,
            style: outputCanvas.style.cssText,
        });
        throw new Error('No 2D context on output canvas');
    }

    // Set canvas size to match input
    outputCanvas.width = (inputImage as any).width || outputCanvas.width;
    outputCanvas.height = (inputImage as any).height || outputCanvas.height;

    // Optional mirroring
    if (options.mirror) {
        ctx.save();
        ctx.translate(outputCanvas.width, 0);
        ctx.scale(-1, 1);
    }

    // Step 1: Draw background
    if (options.mode === 'none') {
        ctx.drawImage(inputImage, 0, 0, outputCanvas.width, outputCanvas.height);
        if (options.mirror) ctx.restore();
        return;
    }
    if (options.mode === 'blur') {
        ctx.save();
        ctx.filter = `blur(${options.blurRadius ?? 10}px)`;
        ctx.drawImage(inputImage, 0, 0, outputCanvas.width, outputCanvas.height);
        ctx.restore();
    } else if (options.mode === 'image' && options.backgroundImage) {
        ctx.drawImage(options.backgroundImage, 0, 0, outputCanvas.width, outputCanvas.height);
    } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    }

    // Step 2: Overlay the person (using mask)
    // Use an offscreen canvas for compositing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = outputCanvas.width;
    tempCanvas.height = outputCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('No 2D context on temp canvas');

    tempCtx.drawImage(inputImage, 0, 0, outputCanvas.width, outputCanvas.height);
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(segmentationMask, 0, 0, outputCanvas.width, outputCanvas.height);
    tempCtx.globalCompositeOperation = 'source-over';

    // Debug: draw only temp composited canvas
    if (options.debugMode === 'temp') {
        ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
        if (options.mirror) ctx.restore();
        return;
    }

    ctx.drawImage(tempCanvas, 0, 0);

    if (options.mirror) ctx.restore();
}

/**
 * Composites the person (from segmentation mask) with beauty filters and the chosen background on the output canvas.
 * - Supports 'none', 'blur', and 'image' modes.
 * - Supports beauty filters with facial landmark positioning.
 * - UI-agnostic: you provide the canvases and images.
 */
export async function compositeFrameWithBeautyFilters({
    inputImage,
    segmentationMask,
    faceDetections,
    beautyFilters,
    outputCanvas,
    options,
}: {
    inputImage: CanvasImageSource;
    segmentationMask: CanvasImageSource;
    faceDetections?: JeelizFaceDetection[];
    beautyFilters?: BeautyFilter[];
    outputCanvas: HTMLCanvasElement;
    options: CompositingOptions;
}) {
    // Validate input image dimensions
    const inputWidth = (inputImage as any).width || (inputImage as any).videoWidth || 0;
    const inputHeight = (inputImage as any).height || (inputImage as any).videoHeight || 0;

    if (inputWidth === 0 || inputHeight === 0) {
        console.warn('[Compositor Debug] Input image has zero dimensions, skipping beauty filter compositing:', {
            inputWidth,
            inputHeight,
            inputImageType: inputImage.constructor.name,
        });
        return;
    }

    // Validate canvas and get context
    if (!outputCanvas) {
        throw new Error('Output canvas is null or undefined');
    }

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) {
        console.error('[Compositor Debug] Canvas details:', {
            width: outputCanvas.width,
            height: outputCanvas.height,
            offsetWidth: outputCanvas.offsetWidth,
            offsetHeight: outputCanvas.offsetHeight,
            style: outputCanvas.style.cssText,
        });
        throw new Error('No 2D context on output canvas');
    }

    // Set canvas size to match input
    outputCanvas.width = (inputImage as any).width || outputCanvas.width;
    outputCanvas.height = (inputImage as any).height || outputCanvas.height;

    // Optional mirroring
    if (options.mirror) {
        ctx.save();
        ctx.translate(outputCanvas.width, 0);
        ctx.scale(-1, 1);
    }

    // Step 1: Draw background
    if (options.mode === 'none') {
        ctx.drawImage(inputImage, 0, 0, outputCanvas.width, outputCanvas.height);
    } else if (options.mode === 'blur') {
        ctx.save();
        ctx.filter = `blur(${options.blurRadius ?? 10}px)`;
        ctx.drawImage(inputImage, 0, 0, outputCanvas.width, outputCanvas.height);
        ctx.restore();
    } else if (options.mode === 'image' && options.backgroundImage) {
        ctx.drawImage(options.backgroundImage, 0, 0, outputCanvas.width, outputCanvas.height);
    } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    }

    // Step 2: Extract person using segmentation mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = outputCanvas.width;
    tempCanvas.height = outputCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('No 2D context on temp canvas');

    tempCtx.drawImage(inputImage, 0, 0, outputCanvas.width, outputCanvas.height);
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(segmentationMask, 0, 0, outputCanvas.width, outputCanvas.height);
    tempCtx.globalCompositeOperation = 'source-over';

    // Step 3: Apply beauty filters if available
    if (faceDetections && beautyFilters && beautyFilters.length > 0) {
        console.log('[Compositor Debug] Applying beauty filters. Detections:', faceDetections.length, 'Filters:', beautyFilters.length);
        const beautyFilterRenderer = new BeautyFilterRenderer();

        // Apply beauty filters to the person (temp canvas)
        await beautyFilterRenderer.applyBeautyFilters(tempCanvas, faceDetections, beautyFilters);
    } else {
        console.log('[Compositor Debug] No beauty filters to apply. Detections:', faceDetections?.length || 0, 'Filters:', beautyFilters?.length || 0);
    }

    // Step 4: Composite person with filters onto background
    ctx.drawImage(tempCanvas, 0, 0);

    if (options.mirror) ctx.restore();
} 