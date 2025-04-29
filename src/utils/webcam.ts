export type WebcamStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WebcamError {
    type: 'permission-denied' | 'not-found' | 'unknown';
    message: string;
}

export interface WebcamOptions {
    videoConstraints?: MediaStreamConstraints['video'];
}

export class WebcamManager {
    private stream: MediaStream | null = null;
    private status: WebcamStatus = 'idle';
    private error: WebcamError | null = null;

    constructor(private options: WebcamOptions = {}) { }

    /**
     * Requests webcam access and returns the MediaStream.
     */
    async start(): Promise<MediaStream> {
        this.status = 'loading';
        this.error = null;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: this.options.videoConstraints || true,
            });
            this.stream = stream;
            this.status = 'ready';
            return stream;
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                this.error = { type: 'permission-denied', message: 'Camera permission denied.' };
            } else if (err.name === 'NotFoundError') {
                this.error = { type: 'not-found', message: 'No camera found.' };
            } else {
                this.error = { type: 'unknown', message: err.message || 'Unknown webcam error.' };
            }
            this.status = 'error';
            throw this.error;
        }
    }

    /**
     * Stops the webcam stream and releases resources.
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
            this.status = 'idle';
        }
    }

    /**
     * Returns the current MediaStream, if any.
     */
    getStream() {
        return this.stream;
    }

    /**
     * Returns the current status.
     */
    getStatus(): WebcamStatus {
        return this.status;
    }

    /**
     * Returns the last error, if any.
     */
    getError(): WebcamError | null {
        return this.error;
    }
} 