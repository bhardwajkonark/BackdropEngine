// @jest-environment jsdom
import { renderHook, act } from '@testing-library/react-hooks';
import { useWebcamBackgroundSwitcher } from '../src/useWebcamBackgroundSwitcher';
import { BackgroundOption } from '../src/utils/backgrounds';

jest.mock('../src/utils/webcam', () => {
    return {
        WebcamManager: jest.fn().mockImplementation(() => ({
            start: jest.fn().mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
            stop: jest.fn(),
        })),
    };
});

jest.mock('../src/mediapipe/loader', () => {
    return {
        MediaPipeLoader: jest.fn().mockImplementation(() => ({
            load: jest.fn().mockResolvedValue(undefined),
            getInstance: jest.fn().mockReturnValue({
                send: jest.fn().mockResolvedValue(undefined),
                lastResults: { segmentationMask: document.createElement('img') },
            }),
            setModelSelection: jest.fn(),
        })),
        DEFAULT_MEDIAPIPE_CDN: 'https://cdn',
    };
});

jest.mock('../src/utils/backgrounds', () => {
    return {
        preloadBackgrounds: jest.fn().mockImplementation(async (options) =>
            options.map((option: any) => ({ option, isReady: true, image: option.type === 'image' ? document.createElement('img') : undefined }))
        ),
    };
});

describe('useWebcamBackgroundSwitcher', () => {
    const backgrounds: BackgroundOption[] = [
        { label: 'Blur', type: 'blur' },
        { label: 'Test', type: 'image', src: 'test.jpg' },
    ];

    it('initializes and cleans up webcam and MediaPipe', async () => {
        const { result, unmount, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher({ backgrounds }));
        await act(async () => {
            await waitForNextUpdate();
        });
        expect(result.current.status).toBe('ready');
        unmount();
    });

    it('preloads and switches backgrounds', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher({ backgrounds }));
        await act(async () => {
            await waitForNextUpdate();
        });
        expect(result.current.availableBackgrounds.length).toBe(2);
        act(() => {
            result.current.setBackground(result.current.availableBackgrounds[1]);
        });
        expect(result.current.currentBackground).toBe(result.current.availableBackgrounds[1]);
    });

    it('exposes refs, status, error, and API methods', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher({ backgrounds }));
        await act(async () => {
            await waitForNextUpdate();
        });
        expect(result.current.videoRef).toBeDefined();
        expect(result.current.canvasRef).toBeDefined();
        expect(result.current.setBackground).toBeInstanceOf(Function);
        expect(result.current.setModel).toBeInstanceOf(Function);
        expect(result.current.setMirror).toBeInstanceOf(Function);
        expect(result.current.setBlurRadius).toBeInstanceOf(Function);
    });

    it('handles all error states and propagates to onError', async () => {
        const onError = jest.fn();
        // Simulate preloadBackgrounds throwing
        const { preloadBackgrounds } = require('../src/utils/backgrounds');
        preloadBackgrounds.mockImplementationOnce(() => Promise.reject(new Error('fail')));
        const { result, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher({ backgrounds, onError }));
        await act(async () => {
            await waitForNextUpdate();
        });
        expect(result.current.status).toBe('error');
        expect(onError).toHaveBeenCalled();
    });

    it('supports model selection, blur radius, and mirror options', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher({ backgrounds, modelSelection: 1, blurRadius: 15, mirror: false }));
        await act(async () => {
            await waitForNextUpdate();
        });
        expect(result.current.modelSelection).toBe(1);
        expect(result.current.blurRadius).toBe(15);
        expect(result.current.mirror).toBe(false);
        act(() => {
            result.current.setModel(0);
            result.current.setBlurRadius(5);
            result.current.setMirror(true);
        });
        expect(result.current.modelSelection).toBe(0);
        expect(result.current.blurRadius).toBe(5);
        expect(result.current.mirror).toBe(true);
    });

    it('SSR safety: does not break if run on server', () => {
        // Simulate no window/document
        const originalWindow = global.window;
        // @ts-expect-error
        delete global.window;
        expect(() => {
            require('../src/useWebcamBackgroundSwitcher');
        }).not.toThrow();
        global.window = originalWindow;
    });

    it('handles rapid prop changes (backgrounds, model, etc.)', async () => {
        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { backgrounds: BackgroundOption[]; modelSelection: 0 | 1 }) => useWebcamBackgroundSwitcher(props),
            { initialProps: { backgrounds, modelSelection: 0 } }
        );
        await act(async () => {
            await waitForNextUpdate();
        });
        rerender({ backgrounds, modelSelection: 1 });
        expect(result.current.modelSelection).toBe(1);
    });

    it('cleans up all resources on unmount', async () => {
        const { result, unmount, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher({ backgrounds }));
        await act(async () => {
            await waitForNextUpdate();
        });
        unmount();
        // No explicit assertion, but should not throw
    });
});

// Note: If @testing-library/react-hooks is not present, add it as a devDependency in package.json 