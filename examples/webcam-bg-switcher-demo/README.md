# Webcam Background Switcher Demo with Face Filters

This demo showcases the BackdropEngine package with both background switching and face filter capabilities.

## Features

### Background Switching
- **None**: Original webcam feed
- **Blur**: Background blur effect
- **Image**: Custom background images (Office, Beach, Mountains, etc.)

### Face Filters
- **Glasses**: Overlay glasses on eyes
- **Hat**: Add a hat on the face
- **Mask**: Add a mask on the mouth
- **Multiple Filters**: Combine multiple filters simultaneously
- **Real-time Tracking**: Filters follow facial movements

## How to Use

1. **Allow Camera Access**: Click "Allow" when prompted for camera access
2. **Switch Backgrounds**: Use the background control buttons to change backgrounds
3. **Add Face Filters**: Click the filter buttons to add/remove face filters
4. **Combine Effects**: Use both background switching and face filters together
5. **Clear Filters**: Use "Clear All Filters" to remove all face filters

## Technical Details

### Face Filter Implementation
- Uses Jeeliz FaceFilter for real-time face detection
- 468 facial landmarks for precise positioning
- Automatic scaling and rotation based on face movement
- Performance optimized with frame skipping

### Sample Filters
The demo includes three sample filters:
- **Glasses**: Positioned on eyes with 1.2x scale
- **Hat**: Positioned on face with offset for proper placement
- **Mask**: Positioned on mouth area

### Performance
- Maintains 30+ FPS with both background switching and face filters
- Adaptive frame skipping for optimal performance
- Memory efficient with image caching

## Development

This demo uses:
- React 18+
- TypeScript
- BackdropEngine (local package)
- Jeeliz FaceFilter (CDN)

## Browser Compatibility

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Mobile: Good performance on modern devices

## Troubleshooting

1. **Camera not working**: Ensure HTTPS or localhost, check camera permissions
2. **Face filters not appearing**: Wait for face detection to initialize (may take a few seconds)
3. **Performance issues**: Try reducing frame skip settings or disabling some filters
4. **Filters not positioned correctly**: Ensure good lighting and face visibility

## Next Steps

- Add more filter types (animations, color effects)
- Implement filter customization controls
- Add filter intensity adjustments
- Create custom filter upload functionality
