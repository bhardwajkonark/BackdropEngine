# BackdropEngine (Core, UI-Agnostic)

A reusable React hook and utility package for real-time webcam background switching and blurring using [MediaPipe Selfie Segmentation](https://google.github.io/mediapipe/solutions/selfie_segmentation.html). This package provides the core logic and compositing, allowing you to build your own custom UI in React, Next.js, or any modern frontend framework.

---

## Features

- Real-time person segmentation using MediaPipe
- Blur or replace webcam background with custom images
- **Real-time beauty filters** with 7 different effects
- **No UI imposed** – you control the look and feel
- Exposes hooks and methods for full flexibility
- TypeScript support
- Error handling and state management

---

## Installation

```bash
npm install BackdropEngine
# or
yarn add BackdropEngine
```

---

## Usage

### Basic Example (React Hook)

You can import the hook using either a named or default import:

```jsx
// Named import (recommended)
import { useWebcamBackgroundSwitcher } from "backdrop-engine";

// OR default import
import useWebcamBackgroundSwitcher from "backdrop-engine";
```

Both styles are supported.

```jsx
const backgrounds = [
  { label: "None", type: "none" },
  { label: "Blur", type: "blur" },
  { label: "Beach", type: "image", src: "/beach.jpg" },
  { label: "Mountains", type: "image", src: "/mountains.jpg" },
];

function MyCustomUI() {
  const {
    canvasRef,
    videoRef,
    setBackground,
    setModel,
    setMirror,
    setBlurRadius,
    status,
    error,
    currentBackground,
    availableBackgrounds,
    modelSelection,
    mirror,
    blurRadius,
  } = useWebcamBackgroundSwitcher({
    backgrounds,
    width: 640,
    height: 480,
    onError: (err) => console.error(err),
    frameSkip: 2,
    modelSelection: 0, // 0: fast, 1: better
    mirror: true,
    blurRadius: 10,
    cdnUrl: undefined, // optional custom CDN
    debug: false, // enable debug logging
  });

  return (
    <div>
      {/* Your custom controls */}
      {availableBackgrounds.map((bg) => (
        <button key={bg.option.label} onClick={() => setBackground(bg)}>
          {bg.option.label}
        </button>
      ))}
      {/* Attach refs to your elements */}
      <video ref={videoRef} style={{ display: "none" }} autoPlay muted playsInline />
      <canvas ref={canvasRef} width={640} height={480} />
      {status === "error" && <div>Error: {error?.message}</div>}
    </div>
  );
}
```

### Beauty Filters Example

The hook also supports real-time beauty filters that work independently of background effects:

```jsx
const beautyFilters = [
  { label: "None", type: "none" },
  { label: "Skin Smoothing", type: "skin-smoothing", intensity: 0.7 },
  { label: "Brightness & Contrast", type: "brightness-contrast", intensity: 0.6 },
  { label: "Highlight", type: "highlight", intensity: 0.5 },
  { label: "Soft Glow", type: "soft-glow", intensity: 0.6 },
  { label: "Sharpen", type: "sharpen", intensity: 0.5 },
  { label: "Color Boost", type: "color-boost", intensity: 0.7 },
];

function MyCustomUI() {
  const {
    canvasRef,
    videoRef,
    setBackground,
    setBeautyFilter, // New beauty filter setter
    status,
    error,
    currentBackground,
    availableBackgrounds,
    currentBeautyFilter, // Current active beauty filter
    availableBeautyFilters, // Available beauty filters
  } = useWebcamBackgroundSwitcher({
    backgrounds,
    beautyFilters, // Add beauty filters to options
    width: 640,
    height: 480,
    onError: (err) => console.error(err),
    debug: false,
  });

  return (
    <div>
      {/* Background controls */}
      <div>
        <h3>Backgrounds</h3>
        {availableBackgrounds.map((bg) => (
          <button key={bg.option.label} onClick={() => setBackground(bg)}>
            {bg.option.label}
          </button>
        ))}
      </div>

      {/* Beauty filter controls */}
      <div>
        <h3>Beauty Filters</h3>
        {availableBeautyFilters.map((filter) => (
          <button key={filter.option.label} onClick={() => setBeautyFilter(filter)}>
            {filter.option.label}
          </button>
        ))}
      </div>

      {/* Video output */}
      <video ref={videoRef} style={{ display: "none" }} autoPlay muted playsInline />
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

| Option        | Type     | Description                                                                 |
| ------------- | -------- | --------------------------------------------------------------------------- |
| backgrounds   | array    | List of background options (see below)                                      |
| beautyFilters | array    | List of beauty filter options (see below)                                   |
| width         | number   | Video/canvas width (default: 640)                                           |
| height        | number   | Video/canvas height (default: 480)                                          |
| onError       | function | Callback for errors (webcam, image, segmentation)                           |
| defaultMode   | string   | Initial background mode (label of background, e.g. 'blur' or image label)   |
| frameSkip     | number   | Process every Nth frame (default: 1, no skipping)                           |
| modelSelection| 0 \| 1   | MediaPipe model: 0 = fast/landscape, 1 = better/selfie (default: 0)        |
| mirror        | boolean  | Mirror the output horizontally (default: true)                              |
| blurRadius    | number   | Blur radius for 'blur' mode (default: 10)                                   |
| cdnUrl        | string   | Custom CDN URL for MediaPipe scripts (default: official CDN)                |
| debug         | boolean  | Enable debug logging in console (default: false)                            |

#### Returns

| Value                | Type                | Description                                         |
| -------------------- | ------------------- | --------------------------------------------------- |
| canvasRef            | ref                 | Attach to your `<canvas>` element                   |
| videoRef             | ref                 | Attach to your `<video>` element                    |
| setBackground        | function            | Switch background (pass a LoadedBackground object)  |
| setBeautyFilter      | function            | Switch beauty filter (pass a LoadedBeautyFilter object) |
| setModel             | function            | Switch MediaPipe model (0 or 1)                     |
| setMirror            | function            | Enable/disable mirroring                            |
| setBlurRadius        | function            | Set blur radius for 'blur' mode                     |
| status               | string              | 'loading', 'ready', 'error'                         |
| error                | object              | Error object if any                                 |
| currentBackground    | LoadedBackground    | The currently active background                     |
| availableBackgrounds | LoadedBackground[]  | List of all available backgrounds                   |
| currentBeautyFilter  | LoadedBeautyFilter  | The currently active beauty filter                  |
| availableBeautyFilters | LoadedBeautyFilter[] | List of all available beauty filters               |
| modelSelection       | 0 \| 1              | Current MediaPipe model selection                   |
| mirror               | boolean             | Current mirror mode                                 |
| blurRadius           | number              | Current blur radius                                 |

### Background Option Format

```js
{ label: 'Blur', type: 'blur' }
{ label: 'Beach', type: 'image', src: '/beach.jpg' }
```

### Beauty Filter Option Format

```js
{ label: 'None', type: 'none' }
{ label: 'Skin Smoothing', type: 'skin-smoothing', intensity: 0.7 }
{ label: 'Brightness & Contrast', type: 'brightness-contrast', intensity: 0.6 }
{ label: 'Highlight', type: 'highlight', intensity: 0.5 }
{ label: 'Soft Glow', type: 'soft-glow', intensity: 0.6 }
{ label: 'Sharpen', type: 'sharpen', intensity: 0.5 }
{ label: 'Color Boost', type: 'color-boost', intensity: 0.7 }
```

**Available Beauty Filter Types:**
- `none` - No beauty filter applied
- `skin-smoothing` - Gentle blur for skin texture (intensity: 0.0-1.0)
- `brightness-contrast` - Light and contrast adjustment (intensity: 0.0-1.0)
- `highlight` - Radial highlight for eyes/cheeks (intensity: 0.0-1.0)
- `soft-glow` - Warm, flattering lighting (intensity: 0.0-1.0)
- `sharpen` - Edge enhancement for crisp details (intensity: 0.0-1.0)
- `color-boost` - Vibrant saturation boost (intensity: 0.0-1.0)

### LoadedBackground Structure

A `LoadedBackground` object has the following shape:

```ts
{
  option: { label: string; type: 'none' | 'blur' | 'image'; src?: string };
  image?: HTMLImageElement; // present if type is 'image'
  isReady: boolean;
  error?: Error;
}
```

Use the `option.label` as a unique key for UI purposes. Pass the entire `LoadedBackground` object to `setBackground`.

### LoadedBeautyFilter Structure

A `LoadedBeautyFilter` object has the following shape:

```ts
{
  option: { label: string; type: 'none' | 'skin-smoothing' | 'brightness-contrast' | 'highlight' | 'soft-glow' | 'sharpen' | 'color-boost'; intensity?: number };
  isReady: boolean;
  error?: Error;
}
```

Use the `option.label` as a unique key for UI purposes. Pass the entire `LoadedBeautyFilter` object to `setBeautyFilter`.

---

## How It Works

- Requests webcam access and displays the video feed (hidden or shown as you wish).
- Uses MediaPipe Selfie Segmentation to separate the person from the background in real time.
- Allows you to blur the background or replace it with a custom image.
- **Applies real-time beauty filters** using GPU-accelerated canvas operations and CSS filters.
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

### 1. None Mode

- **Description:** The original webcam feed is shown with no background effect.
- **Use Case:** For users who want to disable all effects and show the raw camera.

### 2. Blur Mode

- **Description:** The background behind the person is blurred in real time, preserving privacy and focus.
- **Performance:** Blurring is efficient, especially when combined with frame skipping and the fast segmentation model.
- **Use Case:** Virtual meetings, privacy, focus enhancement.

### 3. Image Mode

- **Description:** The background is replaced with a custom image of your choice.
- **Performance:** Slightly more resource-intensive than blur, especially with high-resolution images, but still efficient with frame skipping and model selection.
- **Use Case:** Virtual backgrounds, branding, fun effects.

---

## Beauty Filters

This package supports 7 different real-time beauty filters that work independently of background effects:

### 1. Skin Smoothing
- **Description:** Applies a gentle Gaussian blur to smooth skin texture and reduce blemishes.
- **Performance:** Uses GPU-accelerated CSS filters for optimal performance.
- **Use Case:** Portrait enhancement, professional appearance.

### 2. Brightness & Contrast
- **Description:** Adjusts overall brightness and contrast for better lighting.
- **Performance:** Fast CSS-based adjustments.
- **Use Case:** Poor lighting conditions, enhancing visibility.

### 3. Highlight
- **Description:** Adds a subtle radial highlight to central areas (eyes, cheeks).
- **Performance:** Efficient gradient-based effect.
- **Use Case:** Adding dimension and glow to facial features.

### 4. Soft Glow
- **Description:** Creates a warm, flattering lighting effect.
- **Performance:** Optimized canvas compositing.
- **Use Case:** Creating a more appealing, professional appearance.

### 5. Sharpen
- **Description:** Enhances edge details for crisper, clearer images.
- **Performance:** Uses overlay blending for sharpening effect.
- **Use Case:** Improving image clarity and definition.

### 6. Color Boost
- **Description:** Increases color saturation for more vibrant appearance.
- **Performance:** Fast CSS-based color adjustments.
- **Use Case:** Making colors pop, enhancing visual appeal.

### 7. None
- **Description:** No beauty filter applied, shows original video feed.
- **Use Case:** When users want to disable beauty effects.

**Note:** Beauty filters work independently of background effects, so you can combine any beauty filter with any background mode.

---

## Performance & Efficiency Features

To maximize real-time performance and efficiency, consider implementing or enabling the following features in your UI and logic:

### 1. Frame Skipping

- **Description:** Process only every Nth frame for segmentation (e.g., every 2nd frame) using the `frameSkip` option.
- **Benefit:** Reduces CPU/GPU load and segmentation calls, increasing FPS and lowering resource usage.
- **How to Use:** Set `frameSkip` in your hook options. For example, `frameSkip: 2` will process every other frame.

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

This project is dual-licensed under the Unlicense and MIT licenses.

You may use this code under the terms of either license.

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

## Video Playback: React/SPA Best Practices

For robust cross-browser playback, always:

- Set `autoPlay`, `muted`, and `playsInline` on your `<video>` element.
- Explicitly call `.play()` on the video element after setting `srcObject` in your code. This ensures the video is playing and frames are available for compositing, even if the video is hidden or autoplay is blocked by the browser.

Example:

```js
if (videoRef.current) {
  videoRef.current.srcObject = stream;
  videoRef.current.play().catch(() => {});
}
```

This is more robust than relying on autoplay alone, especially in React or SPA environments.

---

## Performance: MediaPipe Camera Utility (Dynamic Loading)

For optimal real-time performance, this package uses the [MediaPipe Camera utility](https://google.github.io/mediapipe/solutions/camera.html) to synchronize video capture, segmentation, and compositing—just like the official MediaPipe HTML demos.

- **How it works:**
  - The hook dynamically loads the `camera_utils.js` script from the CDN at runtime if `window.Camera` is not present.
  - Once loaded, it uses `window.Camera` to drive the segmentation and compositing pipeline.
  - This ensures smooth, low-latency output, even on lower-end devices, and matches the performance of the HTML demo.
- **Why dynamic loading?**
  - The npm package for `@mediapipe/camera_utils` does not export a usable ES module constructor for `Camera`.
  - Loading the script from CDN and using `window.Camera` is the most robust and cross-platform solution for React/SPA/SSR environments.
- **You do not need to import Camera in your code.** The hook handles everything for you.

**If you want to use the Camera utility yourself:**

```js
// This is handled internally, but for reference:
if (!window.Camera) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
  script.async = true;
  document.head.appendChild(script);
}
// Then use window.Camera as a constructor
```

---

## Troubleshooting: Blank or Black Canvas

- **If your canvas is blank or black:**
  - Ensure your video element is playing (see above).
  - Make sure you set `autoPlay`, `muted`, and `playsInline` on the video element.
  - Always call `.play()` after setting `srcObject`.
  - The video can be hidden (`display: none`), but it must be playing.
  - Check the browser console for warnings about video playback or permissions.
  - If you see errors about `Camera` not being found, ensure you are not importing from `@mediapipe/camera_utils` and let the hook dynamically load the script as described above.

---

## Using Local File Uploads as Backgrounds

You can let users upload their own images and use them as backgrounds. Simply create a Blob URL from the uploaded file and pass it as the `src` in your background option.

### Example: Plain JS (Vanilla)

```js
// HTML:
// <input type="file" id="bgUpload" />

