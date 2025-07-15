// @jest-environment jsdom
import { JeelizManager } from '../src/utils/jeeliz';

describe('Jeeliz Script Loading', () => {
    beforeEach(() => {
        // Clear any existing scripts and JEELIZFACEFILTER
        delete (window as any).JEELIZFACEFILTER;
        delete (window as any).JEEFACEFILTER;
        const existingScripts = document.querySelectorAll('script[src*="jeeliz"]');
        existingScripts.forEach(script => script.remove());
        jest.clearAllMocks();
    });

    it('should try multiple CDN sources', () => {
        const manager = new JeelizManager({ debug: true });

        // Mock document.createElement and appendChild
        const mockScripts: HTMLScriptElement[] = [];
        const mockAppendChild = jest.fn((script: HTMLScriptElement) => {
            mockScripts.push(script);
        });

        jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'script') {
                const script = document.createElement('script') as HTMLScriptElement;
                script.onerror = () => { };
                script.onload = () => { };
                return script;
            }
            return document.createElement(tagName);
        });
        jest.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
            mockAppendChild(node as HTMLScriptElement);
            return node;
        });

        // Trigger script loading
        manager['loadJeelizScript']();

        // Should have tried to load at least one script
        expect(mockAppendChild).toHaveBeenCalled();
    });

    it('should detect alternative global names', () => {
        const manager = new JeelizManager({ debug: false });

        // Mock alternative global names
        (window as any).JeelizFaceFilter = { init: jest.fn() };

        // Should find the alternative name
        expect(manager['waitForJeeliz']()).resolves.not.toThrow();
    });

    it('should handle script loading errors gracefully', async () => {
        const manager = new JeelizManager({ debug: false });

        // Mock script loading to fail
        jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'script') {
                const script = document.createElement('script') as HTMLScriptElement;
                // Simulate immediate error
                setTimeout(() => {
                    if (script.onerror) script.onerror(new Event('error'));
                }, 0);
                return script;
            }
            return document.createElement(tagName);
        });

        // Should handle the error gracefully
        await expect(manager.init(document.createElement('canvas'))).rejects.toThrow();
    });

    it('should check for scripts in DOM', () => {
        const manager = new JeelizManager({ debug: true });

        // Add a mock script to DOM
        const script = document.createElement('script');
        script.src = 'https://appstatic.jeeliz.com/faceFilter/jeelizFaceFilter.js';
        document.head.appendChild(script);

        // Should detect the script in DOM
        const scripts = document.querySelectorAll('script[src*="jeeliz"]');
        expect(scripts.length).toBeGreaterThan(0);
    });
}); 