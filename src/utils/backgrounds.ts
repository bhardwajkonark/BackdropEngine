export type BackgroundType = 'blur' | 'image';

export interface BackgroundOption {
    label: string;
    type: BackgroundType;
    src?: string; // Only for image type
}

export interface LoadedBackground {
    option: BackgroundOption;
    image?: HTMLImageElement; // Only for image type
    isReady: boolean;
    error?: Error;
}

/**
 * Preloads a list of background options (images) and returns their loaded state.
 */
export async function preloadBackgrounds(options: BackgroundOption[]): Promise<LoadedBackground[]> {
    const results: LoadedBackground[] = await Promise.all(
        options.map(async (option) => {
            if (option.type === 'image' && option.src) {
                try {
                    const img = await loadImage(option.src);
                    return { option, image: img, isReady: true };
                } catch (err: any) {
                    return { option, isReady: false, error: err };
                }
            }
            // Blur or other types don't need preloading
            return { option, isReady: true };
        })
    );
    return results;
}

/**
 * Loads an image and returns a promise that resolves when loaded.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image: ${src}`));
    });
} 