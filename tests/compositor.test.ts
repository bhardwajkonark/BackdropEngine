// @jest-environment jsdom
import { compositeFrame } from '../src/utils/compositor';

describe('Compositing Logic', () => {
    let canvas: HTMLCanvasElement;
    let ctx: any;
    let inputImage: HTMLImageElement;
    let segmentationMask: HTMLImageElement;
    let backgroundImage: HTMLImageElement;

    beforeAll(() => {
        // Mock getContext to return a fake 2D context
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
            value: jest.fn(() => ({
                save: jest.fn(),
                restore: jest.fn(),
                translate: jest.fn(),
                scale: jest.fn(),
                filter: '',
                drawImage: jest.fn(),
                fillStyle: '',
                fillRect: jest.fn(),
                globalCompositeOperation: '',
                getImageData: jest.fn(),
                putImageData: jest.fn(),
                clearRect: jest.fn(),
            })),
        });
    });

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        ctx = canvas.getContext('2d');
        inputImage = document.createElement('img');
        inputImage.width = 100;
        inputImage.height = 100;
        segmentationMask = document.createElement('img');
        segmentationMask.width = 100;
        segmentationMask.height = 100;
        backgroundImage = document.createElement('img');
        backgroundImage.width = 100;
        backgroundImage.height = 100;
    });

    it('composites person with blur background', () => {
        expect(() => {
            compositeFrame({
                inputImage,
                segmentationMask,
                outputCanvas: canvas,
                options: { mode: 'blur', blurRadius: 5 },
            });
        }).not.toThrow();
    });

    it('composites person with image background', () => {
        expect(() => {
            compositeFrame({
                inputImage,
                segmentationMask,
                outputCanvas: canvas,
                options: { mode: 'image', backgroundImage },
            });
        }).not.toThrow();
    });

    it('handles mirroring option', () => {
        expect(() => {
            compositeFrame({
                inputImage,
                segmentationMask,
                outputCanvas: canvas,
                options: { mode: 'blur', mirror: true },
            });
        }).not.toThrow();
    });

    it('handles dynamic canvas sizing', () => {
        canvas.width = 200;
        canvas.height = 200;
        inputImage.width = 200;
        inputImage.height = 200;
        segmentationMask.width = 200;
        segmentationMask.height = 200;
        expect(() => {
            compositeFrame({
                inputImage,
                segmentationMask,
                outputCanvas: canvas,
                options: { mode: 'blur' },
            });
        }).not.toThrow();
    });

    it('handles missing/invalid mask gracefully', () => {
        expect(() => {
            compositeFrame({
                inputImage,
                segmentationMask: {} as any,
                outputCanvas: canvas,
                options: { mode: 'blur' },
            });
        }).not.toThrow();
    });

    it('handles missing/invalid background image gracefully', () => {
        expect(() => {
            compositeFrame({
                inputImage,
                segmentationMask,
                outputCanvas: canvas,
                options: { mode: 'image' },
            });
        }).not.toThrow();
    });

    it('does not leak memory (offscreen canvas reuse)', () => {
        // This test is limited in jsdom, but we can check that multiple calls do not throw
        for (let i = 0; i < 10; i++) {
            expect(() => {
                compositeFrame({
                    inputImage,
                    segmentationMask,
                    outputCanvas: canvas,
                    options: { mode: 'blur' },
                });
            }).not.toThrow();
        }
    });
}); 