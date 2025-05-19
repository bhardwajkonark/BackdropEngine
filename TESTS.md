# Test Plan: BackdropEngine

A comprehensive set of test cases to ensure correctness, robustness, and reliability of all core modules and the main React hook. This includes unit, integration, and manual tests.

---

## 1. WebcamManager (tests/webcamManager.test.ts)
- [x] Requests webcam access with default constraints
- [x] Requests webcam access with custom constraints
- [x] Handles permission denied error
- [x] Handles no camera found error
- [x] Handles unknown errors
- [x] Cleans up and stops all tracks on stop
- [x] Returns correct status and error state
- [x] Handles rapid start/stop cycles

## 2. MediaPipeLoader (tests/mediaPipeLoader.test.ts)
- [x] Loads MediaPipe Selfie Segmentation from default CDN
- [x] Loads from custom CDN URL
- [x] Handles script load failure (network error)
- [x] Exposes and switches model selection (fast/accurate)
- [x] Throws and surfaces errors on load failure
- [x] Returns instance only after successful load

## 3. Background Management (tests/backgrounds.test.ts)
- [x] Preloads valid image backgrounds
- [x] Handles image load errors (invalid URL, 404)
- [x] Supports blur mode (no image preload)
- [x] Returns correct loaded state for all backgrounds
- [x] Handles dynamic update of backgrounds

## 4. Compositing Logic (tests/compositor.test.ts)
- [x] Composites person with blur background
- [x] Composites person with image background
- [x] Handles mirroring option
- [x] Handles dynamic canvas sizing
- [x] Handles missing/invalid mask gracefully
- [x] Handles missing/invalid background image gracefully
- [x] No memory leaks (offscreen canvas reuse)

## 5. useWebcamBackgroundSwitcher Hook (tests/useWebcamBackgroundSwitcher.test.ts)
- [x] Initializes and cleans up webcam and MediaPipe *(test implemented, currently failing due to React renderer/act environment)*
- [x] Preloads and switches backgrounds *(test implemented, currently failing)*
- [x] Exposes refs, status, error, and API methods *(test implemented, currently failing)*
- [x] Runs compositing loop and updates canvas *(test implemented, currently failing)*
- [x] Handles all error states and propagates to onError *(test implemented, currently failing)*
- [x] Supports model selection, blur radius, and mirror options *(test implemented, currently failing)*
- [x] SSR safety: does not break if run on server *(test implemented, currently failing)*
- [x] Handles rapid prop changes (backgrounds, model, etc.) *(test implemented, currently failing)*
- [x] Cleans up all resources on unmount *(test implemented, currently failing)*
- **Note:** These tests are failing due to the current testing environment not supporting React's act() and renderer requirements. All other core logic is covered by passing tests.

## 6. Integration & Manual Tests *(not yet implemented)*
- [ ] End-to-end: user can switch backgrounds and see correct output
- [ ] End-to-end: user can toggle blur, image, and mirror modes
- [ ] End-to-end: error/fallback UI shown on webcam or model failure
- [ ] Works in Chrome, Firefox, Safari (manual)
- [ ] Works with multiple webcams (if available)
- [ ] Performance: maintains acceptable FPS on mid-range hardware

---

**Note:**
- All core logic except the main hook is now covered by passing unit tests.
- The main hook's tests are implemented but currently fail due to environment/renderer issues (React act/renderer not supported in this setup).
- Integration/manual tests are not yet implemented.
- Each test should check both expected behavior and edge/error cases. Unit tests should mock browser APIs where possible. Integration/manual tests should be run in a real browser environment. 