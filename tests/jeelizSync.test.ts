// @jest-environment jsdom
import { JeelizManager } from '../src/utils/jeeliz';

// Mock window.JEEFACEFILTER
const mockJeeliz = {
    init: jest.fn().mockResolvedValue({}),
};

describe('Jeeliz Synchronous Loading', () => {
    beforeEach(() => {
        // Clear any existing JEEFACEFILTER
        delete (window as any).JEEFACEFILTER;
        jest.clearAllMocks();
    });

    it('should load Jeeliz script synchronously', () => {
        // Mock document.createElement and appendChild
        const mockScript = {
            src: '',
            async: true,
            type: '',
        };
        const mockAppendChild = jest.fn();

        jest.spyOn(document, 'createElement').mockReturnValue(mockScript as any);
        jest.spyOn(document.head, 'appendChild').mockImplementation(mockAppendChild);

        const manager = new JeelizManager({ debug: false });

        // This should load the script synchronously
        expect(mockAppendChild).toHaveBeenCalled();
        expect(mockScript.async).toBe(false);
        expect(mockScript.src).toContain('jeelizFaceFilter.js');
    });

    it('should wait for Jeeliz to be available', async () => {
        const manager = new JeelizManager({ debug: false });

        // Initially JEEFACEFILTER should not be available
        expect(window.JEEFACEFILTER).toBeUndefined();

        // Simulate Jeeliz becoming available after a delay
        setTimeout(() => {
            (window as any).JEEFACEFILTER = mockJeeliz;
        }, 100);

        // The manager should wait for Jeeliz to be available
        await expect(manager.init(document.createElement('canvas'))).rejects.toThrow();
    });

    it('should initialize successfully when Jeeliz is available', async () => {
        // Make Jeeliz available immediately
        (window as any).JEEFACEFILTER = mockJeeliz;

        const manager = new JeelizManager({ debug: false });
        const canvas = document.createElement('canvas');

        await expect(manager.init(canvas)).resolves.not.toThrow();
        expect(mockJeeliz.init).toHaveBeenCalled();
    });

    it('should handle timeout when Jeeliz fails to load', async () => {
        const manager = new JeelizManager({ debug: false });
        const canvas = document.createElement('canvas');

        // JEEFACEFILTER will never be available
        await expect(manager.init(canvas)).rejects.toThrow('Jeeliz FaceFilter failed to load within timeout');
    });

    it('should not load script if already available', () => {
        // Make Jeeliz available
        (window as any).JEEFACEFILTER = mockJeeliz;

        const mockAppendChild = jest.fn();
        jest.spyOn(document.head, 'appendChild').mockImplementation(mockAppendChild);

        const manager = new JeelizManager({ debug: false });

        // Should not append script since JEEFACEFILTER is already available
        expect(mockAppendChild).not.toHaveBeenCalled();
    });
}); 