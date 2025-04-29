# Project Task List: React Webcam Background Switcher (Core, UI-Agnostic)

A detailed breakdown of tasks for building a reusable, UI-agnostic webcam background switcher package for React/Next.js.

---

## 1. Project Setup
- **Status:** [x] Complete
- **Remarks:** npm initialized, TypeScript, ESLint, Prettier, Husky, lint-staged installed and configured. Prettier config and .gitignore added.
- **Details:** Initialize the project with TypeScript, linting, and testing tools. Set up the build system (e.g., Vite, TSDX, or similar).
- **Subtasks:**
  - Set up TypeScript config for library output
  - Configure ESLint, Prettier, and Husky (pre-commit hooks)
  - Add CI for linting and tests
- **Acceptance Criteria:**
  - Project builds and lints with no errors
  - CI passes on push/PR
- **Risks & Mitigations:**
  - *Risk:* Incompatible build config for consumers → *Mitigation:* Test with example consumer app

---

## 2. MediaPipe Integration
- **Status:** [x] Tested (unit tests passing)
- **Remarks:** MediaPipe loader utility implemented and covered by passing unit tests. Needs further integration and manual/integration testing.
- **Details:** Integrate MediaPipe Selfie Segmentation via CDN or npm. Provide a utility to load and manage the segmentation model.
- **Subtasks:**
  - Create a loader for MediaPipe (async, error handling)
  - Expose model selection (fast/accurate)
  - Document model options
- **Acceptance Criteria:**
  - Model loads and can be switched at runtime
  - Errors are surfaced to the user
- **Edge Cases:**
  - Model fails to load (network, CDN down)
- **Risks & Mitigations:**
  - *Risk:* CDN unavailable → *Mitigation:* Allow custom loader URL

---

## 3. Webcam Access Utility
- **Status:** [x] Tested (unit tests passing)
- **Remarks:** Modular WebcamManager utility implemented and covered by passing unit tests. Needs further integration and manual/integration testing.
- **Details:** Implement logic to request webcam access and manage the video stream lifecycle.
- **Subtasks:**
  - Request webcam with constraints
  - Handle permission denied, no camera, multiple cameras
  - Clean up stream on unmount
- **Acceptance Criteria:**
  - Video stream starts and stops cleanly
  - All error states are handled and surfaced
- **Edge Cases:**
  - User revokes permission mid-session
  - Device switches (e.g., laptop lid closed)
- **Risks & Mitigations:**
  - *Risk:* Unreleased camera resources → *Mitigation:* Always stop tracks on cleanup

---

## 4. Core Compositing Logic
- **Status:** [x] Tested (unit tests passing)
- **Remarks:** Modular, UI-agnostic compositing utility implemented in src/utils/compositor.ts. Covered by passing unit tests (canvas mocked). Needs further integration and manual/integration testing.
- **Details:** Write functions to composite the segmented person with a blurred or image background on a canvas.
- **Subtasks:**
  - Implement blur mode (with adjustable blur radius)
  - Implement image mode (with image preloading and fallback)
  - (Optional) Implement video mode (background video)
  - Use efficient offscreen canvas for compositing
  - Support dynamic canvas sizing
  - Implement frame skipping
- **Acceptance Criteria:**
  - Output is correct for all modes
  - Performance is acceptable on mid-range hardware
- **Edge Cases:**
  - Image fails to load
  - Canvas resize during session
- **Risks & Mitigations:**
  - *Risk:* Memory leaks from canvases → *Mitigation:* Reuse and clean up canvases

---

## 5. React Hook API (`useWebcamBackgroundSwitcher`)
- **Status:** [x] Tests implemented (currently failing due to environment/renderer issues)
- **Remarks:** useWebcamBackgroundSwitcher hook implemented and fully tested, but tests are currently failing due to React renderer/act environment issues. All other core logic is covered by passing unit tests. Needs further integration and manual/integration testing.
- **Details:** Expose the core logic as a React hook, providing refs, state, and methods for background switching.
- **Subtasks:**
  - Provide refs for video/canvas
  - Expose setBackground, setModel, setMirror, etc.
  - Expose status, error, and current mode
  - Allow configuration of frame skipping and model selection
- **Acceptance Criteria:**
  - Hook is type-safe and easy to use
  - All modes and options are accessible via the API
- **Edge Cases:**
  - Hook used in SSR context (should not break)
- **Risks & Mitigations:**
  - *Risk:* Memory leaks or dangling refs → *Mitigation:* Use cleanup in useEffect

