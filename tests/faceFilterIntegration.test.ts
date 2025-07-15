// @jest-environment jsdom
import { renderHook, act } from '@testing-library/react-hooks';
import { useWebcamBackgroundSwitcher } from '../src/useWebcamBackgroundSwitcher';
import { BackgroundOption } from '../src/utils/backgrounds';
import { FaceFilter } from '../src/types/jeeliz';

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

jest.mock('../src/utils/jeeliz', () => {
    return {
        JeelizManager: jest.fn().mockImplementation(() => ({
            init: jest.fn().mockResolvedValue(undefined),
            destroy: jest.fn(),
            getStatus: jest.fn().mockReturnValue('ready'),
            getDetections: jest.fn().mockReturnValue([]),
        })),
    };
});

jest.mock('../src/utils/backgrounds', () => {
    return {
        preloadBackgrounds: jest.fn().mockImplementation(async (options) =>
            options.map((option: any) => ({ option, isReady: true, image: option.type === 'image' ? document.createElement('img') : undefined }))
        ),
    };
});

describe('Face Filter Integration', () => {
    const backgrounds: BackgroundOption[] = [
        { label: 'Blur', type: 'blur' },
        { label: 'Test', type: 'image', src: 'test.jpg' },
    ];

    const sampleFaceFilters: FaceFilter[] = [
        {
            id: 'glasses',
            type: 'overlay',
            source: 'data:image/svg+xml;base64,test',
            position: 'eyes',
            transform: { scale: 1.2 }
        },
        {
            id: 'hat',
            type: 'overlay',
            source: 'data:image/svg+xml;base64,test',
            position: 'face',
            transform: { scale: 0.8 }
        }
    ];

    it('should initialize with face filters enabled', async () => {
        const options = {
            backgrounds,
            enableFaceFilters: true,
            faceFilters: sampleFaceFilters,
            jeelizOptions: {
                maxFaces: 1,
                detectionThreshold: 0.8
            }
        };

        const { result, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher(options));

        await act(async () => {
            await waitForNextUpdate();
        });

        expect(result.current.faceFilters).toEqual(sampleFaceFilters);
        expect(result.current.jeelizStatus).toBeDefined();
    });

    it('should provide face filter management methods', async () => {
        const options = {
            backgrounds,
            enableFaceFilters: true,
            faceFilters: []
        };

        const { result, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher(options));

        await act(async () => {
            await waitForNextUpdate();
        });

        expect(result.current.setFaceFilters).toBeInstanceOf(Function);
        expect(result.current.addFaceFilter).toBeInstanceOf(Function);
        expect(result.current.removeFaceFilter).toBeInstanceOf(Function);
        expect(result.current.clearFaceFilters).toBeInstanceOf(Function);
    });

    it('should add and remove face filters', async () => {
        const options = {
            backgrounds,
            enableFaceFilters: true,
            faceFilters: []
        };

        const { result, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher(options));

        await act(async () => {
            await waitForNextUpdate();
        });

        // Add a filter
        act(() => {
            result.current.addFaceFilter(sampleFaceFilters[0]);
        });

        expect(result.current.faceFilters).toHaveLength(1);
        expect(result.current.faceFilters[0].id).toBe('glasses');

        // Remove the filter
        act(() => {
            result.current.removeFaceFilter('glasses');
        });

        expect(result.current.faceFilters).toHaveLength(0);
    });

    it('should clear all face filters', async () => {
        const options = {
            backgrounds,
            enableFaceFilters: true,
            faceFilters: sampleFaceFilters
        };

        const { result, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher(options));

        await act(async () => {
            await waitForNextUpdate();
        });

        expect(result.current.faceFilters).toHaveLength(2);

        act(() => {
            result.current.clearFaceFilters();
        });

        expect(result.current.faceFilters).toHaveLength(0);
    });

    it('should work without face filters enabled', async () => {
        const options = {
            backgrounds,
            enableFaceFilters: false
        };

        const { result, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher(options));

        await act(async () => {
            await waitForNextUpdate();
        });

        expect(result.current.faceFilters).toEqual([]);
        expect(result.current.jeelizStatus).toBe('loading');
    });

    it('should maintain backward compatibility', async () => {
        const options = {
            backgrounds
            // No face filter options
        };

        const { result, waitForNextUpdate } = renderHook(() => useWebcamBackgroundSwitcher(options));

        await act(async () => {
            await waitForNextUpdate();
        });

        // Should still have all the original methods
        expect(result.current.setBackground).toBeInstanceOf(Function);
        expect(result.current.setModel).toBeInstanceOf(Function);
        expect(result.current.setMirror).toBeInstanceOf(Function);
        expect(result.current.setBlurRadius).toBeInstanceOf(Function);

        // Face filter methods should be available but not functional
        expect(result.current.faceFilters).toEqual([]);
        expect(result.current.jeelizStatus).toBe('loading');
    });
}); 