document.getElementById('bgUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    // Add to your backgrounds array
    backgrounds.push({ label: file.name, type: 'image', src: url });
    // Update your UI and re-render as needed
  }
});
```

### Example: React

```jsx
import React, { useRef } from 'react';
import { useWebcamBackgroundSwitcher } from 'backdrop-engine';

function MyComponent() {
  const fileInputRef = useRef();
  const [backgrounds, setBackgrounds] = React.useState([
    { label: 'Blur', type: 'blur' },
    // ...other backgrounds
  ]);
  const { setBackground, ...rest } = useWebcamBackgroundSwitcher({ backgrounds });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const bg = { label: file.name, type: 'image', src: url };
      setBackgrounds((prev) => [...prev, bg]);
      setBackground(bg);
    }
  };

  return (
    <div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} />
      {/* ...rest of your UI */}
    </div>
  );
}
```

**Note:** The package will automatically load the image from the Blob URL and use it as a background.

---

## TypeScript Usage: Importing Types

BackdropEngine exports all its types for TypeScript users. You can import them directly from the package:

```ts
import type {
  UseWebcamBackgroundSwitcherOptions,
  BackgroundOption,
  LoadedBackground,
  BeautyFilterOption,
  LoadedBeautyFilter
} from 'backdrop-engine';
```

This allows you to type your options, backgrounds, beauty filters, and more for full type safety.

---

## Support & Feedback

If you have questions, suggestions, or encounter any issues, please open an issue or start a discussion on the repository. Contributions and feedback are always welcome!

Thank you for using BackdropEngine.