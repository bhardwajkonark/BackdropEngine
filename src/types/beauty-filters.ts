export type BeautyFilterType = 'none' | 'skin-smoothing' | 'brightness-contrast' | 'highlight' | 'soft-glow' | 'sharpen' | 'color-boost';

export interface BeautyFilterOption {
    label: string;
    type: BeautyFilterType;
    intensity?: number; // 0-1, only for filters that support intensity
}

export interface LoadedBeautyFilter {
    option: BeautyFilterOption;
    isReady: boolean;
    error?: Error;
}

/**
 * Preloads a list of beauty filter options and returns their loaded state.
 */
export async function preloadBeautyFilters(options: BeautyFilterOption[]): Promise<LoadedBeautyFilter[]> {
    const results: LoadedBeautyFilter[] = await Promise.all(
        options.map(async (option) => {
            // For now, all filters are ready immediately since they don't need external resources
            // In the future, this could load shaders, models, etc.
            return { option, isReady: true };
        })
    );
    return results;
} 