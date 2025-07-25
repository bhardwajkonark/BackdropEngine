import { applyBeautyFilter } from './beauty-filters';

export type CompositingMode = 'none' | 'blur' | 'image';

export interface CompositingOptions {
    mode: CompositingMode;
    blurRadius?: number; // Only for blur mode
    backgroundImage?: HTMLImageElement; // Only for image mode
    mirror?: boolean;
    debugMode?: 'video' | 'mask' | 'temp' | undefined; // Add debug mode
    beautyFilter?: {
        type: 'none' | 'skin-smoothing' | 'brightness-contrast' | 'highlight' | 'soft-glow' | 'sharpen' | 'color-boost';
        intensity?: number; // 0-1 for filters that support intensity
    };
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
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context on output canvas');

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

        // Apply beauty filters even in 'none' mode
        if (options.beautyFilter && options.beautyFilter.type !== 'none') {
            try {
                applyBeautyFilter(outputCanvas, {
                    type: options.beautyFilter.type,
                    intensity: options.beautyFilter.intensity || 0.5,
                });
            } catch (err) {
                console.warn('[Compositor] Failed to apply beauty filter:', err);
                // Don't let beauty filter errors break the entire compositing
            }
        } else {
            console.log('[Compositor] No beauty filter to apply in none mode:', options.beautyFilter);
        }

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

    // Apply beauty filters after compositing the person
    if (options.beautyFilter && options.beautyFilter.type !== 'none') {
        try {
            applyBeautyFilter(outputCanvas, {
                type: options.beautyFilter.type,
                intensity: options.beautyFilter.intensity || 0.5,
            });
        } catch (err) {
            console.warn('[Compositor] Failed to apply beauty filter:', err);
            // Don't let beauty filter errors break the entire compositing
        }
    } else {
        console.log('[Compositor] No beauty filter to apply in other modes:', options.beautyFilter);
    }

    if (options.mirror) ctx.restore();
} 