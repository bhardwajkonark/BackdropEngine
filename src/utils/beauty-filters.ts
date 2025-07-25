import { BeautyFilterType } from '../types/beauty-filters';

export interface BeautyFilterOptions {
    type: BeautyFilterType;
    intensity?: number; // 0-1 for filters that support intensity
}

// Constants for better maintainability
const MAX_BLUR_RADIUS = 20;
const MAX_BLEND_ALPHA = 0.7; // Cap at 50% to avoid over-blending

// Performance optimization: Reuse temp canvases
const tempCanvas = document.createElement('canvas');
const originalCanvas = document.createElement('canvas');

/**
 * Applies beauty filters to a canvas element.
 * Currently supports skin smoothing with Gaussian blur.
 */
export function applyBeautyFilter(
    canvas: HTMLCanvasElement,
    options: BeautyFilterOptions
): void {
    if (options.type === 'none' || !options.intensity || options.intensity <= 0) {
        return; // No filter to apply
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('No 2D context available on canvas');
    }

    switch (options.type) {
        case 'skin-smoothing':
            applySkinSmoothing(canvas, options.intensity);
            break;
        case 'brightness-contrast':
            applyBrightnessContrast(canvas, options.intensity);
            break;
        case 'highlight':
            applyHighlight(canvas, options.intensity);
            break;
        case 'soft-glow':
            applySoftGlow(canvas, options.intensity);
            break;
        case 'sharpen':
            applySharpen(canvas, options.intensity);
            break;
        case 'color-boost':
            applyColorBoost(canvas, options.intensity);
            break;
        default:
            // Unknown filter type, ignore
            break;
    }
}

/**
 * Applies skin smoothing using a more performant approach.
 * Uses CSS filters for better performance instead of pixel manipulation.
 */
function applySkinSmoothing(canvas: HTMLCanvasElement, intensity: number): void {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Calculate blur radius based on intensity (0-MAX_BLUR_RADIUS range)
    const blurRadius = Math.max(0, Math.min(MAX_BLUR_RADIUS, intensity * MAX_BLUR_RADIUS));

    if (blurRadius <= 0) return;

    // Check if canvas filter is supported
    if (!('filter' in ctx)) {
        console.warn('[Beauty Filter] Canvas filter not supported, skipping blur');
        return;
    }

    // Performance optimization: Use reusable temp canvases
    // Update temp canvas dimensions if needed
    if (tempCanvas.width !== canvas.width || tempCanvas.height !== canvas.height) {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        originalCanvas.width = canvas.width;
        originalCanvas.height = canvas.height;
    }

    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return;

    const originalCtx = originalCanvas.getContext('2d');
    if (!originalCtx) return;

    // Copy the current canvas content to original temp canvas
    originalCtx.drawImage(canvas, 0, 0);

    // Apply blur filter to temp canvas
    tempCtx.save();
    tempCtx.filter = `blur(${blurRadius}px)`;
    tempCtx.drawImage(originalCanvas, 0, 0);
    tempCtx.restore();

    // Clear the main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the original image first
    ctx.drawImage(originalCanvas, 0, 0);

    // Set global alpha for blending
    const alpha = intensity * MAX_BLEND_ALPHA;
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'soft-light';
    // Draw the blurred version on top
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    // Reset global alpha
    ctx.globalAlpha = 1.0;
}

/**
 * Applies brightness and contrast adjustments using CSS filters.
 * Fast GPU-accelerated approach for better performance.
 */
function applyBrightnessContrast(canvas: HTMLCanvasElement, intensity: number): void {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const brightness = 1 + intensity * 0.2; // up to 20% brighter
    const contrast = 1 + intensity * 0.3;   // up to 30% more contrast

    // Update temp canvas dimensions if needed
    if (tempCanvas.width !== canvas.width || tempCanvas.height !== canvas.height) {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
    }

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.save();
    tempCtx.filter = `brightness(${brightness}) contrast(${contrast})`;
    tempCtx.drawImage(canvas, 0, 0);
    tempCtx.restore();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
}

/**
 * Applies a radial highlight effect to simulate eye/cheek brightening.
 * Uses a gradient mask for a natural-looking highlight.
 */
function applyHighlight(canvas: HTMLCanvasElement, intensity: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width / 4,
        canvas.width / 2, canvas.height / 2, canvas.width / 1.5
    );
    gradient.addColorStop(0, `rgba(255,255,255,${0.1 * intensity})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Applies a soft glow effect for warm, flattering lighting.
 * Uses radial gradient with lighter composite operation.
 */
function applySoftGlow(canvas: HTMLCanvasElement, intensity: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalAlpha = intensity * 0.15;
    ctx.globalCompositeOperation = 'lighter';

    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width / 4,
        canvas.width / 2, canvas.height / 2, canvas.width
    );
    gradient.addColorStop(0, `rgba(255, 240, 220, 1)`);
    gradient.addColorStop(1, 'rgba(255, 240, 220, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
}

/**
 * Applies edge enhancement to make details pop.
 * Uses a safer approach with controlled blending.
 */
function applySharpen(canvas: HTMLCanvasElement, intensity: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update temp canvas dimensions if needed
    if (tempCanvas.width !== canvas.width || tempCanvas.height !== canvas.height) {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        originalCanvas.width = canvas.width;
        originalCanvas.height = canvas.height;
    }

    const tempCtx = tempCanvas.getContext('2d');
    const originalCtx = originalCanvas.getContext('2d');
    if (!tempCtx || !originalCtx) return;

    // Store original image
    originalCtx.drawImage(canvas, 0, 0);

    // Create blurred version
    tempCtx.save();
    tempCtx.filter = `blur(${0.5 + intensity * 1.5}px)`;
    tempCtx.drawImage(originalCanvas, 0, 0);
    tempCtx.restore();

    // Clear main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw original first
    ctx.drawImage(originalCanvas, 0, 0);

    // Apply sharpening with controlled alpha
    ctx.globalAlpha = intensity * 0.3; // Much more conservative
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(tempCanvas, 0, 0);

    // Reset canvas state
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
}

/**
 * Applies color saturation boost for vibrant, lively appearance.
 * Uses CSS filter for GPU-accelerated performance.
 */
function applyColorBoost(canvas: HTMLCanvasElement, intensity: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!('filter' in ctx)) return;

    // Update temp canvas dimensions if needed
    if (tempCanvas.width !== canvas.width || tempCanvas.height !== canvas.height) {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
    }

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.save();
    const hueShift = intensity > 0.6 ? -2 : 0;
    tempCtx.filter = `saturate(${1 + intensity * 0.5}) hue-rotate(${hueShift}deg)`;

    tempCtx.drawImage(canvas, 0, 0);
    tempCtx.restore();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
} 