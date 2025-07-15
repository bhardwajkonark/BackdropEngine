import { JeelizFaceDetection, FaceFilter } from '../types/jeeliz';

export type BeautyFilterType = 'skin-smoothing' | 'eye-enhancement' | 'lip-enhancement' | 'face-contouring' | 'blush' | 'brightening';

export interface BeautyFilter {
    id: string;
    type: BeautyFilterType;
    intensity?: number; // 0-1, default 0.5
    enabled?: boolean;
    // Specific options for each filter type
    options?: {
        // Skin smoothing
        blurRadius?: number;
        // Eye enhancement
        brightness?: number;
        contrast?: number;
        // Lip enhancement
        color?: string;
        // Face contouring
        slimFactor?: number;
        // Blush
        blushColor?: string;
        blushOpacity?: number;
    };
}

export class BeautyFilterRenderer {
    private filterCache = new Map<string, HTMLCanvasElement>();

    /**
     * Apply beauty filters to a canvas with face detection
     */
    async applyBeautyFilters(
        canvas: HTMLCanvasElement,
        detections: JeelizFaceDetection[],
        filters: BeautyFilter[]
    ): Promise<void> {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('No 2D context available on canvas');
        }

        for (const detection of detections) {
            if (detection.state === 1) { // Face detected
                for (const filter of filters) {
                    if (filter.enabled !== false) {
                        await this.applyBeautyFilter(ctx, detection, filter, canvas.width, canvas.height);
                    }
                }
            }
        }
    }

    /**
     * Apply a single beauty filter
     */
    private async applyBeautyFilter(
        ctx: CanvasRenderingContext2D,
        detection: JeelizFaceDetection,
        filter: BeautyFilter,
        canvasWidth: number,
        canvasHeight: number
    ): Promise<void> {
        const intensity = filter.intensity ?? 0.5;

        console.log('[BeautyFilter Debug] Applying filter:', filter.id, 'type:', filter.type, 'intensity:', intensity);

        switch (filter.type) {
            case 'skin-smoothing':
                await this.applySkinSmoothing(ctx, detection, intensity, filter.options);
                break;
            case 'eye-enhancement':
                await this.applyEyeEnhancement(ctx, detection, intensity, filter.options);
                break;
            case 'lip-enhancement':
                await this.applyLipEnhancement(ctx, detection, intensity, filter.options);
                break;
            case 'face-contouring':
                await this.applyFaceContouring(ctx, detection, intensity, filter.options);
                break;
            case 'blush':
                await this.applyBlush(ctx, detection, intensity, filter.options);
                break;
            case 'brightening':
                await this.applyBrightening(ctx, detection, intensity, filter.options);
                break;
        }
    }

    /**
     * Apply skin smoothing effect
     */
    private async applySkinSmoothing(
        ctx: CanvasRenderingContext2D,
        detection: JeelizFaceDetection,
        intensity: number,
        options?: any
    ): Promise<void> {
        const { x, y, width, height } = detection.boundingBox;
        const blurRadius = (options?.blurRadius ?? 3) * intensity;

        // Create a mask for the face area
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
        ctx.clip();

        // Apply blur filter
        ctx.filter = `blur(${blurRadius}px)`;

        // Draw the face area with blur
        ctx.drawImage(ctx.canvas, x, y, width, height, x, y, width, height);

        ctx.restore();
        console.log('[BeautyFilter Debug] Applied skin smoothing with blur radius:', blurRadius);
    }

    /**
     * Apply eye enhancement
     */
    private async applyEyeEnhancement(
        ctx: CanvasRenderingContext2D,
        detection: JeelizFaceDetection,
        intensity: number,
        options?: any
    ): Promise<void> {
        const landmarks = detection.landmarks;
        if (!landmarks || landmarks.length < 133) {
            console.log('[BeautyFilter Debug] Not enough landmarks for eye enhancement');
            return;
        }

        const brightness = (options?.brightness ?? 1.2) * intensity;
        const contrast = (options?.contrast ?? 1.1) * intensity;

        // Get eye regions
        const leftEye = landmarks[33];
        const rightEye = landmarks[133];

        if (leftEye && rightEye) {
            // Enhance left eye
            this.enhanceEyeRegion(ctx, leftEye, brightness, contrast);
            // Enhance right eye
            this.enhanceEyeRegion(ctx, rightEye, brightness, contrast);

            console.log('[BeautyFilter Debug] Applied eye enhancement with brightness:', brightness, 'contrast:', contrast);
        }
    }

    /**
     * Enhance a specific eye region
     */
    private enhanceEyeRegion(
        ctx: CanvasRenderingContext2D,
        eyeCenter: number[],
        brightness: number,
        contrast: number
    ): void {
        const [x, y] = eyeCenter;
        const eyeSize = 30; // Approximate eye size

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, eyeSize, 0, 2 * Math.PI);
        ctx.clip();

        // Apply brightness and contrast
        ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
        ctx.drawImage(ctx.canvas, x - eyeSize, y - eyeSize, eyeSize * 2, eyeSize * 2, x - eyeSize, y - eyeSize, eyeSize * 2, eyeSize * 2);

        ctx.restore();
    }

    /**
     * Apply lip enhancement
     */
    private async applyLipEnhancement(
        ctx: CanvasRenderingContext2D,
        detection: JeelizFaceDetection,
        intensity: number,
        options?: any
    ): Promise<void> {
        const landmarks = detection.landmarks;
        if (!landmarks || landmarks.length < 14) {
            console.log('[BeautyFilter Debug] Not enough landmarks for lip enhancement');
            return;
        }

        const lipColor = options?.color ?? '#ff6b9d';
        const mouthLeft = landmarks[13];
        const mouthRight = landmarks[14];

        if (mouthLeft && mouthRight) {
            const centerX = (mouthLeft[0] + mouthRight[0]) / 2;
            const centerY = (mouthLeft[1] + mouthRight[1]) / 2;
            const lipWidth = Math.abs(mouthRight[0] - mouthLeft[0]);
            const lipHeight = lipWidth * 0.3;

            ctx.save();
            ctx.globalAlpha = intensity * 0.3;
            ctx.fillStyle = lipColor;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, lipWidth / 2, lipHeight, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();

            console.log('[BeautyFilter Debug] Applied lip enhancement with color:', lipColor);
        }
    }

    /**
     * Apply face contouring
     */
    private async applyFaceContouring(
        ctx: CanvasRenderingContext2D,
        detection: JeelizFaceDetection,
        intensity: number,
        options?: any
    ): Promise<void> {
        const { x, y, width, height } = detection.boundingBox;
        const slimFactor = (options?.slimFactor ?? 0.1) * intensity;

        // Create a mask for face slimming
        ctx.save();
        ctx.globalAlpha = intensity * 0.2;
        ctx.fillStyle = '#000';

        // Draw contouring shadows
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Left cheek shadow
        ctx.beginPath();
        ctx.ellipse(centerX - width * 0.3, centerY, width * 0.2, height * 0.4, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Right cheek shadow
        ctx.beginPath();
        ctx.ellipse(centerX + width * 0.3, centerY, width * 0.2, height * 0.4, 0, 0, 2 * Math.PI);
        ctx.fill();

        ctx.restore();
        console.log('[BeautyFilter Debug] Applied face contouring with slim factor:', slimFactor);
    }

    /**
     * Apply blush effect
     */
    private async applyBlush(
        ctx: CanvasRenderingContext2D,
        detection: JeelizFaceDetection,
        intensity: number,
        options?: any
    ): Promise<void> {
        const landmarks = detection.landmarks;
        if (!landmarks || landmarks.length < 352) {
            console.log('[BeautyFilter Debug] Not enough landmarks for blush');
            return;
        }

        const blushColor = options?.blushColor ?? '#ff9999';
        const opacity = (options?.blushOpacity ?? 0.3) * intensity;

        const leftCheek = landmarks[123];
        const rightCheek = landmarks[352];

        if (leftCheek && rightCheek) {
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = blushColor;

            // Left cheek blush
            ctx.beginPath();
            ctx.arc(leftCheek[0], leftCheek[1], 25, 0, 2 * Math.PI);
            ctx.fill();

            // Right cheek blush
            ctx.beginPath();
            ctx.arc(rightCheek[0], rightCheek[1], 25, 0, 2 * Math.PI);
            ctx.fill();

            ctx.restore();
            console.log('[BeautyFilter Debug] Applied blush with color:', blushColor, 'opacity:', opacity);
        }
    }

    /**
     * Apply overall brightening
     */
    private async applyBrightening(
        ctx: CanvasRenderingContext2D,
        detection: JeelizFaceDetection,
        intensity: number,
        options?: any
    ): Promise<void> {
        const { x, y, width, height } = detection.boundingBox;
        const brightness = 1 + (intensity * 0.3); // 1.0 to 1.3

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
        ctx.clip();

        // Apply brightness filter
        ctx.filter = `brightness(${brightness})`;
        ctx.drawImage(ctx.canvas, x, y, width, height, x, y, width, height);

        ctx.restore();
        console.log('[BeautyFilter Debug] Applied brightening with brightness:', brightness);
    }

    /**
     * Clear filter cache
     */
    clearCache(): void {
        this.filterCache.clear();
    }
} 