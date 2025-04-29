// @jest-environment jsdom
import { MediaPipeLoader, DEFAULT_MEDIAPIPE_CDN } from '../src/mediapipe/loader';

describe('MediaPipeLoader', () => {
    let originalSelfieSegmentation: any;
    beforeEach(() => {
        originalSelfieSegmentation = (window as any).SelfieSegmentation;
        (window as any).SelfieSegmentation = undefined;
    });
    afterEach(() => {
        (window as any).SelfieSegmentation = originalSelfieSegmentation;
        jest.restoreAllMocks();
    });

    it('loads MediaPipe Selfie Segmentation from default CDN', async () => {
        const mockCtor = jest.fn().mockImplementation(() => ({ setOptions: jest.fn() }));
        (window as any).SelfieSegmentation = mockCtor;
        const loader = new MediaPipeLoader({});
        await loader.load();
        expect(loader.getInstance()).toBeDefined();
        expect(mockCtor).toHaveBeenCalled();
    });

    it('loads from custom CDN URL', async () => {
        const mockCtor = jest.fn().mockImplementation(() => ({ setOptions: jest.fn() }));
        (window as any).SelfieSegmentation = undefined;
        const loader = new MediaPipeLoader({ cdnUrl: 'https://custom.cdn' });
        const loadScriptSpy = jest.spyOn<any, any>(loader as any, 'loadScript').mockResolvedValue(mockCtor);
        await loader.load();
        expect(loadScriptSpy).toHaveBeenCalledWith('https://custom.cdn');
    });

    it('handles script load failure (network error)', async () => {
        (window as any).SelfieSegmentation = undefined;
        const loader = new MediaPipeLoader({});
        jest.spyOn<any, any>(loader as any, 'loadScript').mockRejectedValue(new Error('Network error'));
        await expect(loader.load()).rejects.toThrow('Network error');
        expect(loader.getError()).toBeInstanceOf(Error);
    });

    it('exposes and switches model selection', async () => {
        const setOptions = jest.fn();
        const mockCtor = jest.fn().mockImplementation(() => ({ setOptions, }));
        (window as any).SelfieSegmentation = mockCtor;
        const loader = new MediaPipeLoader({ modelSelection: 0 });
        await loader.load();
        loader.setModelSelection(1);
        expect(setOptions).toHaveBeenCalledWith({ modelSelection: 1 });
    });

    it('throws and surfaces errors on load failure', async () => {
        (window as any).SelfieSegmentation = undefined;
        const loader = new MediaPipeLoader({});
        jest.spyOn<any, any>(loader as any, 'loadScript').mockRejectedValue(new Error('fail'));
        await expect(loader.load()).rejects.toThrow('fail');
        expect(loader.getError()).toBeInstanceOf(Error);
    });

    it('returns instance only after successful load', async () => {
        const mockCtor = jest.fn().mockImplementation(() => ({ setOptions: jest.fn() }));
        (window as any).SelfieSegmentation = mockCtor;
        const loader = new MediaPipeLoader({});
        expect(() => loader.getInstance()).toThrow();
        await loader.load();
        expect(loader.getInstance()).toBeDefined();
    });
}); 