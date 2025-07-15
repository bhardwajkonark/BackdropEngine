import { FaceFilterRenderer } from '../src/utils/faceFilters';
import { JeelizFaceDetection, FaceFilter } from '../src/types/jeeliz';

describe('FaceFilterRenderer', () => {
    let renderer: FaceFilterRenderer;

    beforeEach(() => {
        renderer = new FaceFilterRenderer();
    });

    afterEach(() => {
        renderer.clearCache();
    });

    it('should create a face filter renderer', () => {
        expect(renderer).toBeInstanceOf(FaceFilterRenderer);
    });

    it('should calculate filter position correctly', () => {
        const detection: JeelizFaceDetection = {
            state: 1,
            rotation: [0, 0, 0],
            mouth: 0,
            landmarks: [
                [100, 100], // Left eye
                [200, 100], // Right eye
                [150, 150], // Nose
            ],
            boundingBox: {
                x: 50,
                y: 50,
                width: 200,
                height: 200,
            },
        };

        const filter: FaceFilter = {
            id: 'test',
            type: 'overlay',
            position: 'eyes',
            source: 'test.png',
        };

        const position = renderer.calculateFilterPosition(detection, filter, 640, 480);

        expect(position).toHaveProperty('x');
        expect(position).toHaveProperty('y');
        expect(position).toHaveProperty('scale');
        expect(position).toHaveProperty('rotation');
    });

    it('should handle empty landmarks gracefully', () => {
        const detection: JeelizFaceDetection = {
            state: 1,
            rotation: [0, 0, 0],
            mouth: 0,
            landmarks: [],
            boundingBox: {
                x: 0,
                y: 0,
                width: 100,
                height: 100,
            },
        };

        const filter: FaceFilter = {
            id: 'test',
            type: 'overlay',
            position: 'eyes',
            source: 'test.png',
        };

        const position = renderer.calculateFilterPosition(detection, filter, 640, 480);

        expect(position.x).toBe(0);
        expect(position.y).toBe(0);
        expect(position.scale).toBe(1);
        expect(position.rotation).toBe(0);
    });

    it('should get cache statistics', () => {
        const stats = renderer.getCacheStats();

        expect(stats).toHaveProperty('cached');
        expect(stats).toHaveProperty('loading');
        expect(stats.cached).toBe(0);
        expect(stats.loading).toBe(0);
    });

    it('should clear cache', () => {
        renderer.clearCache();
        const stats = renderer.getCacheStats();

        expect(stats.cached).toBe(0);
        expect(stats.loading).toBe(0);
    });
}); 