---

## 6. Background Management
- **Status:** [x] Tested (unit tests passing)
- **Remarks:** Preloading, switching, and error handling for backgrounds implemented and covered by passing unit tests. Needs further integration and manual/integration testing.
- **Details:** Implement logic for preloading, switching, and validating background images (and blur mode).
- **Subtasks:**
  - Preload images and handle errors
  - Allow dynamic update of backgrounds
  - Validate image dimensions
- **Acceptance Criteria:**
  - Switching backgrounds is seamless
  - Errors are surfaced if image fails
- **Edge Cases:**
  - User provides invalid image URL
- **Risks & Mitigations:**
  - *Risk:* UI freeze on large images → *Mitigation:* Downscale images before use

---

## 7. Error Handling & State Management
- **Status:** [~] Partial
- **Remarks:** Error handling is present and tested in core utilities. Needs further standardization and integration in the main hook and UI.
- **Details:** Standardize error reporting and expose status/error state via the hook.
- **Subtasks:**
  - Centralize error handling
  - Provide clear error messages for all failure modes
  - Expose error and status in API
- **Acceptance Criteria:**
  - All errors are surfaced to the developer/user
  - No silent failures
- **Edge Cases:**
  - Multiple errors at once (e.g., image and webcam)
- **Risks & Mitigations:**
  - *Risk:* Unclear error propagation → *Mitigation:* Use error boundaries and logging

---

## 8. Documentation & Examples
- **Status:** [ ] Incomplete
- **Remarks:** To be implemented. Will document all modes, API, and provide usage examples.
- **Details:** Write comprehensive documentation, including API reference, usage examples, and SSR/Next.js notes.
- **Subtasks:**
  - Document all modes (blur, image, video)
  - Provide code samples for each mode
  - Add troubleshooting/FAQ section
- **Acceptance Criteria:**
  - Docs are clear, complete, and up to date
- **Edge Cases:**
  - API changes not reflected in docs
- **Risks & Mitigations:**
  - *Risk:* Outdated docs → *Mitigation:* Docs as part of PR review

---

## 9. Testing
- **Status:** [~] Partial
- **Remarks:** All core logic except the main hook is now covered by passing unit tests. The main hook's tests are implemented but currently fail due to environment/renderer issues. Integration/manual tests are still pending.
- **Details:** Write unit and integration tests for all utilities and the hook. Add example/test app for manual testing.
- **Subtasks:**
  - Unit tests for compositing, background switching, error handling
  - Integration tests for hook usage
  - Manual test app for real webcam
- **Acceptance Criteria:**
  - All core logic is covered by tests
  - Manual test app works in Chrome, Firefox, Safari
- **Edge Cases:**
  - Browser-specific webcam/MediaPipe quirks
- **Risks & Mitigations:**
  - *Risk:* Flaky tests due to webcam → *Mitigation:* Mock browser APIs in CI

---

## 10. Packaging & Publishing
- **Status:** [ ] Incomplete
- **Remarks:** To be implemented. Will bundle types, test install, and prepare for npm publish.
- **Details:** Prepare the package for npm publishing, including type declarations and optimized build output.
- **Subtasks:**
  - Bundle types and source maps
  - Test install in a clean project
  - Write release notes
- **Acceptance Criteria:**
  - Package installs and works as expected
  - Types are available for consumers
- **Edge Cases:**
  - Consumer uses different React version
- **Risks & Mitigations:**
  - *Risk:* Broken publish → *Mitigation:* Use npm dry-run and test publish

---

## 11. (Optional) Advanced Features
- **Status:** [ ] Incomplete
- **Remarks:** To be implemented. Will add video backgrounds, uploads, and new models.
- **Details:** Add support for video backgrounds, user-uploaded backgrounds, or additional segmentation models.
- **Subtasks:**
  - Video element as background
  - File upload for custom backgrounds
  - Support for new segmentation models
- **Acceptance Criteria:**
  - Advanced features work without breaking core
- **Edge Cases:**
  - Large video files, unsupported formats
- **Risks & Mitigations:**
  - *Risk:* Performance drop → *Mitigation:* Benchmark and optimize

---

## Cross-Cutting Concerns
- **Performance:** Frame skipping, model selection, dynamic canvas sizing, offscreen canvas reuse
- **Modes:** Blur, image, (optional) video
- **Error Handling:** All async and user input errors must be surfaced
- **SSR Safety:** No browser-only code outside useEffect

---
