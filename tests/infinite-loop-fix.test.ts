/**
 * Test to verify that the infinite loop issue has been fixed.
 * This test ensures that the useWebcamBackgroundSwitcher hook doesn't cause
 * "Maximum update depth exceeded" errors.
 */

import { renderHook } from '@testing-library/react';
import { useWebcamBackgroundSwitcher } from '../src/useWebcamBackgroundSwitcher';

// Mock the dependencies
jest.mock('../src/utils/webcam', () => ({
    WebcamManager: jest.fn().mockImplementation(() => ({
        start: jest.fn().mockResolvedValue({}),
        stop: jest.fn(),
        getStream: jest.fn().mockReturnValue({}),
    })),
}));

jest.mock('../src/mediapipe/loader', () => ({
    MediaPipeLoader: jest.fn().mockImplementation(() => ({
        load: jest.fn().mockResolvedValue({}),
        setModelSelection: jest.fn(),
        getInstance: jest.fn().mockReturnValue({
            onResults: jest.fn(),
            send: jest.fn(),
        }),
    })),
    DEFAULT_MEDIAPIPE_CDN: 'https://test-cdn.com',
}));

jest.mock('../src/utils/backgrounds', () => ({
    preloadBackgrounds: jest.fn().mockResolvedValue([
        { option: { label: 'None', type: 'none' }, isReady: true },
        { option: { label: 'Blur', type: 'blur' }, isReady: true },
    ]),
}));

jest.mock('../src/utils/compositor', () => ({
    compositeFrame: jest.fn(),
}));

// Mock window.SelfieSegmentation
Object.defineProperty(window, 'SelfieSegmentation', {
    value: jest.fn().mockImplementation(() => ({
        onResults: jest.fn(),
        setOptions: jest.fn(),
    })),
    writable: true,
});

// Mock window.Camera
Object.defineProperty(window, 'Camera', {
    value: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        stop: jest.fn(),
    })),
    writable: true,
});

describe('useWebcamBackgroundSwitcher - Infinite Loop Fix', () => {
    it('should not cause infinite re-renders when options object is stable', () => {
        const options = {
            backgrounds: [
                { label: 'None', type: 'none' as const },
                { label: 'Blur', type: 'blur' as const },
            ],
            width: 640,
            height: 480,
            debug: false,
        };

        // This should not throw "Maximum update depth exceeded"
        const { result } = renderHook(() => useWebcamBackgroundSwitcher(options));

        // Verify the hook returns expected values
        expect(result.current).toHaveProperty('videoRef');
        expect(result.current).toHaveProperty('canvasRef');
        expect(result.current).toHaveProperty('setBackground');
        expect(result.current).toHaveProperty('status');
        expect(result.current).toHaveProperty('error');
        expect(result.current).toHaveProperty('currentBackground');
        expect(result.current).toHaveProperty('availableBackgrounds');
    });

    it('should handle options object recreation gracefully', () => {
        // Simulate options object being recreated on every render
        const createOptions = () => ({
            backgrounds: [
                { label: 'None', type: 'none' as const },
                { label: 'Blur', type: 'blur' as const },
            ],
            width: 640,
            height: 480,
            debug: false,
        });

        // This should not cause infinite loops even with recreated options
        const { result, rerender } = renderHook(() => useWebcamBackgroundSwitcher(createOptions()));

        // Rerender with new options object (simulating component re-render)
        rerender();
        rerender();
        rerender();

        // Should still work without infinite loops
        expect(result.current).toHaveProperty('status');
        expect(typeof result.current.setBackground).toBe('function');
    });
}); 