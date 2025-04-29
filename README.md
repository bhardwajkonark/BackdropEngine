# React Webcam Background Switcher (Core, UI-Agnostic)

A reusable React hook and utility package for real-time webcam background switching and blurring using [MediaPipe Selfie Segmentation](https://google.github.io/mediapipe/solutions/selfie_segmentation.html). This package provides the core logic and compositing, allowing you to build your own custom UI in React, Next.js, or any modern frontend framework.

---

## Features

- Real-time person segmentation using MediaPipe
- Blur or replace webcam background with custom images
- **No UI imposed** – you control the look and feel
- Exposes hooks and methods for full flexibility
- TypeScript support
- Error handling and state management

---

## Installation

```bash
npm install react-webcam-bg-switcher
# or
yarn add react-webcam-bg-switcher
```

---

## Usage

### Basic Example (React Hook)

```jsx
import { useWebcamBackgroundSwitcher } from "react-webcam-bg-switcher";

const backgrounds = [
  { label: "Blur", type: "blur" },
  { label: "Beach", type: "image", src: "/beach.jpg" },
  { label: "Mountains", type: "image", src: "/mountains.jpg" },
];

function MyCustomUI() {
  const {
    canvasRef,
    videoRef,
    setBackground,
    status,
    error,
    currentBackground,
    availableBackgrounds,
  } = useWebcamBackgroundSwitcher({
    backgrounds,
    width: 640,
    height: 480,
    onError: (err) => console.error(err),
  });

  return (
    <div>
      {/* Your custom controls */}
      {availableBackgrounds.map((bg) => (
        <button key={bg.label} onClick={() => setBackground(bg)}>
          {bg.label}
        </button>
      ))}
      {/* Attach refs to your elements */}
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} width={640} height={480} />
      {status === "error" && <div>Error: {error?.message}</div>}
    </div>
  );
}
```

### Next.js Usage

For SSR safety, ensure the hook/component is only used on the client:

```jsx
import dynamic from "next/dynamic";
const MyCustomUI = dynamic(() => import("./MyCustomUI"), { ssr: false });
```

---

## API

### `useWebcamBackgroundSwitcher(options)`

| Option      | Type     | Description                                       |
| ----------- | -------- | ------------------------------------------------- |
| backgrounds | array    | List of background options (see below)            |
| width       | number   | Video/canvas width (default: 640)                 |
| height      | number   | Video/canvas height (default: 480)                |
| onError     | function | Callback for errors (webcam, image, segmentation) |
| defaultMode | string   | Initial background mode ('blur' or image label)   |

#### Returns

| Value                | Type     | Description                            |
| -------------------- | -------- | -------------------------------------- |
| canvasRef            | ref      | Attach to your `<canvas>` element      |
| videoRef             | ref      | Attach to your `<video>` element       |
| setBackground        | function | Switch background (by object or label) |
| status               | string   | 'loading', 'ready', 'error'            |
| error                | object   | Error object if any                    |
| currentBackground    | object   | The currently active background        |
| availableBackgrounds | array    | List of all available backgrounds      |

### Background Option Format

```js
{ label: 'Blur', type: 'blur' }
{ label: 'Beach', type: 'image', src: '/beach.jpg' }
```

---

## How It Works

- Requests webcam access and displays the video feed (hidden or shown as you wish).
- Uses MediaPipe Selfie Segmentation to separate the person from the background in real time.
- Allows you to blur the background or replace it with a custom image.
- Renders the composited output to a canvas you control.
- You build and style your own UI and controls.

---

## Accessibility & Responsiveness

- You are responsible for making your UI accessible and responsive.
- The hook provides only the core logic and refs.

---

## Error Handling

- If webcam access fails, the hook sets `status` to 'error' and provides an error object.
- If a background image fails to load, an error is provided.
- All errors are passed to the `onError` callback if provided.

---

## Advanced Usage

- **Custom Controls:** Build any UI you want for background selection, loading states, etc.
- **Custom Background Upload:** Let users upload their own images and add to the backgrounds array.
- **Video Backgrounds:** Use a video element as a background (advanced, see docs).

---

## Modes Supported

This package supports the following background modes:

### 1. Blur Mode

- **Description:** The background behind the person is blurred in real time, preserving privacy and focus.
- **Performance:** Blurring is efficient, especially when combined with frame skipping and the fast segmentation model.
- **Use Case:** Virtual meetings, privacy, focus enhancement.

### 2. Image Mode

- **Description:** The background is replaced with a custom image of your choice.
- **Performance:** Slightly more resource-intensive than blur, especially with high-resolution images, but still efficient with frame skipping and model selection.
- **Use Case:** Virtual backgrounds, branding, fun effects.

### 3. (Optional/Planned) Video Mode

- **Description:** The background is replaced with a video. (Advanced, not included by default.)
- **Performance:** Most resource-intensive; requires careful optimization.
- **Use Case:** Dynamic/animated backgrounds, advanced effects.

---

## Performance & Efficiency Features

To maximize real-time performance and efficiency, consider implementing or enabling the following features in your UI and logic:

### 1. Frame Skipping

- **Description:** Process only every Nth frame for segmentation (e.g., every 2nd frame).
- **Benefit:** Reduces CPU/GPU load and segmentation calls, increasing FPS and lowering resource usage.
- **How to Use:** Add a frame counter and only run segmentation logic on selected frames.

### 2. Model Selection

- **Description:** Allow users to choose between a fast (less accurate) and a better (slower, more accurate) segmentation model. This applies to all modes (blur, image, and video).
- **Benefit:** Lets users balance quality and performance for their device.
- **How to Use:** Expose a `modelSelection` option in your API and pass it to MediaPipe Selfie Segmentation.

### 3. Dynamic Canvas Sizing

- **Description:** Set the canvas size to match the video's actual resolution.
- **Benefit:** Prevents unnecessary up/downscaling, saving processing time and memory.
- **How to Use:** On video metadata load, set canvas width/height to match video.

### 4. Efficient Offscreen Canvas Usage

- **Description:** Reuse a single offscreen (temporary) canvas for compositing.
- **Benefit:** Reduces memory and CPU churn from repeated DOM allocations.
- **How to Use:** Create and reuse a single offscreen canvas for all compositing steps.

---

**Tip:** Mirroring the output is a minor performance cost and can be toggled as needed.

By incorporating these features and understanding the available modes, you can ensure your implementation is efficient and suitable for a wide range of devices.

---

## Development & Contribution

1. Clone the repo
2. Install dependencies: `npm install`
3. Run the example app: `npm start` or `npm run storybook`
4. Build the package: `npm run build`

Pull requests and issues are welcome!

---

## License

MIT

---

## MediaPipe CDN URL (Custom Loader URL)

By default, this package loads MediaPipe Selfie Segmentation from the official CDN:

```
https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation
```

If you want to use a different CDN or self-hosted assets (for example, if the default CDN is unavailable), you can provide a custom `cdnUrl` in the loader options:

```ts
import { MediaPipeLoader, DEFAULT_MEDIAPIPE_CDN } from './src/mediapipe/loader';

const loader = new MediaPipeLoader({
  // cdnUrl is optional; defaults to DEFAULT_MEDIAPIPE_CDN
  cdnUrl: 'https://your.custom.cdn/path/to/selfie_segmentation',
  modelSelection: 0,
});
```

If `cdnUrl` is not provided, the loader will use the default CDN automatically.

---
