export type CompositingMode = 'blur' | 'image';

export interface CompositingOptions {
    mode: CompositingMode;
    blurRadius?: number; // Only for blur mode
    backgroundImage?: HTMLImageElement; // Only for image mode
    mirror?: boolean;
    debugMode?: 'video' | 'mask' | 'temp' | undefined; // Add debug mode
}

// Reusable offscreen canvas for compositing
let reusableTempCanvas: HTMLCanvasElement | null = null;

/**
 * Composites the person (from segmentation mask) with the chosen background on the output canvas.
 * - Supports 'blur' and 'image' modes.
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

    // Robustly determine input size
    let width = outputCanvas.width;
    let height = outputCanvas.height;
    if (inputImage instanceof HTMLVideoElement) {
        width = inputImage.videoWidth;
        height = inputImage.videoHeight;
    } else if ('width' in inputImage && 'height' in inputImage) {
        width = (inputImage as any).width;
        height = (inputImage as any).height;
    }
    if (!width || !height) {
        console.warn('[WebcamBG Debug] Invalid inputImage size:', width, height, inputImage);
        return;
    }
    outputCanvas.width = width;
    outputCanvas.height = height;

    // Defensive: check segmentationMask
    let maskWidth = 0, maskHeight = 0;
    if (segmentationMask instanceof HTMLVideoElement) {
        maskWidth = segmentationMask.videoWidth;
        maskHeight = segmentationMask.videoHeight;
    } else if ('width' in segmentationMask && 'height' in segmentationMask) {
        maskWidth = (segmentationMask as any).width;
        maskHeight = (segmentationMask as any).height;
    }
    if (!maskWidth || !maskHeight) {
        console.warn('[WebcamBG Debug] Invalid segmentationMask size:', maskWidth, maskHeight, segmentationMask);
        return;
    }

    // Debug: draw only video
    if (options.debugMode === 'video') {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(inputImage, 0, 0, width, height);
        return;
    }
    // Debug: draw only mask
    if (options.debugMode === 'mask') {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(segmentationMask, 0, 0, width, height);
        return;
    }

    // Optional mirroring
    if (options.mirror) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
    }

    // Step 1: Draw background
    if (options.mode === 'blur') {
        ctx.save();
        ctx.filter = `blur(${options.blurRadius ?? 10}px)`;
        ctx.drawImage(inputImage, 0, 0, width, height);
        ctx.restore();
    } else if (options.mode === 'image' && options.backgroundImage) {
        ctx.drawImage(options.backgroundImage, 0, 0, width, height);
    } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
    }

    // Step 2: Overlay the person (using mask)
    // Use a reusable offscreen canvas for compositing
    if (!reusableTempCanvas) {
        reusableTempCanvas = document.createElement('canvas');
    }
    const tempCanvas = reusableTempCanvas;
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('No 2D context on temp canvas');

    tempCtx.clearRect(0, 0, width, height);
    tempCtx.drawImage(inputImage, 0, 0, width, height);
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(segmentationMask, 0, 0, width, height);
    tempCtx.globalCompositeOperation = 'source-over';

    // Debug: draw only temp composited canvas
    if (options.debugMode === 'temp') {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tempCanvas, 0, 0);
        if (options.mirror) ctx.restore();
        return;
    }

    ctx.drawImage(tempCanvas, 0, 0);

    if (options.mirror) ctx.restore();
} 