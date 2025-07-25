import { preloadBeautyFilters, BeautyFilterOption } from '../src/types/beauty-filters';
import { applyBeautyFilter } from '../src/utils/beauty-filters';

describe('Beauty Filters', () => {
    describe('preloadBeautyFilters', () => {
        it('should preload beauty filter options', async () => {
            const options: BeautyFilterOption[] = [
                { label: 'None', type: 'none' },
                { label: 'Skin Smoothing', type: 'skin-smoothing', intensity: 0.5 },
            ];

            const loaded = await preloadBeautyFilters(options);

            expect(loaded).toHaveLength(2);
            expect(loaded[0].option.label).toBe('None');
            expect(loaded[0].option.type).toBe('none');
            expect(loaded[0].isReady).toBe(true);
            expect(loaded[1].option.label).toBe('Skin Smoothing');
            expect(loaded[1].option.type).toBe('skin-smoothing');
            expect(loaded[1].option.intensity).toBe(0.5);
            expect(loaded[1].isReady).toBe(true);
        });

        it('should handle empty options array', async () => {
            const loaded = await preloadBeautyFilters([]);
            expect(loaded).toHaveLength(0);
        });
    });

    describe('applyBeautyFilter', () => {
        let canvas: HTMLCanvasElement;

        beforeEach(() => {
            canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'red';
                ctx.fillRect(0, 0, 100, 100);
            }
        });

        it('should not apply filter when type is none', () => {
            const originalData = canvas.toDataURL();

            applyBeautyFilter(canvas, { type: 'none' });

            expect(canvas.toDataURL()).toBe(originalData);
        });

        it('should not apply filter when intensity is 0', () => {
            const originalData = canvas.toDataURL();

            applyBeautyFilter(canvas, { type: 'skin-smoothing', intensity: 0 });

            expect(canvas.toDataURL()).toBe(originalData);
        });

        it('should apply skin smoothing filter', () => {
            const originalData = canvas.toDataURL();

            applyBeautyFilter(canvas, { type: 'skin-smoothing', intensity: 0.5 });

            // The filter should change the image data
            expect(canvas.toDataURL()).not.toBe(originalData);
        });

        it('should throw error when no 2D context is available', () => {
            const canvasWithoutContext = document.createElement('canvas');

            expect(() => {
                applyBeautyFilter(canvasWithoutContext, { type: 'skin-smoothing', intensity: 0.5 });
            }).toThrow('No 2D context available on canvas');
        });
    });
}); 