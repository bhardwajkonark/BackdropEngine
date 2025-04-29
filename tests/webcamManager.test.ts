// @jest-environment jsdom
/// <reference types="jest" />

// Mock navigator.mediaDevices for all tests
if (!navigator.mediaDevices) {
    (navigator as any).mediaDevices = {};
}
if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = jest.fn();
}

import { WebcamManager } from '../src/utils/webcam';

describe('WebcamManager', () => {
    let getUserMediaMock: jest.SpyInstance;
    let originalGetUserMedia: any;

    beforeAll(() => {
        originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    });

    afterEach(() => {
        if (getUserMediaMock) getUserMediaMock.mockRestore();
    });

    afterAll(() => {
        navigator.mediaDevices.getUserMedia = originalGetUserMedia;
    });

    it('requests webcam access with default constraints', async () => {
        getUserMediaMock = jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] } as any);
        const manager = new WebcamManager();
        const stream = await manager.start();
        expect(stream).toBeDefined();
        expect(manager.getStatus()).toBe('ready');
        manager.stop();
        expect(manager.getStatus()).toBe('idle');
    });

    it('requests webcam access with custom constraints', async () => {
        getUserMediaMock = jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] } as any);
        const manager = new WebcamManager({ videoConstraints: { width: 1280, height: 720 } });
        await manager.start();
        expect(getUserMediaMock).toHaveBeenCalledWith({ video: { width: 1280, height: 720 } });
        manager.stop();
    });

    it('handles permission denied error', async () => {
        getUserMediaMock = jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue({ name: 'NotAllowedError' });
        const manager = new WebcamManager();
        await expect(manager.start()).rejects.toMatchObject({ type: 'permission-denied' });
        expect(manager.getStatus()).toBe('error');
    });

    it('handles no camera found error', async () => {
        getUserMediaMock = jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue({ name: 'NotFoundError' });
        const manager = new WebcamManager();
        await expect(manager.start()).rejects.toMatchObject({ type: 'not-found' });
        expect(manager.getStatus()).toBe('error');
    });

    it('handles unknown errors', async () => {
        getUserMediaMock = jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue({ name: 'OtherError', message: 'Something went wrong' });
        const manager = new WebcamManager();
        await expect(manager.start()).rejects.toMatchObject({ type: 'unknown', message: 'Something went wrong' });
        expect(manager.getStatus()).toBe('error');
    });

    it('cleans up and stops all tracks on stop', async () => {
        const stopMock = jest.fn();
        getUserMediaMock = jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({ getTracks: () => [{ stop: stopMock }] } as any);
        const manager = new WebcamManager();
        await manager.start();
        manager.stop();
        expect(stopMock).toHaveBeenCalled();
        expect(manager.getStatus()).toBe('idle');
    });

    it('returns correct status and error state', async () => {
        getUserMediaMock = jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue({ name: 'NotAllowedError' });
        const manager = new WebcamManager();
        await expect(manager.start()).rejects.toBeDefined();
        expect(manager.getStatus()).toBe('error');
        expect(manager.getError()).toBeDefined();
    });

    it('handles rapid start/stop cycles', async () => {
        getUserMediaMock = jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] } as any);
        const manager = new WebcamManager();
        for (let i = 0; i < 3; i++) {
            await manager.start();
            manager.stop();
        }
        expect(manager.getStatus()).toBe('idle');
    });
}); 