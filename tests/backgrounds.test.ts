// @jest-environment jsdom
import { preloadBackgrounds, loadImage, BackgroundOption } from '../src/utils/backgrounds';

describe('Background Management', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('preloads valid image backgrounds', async () => {
        const option: BackgroundOption = { label: 'Test', type: 'image', src: 'test.jpg' };
        jest.spyOn(window, 'Image').mockImplementation(() => {
            const img: any = {};
            setTimeout(() => img.onload && img.onload(), 0);
            return img;
        });
        const result = await preloadBackgrounds([option]);
        expect(result[0].isReady).toBe(true);
        expect(result[0].image).toBeDefined();
    });

    it('handles image load errors (invalid URL, 404)', async () => {
        const option: BackgroundOption = { label: 'Bad', type: 'image', src: 'bad.jpg' };
        jest.spyOn(window, 'Image').mockImplementation(() => {
            const img: any = {};
            setTimeout(() => img.onerror && img.onerror(new Error('fail')), 0);
            return img;
        });
        const result = await preloadBackgrounds([option]);
        expect(result[0].isReady).toBe(false);
        expect(result[0].error).toBeInstanceOf(Error);
    });

    it('supports blur mode (no image preload)', async () => {
        const option: BackgroundOption = { label: 'Blur', type: 'blur' };
        const result = await preloadBackgrounds([option]);
        expect(result[0].isReady).toBe(true);
        expect(result[0].image).toBeUndefined();
    });

    it('returns correct loaded state for all backgrounds', async () => {
        const options: BackgroundOption[] = [
            { label: 'Blur', type: 'blur' },
            { label: 'Image', type: 'image', src: 'img.jpg' },
        ];
        jest.spyOn(window, 'Image').mockImplementation(() => {
            const img: any = {};
            setTimeout(() => img.onload && img.onload(), 0);
            return img;
        });
        const result = await preloadBackgrounds(options);
        expect(result.length).toBe(2);
        expect(result[0].isReady).toBe(true);
        expect(result[1].isReady).toBe(true);
    });

    it('handles dynamic update of backgrounds', async () => {
        const options1: BackgroundOption[] = [
            { label: 'Blur', type: 'blur' },
        ];
        const options2: BackgroundOption[] = [
            { label: 'Blur', type: 'blur' },
            { label: 'Image', type: 'image', src: 'img2.jpg' },
        ];
        jest.spyOn(window, 'Image').mockImplementation(() => {
            const img: any = {};
            setTimeout(() => img.onload && img.onload(), 0);
            return img;
        });
        const result1 = await preloadBackgrounds(options1);
        const result2 = await preloadBackgrounds(options2);
        expect(result1.length).toBe(1);
        expect(result2.length).toBe(2);
    });
}); 