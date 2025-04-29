export type CompositingMode = 'blur' | 'image';

export interface CompositingOptions {
    mode: CompositingMode;
    blurRadius?: number; // Only for blur mode
    backgroundImage?: HTMLImageElement; // Only for image mode
    mirror?: boolean;
}

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

    ctx.drawImage(tempCanvas, 0, 0);

    if (options.mirror) ctx.restore();
} 