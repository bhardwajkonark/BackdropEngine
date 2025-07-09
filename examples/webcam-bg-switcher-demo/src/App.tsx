import React, { useMemo } from 'react';
// @ts-ignore: Local symlinked package for demo purposes
import { useWebcamBackgroundSwitcher } from 'backdrop-engine';
const backgrounds = [
  { label: 'None', type: 'none' as const },
  { label: 'Blur', type: 'blur' as const },
  { label: 'Office', type: 'image' as const, src: '/office.jpg' },
  { label: 'Office Green', type: 'image' as const, src: '/office-green.jpg' },
  //add more from unsplash
  { label: 'Beach', type: 'image' as const, src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80' },
  { label: 'Mountains', type: 'image' as const, src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Forest', type: 'image' as const, src: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=800&q=80' },
  { label: 'Desert', type: 'image' as const, src: 'https://images.unsplash.com/photo-1595124028480-cdfd7be7b85d?auto=format&fit=crop&w=800&q=80' },
  { label: 'River', type: 'image' as const, src: 'https://images.unsplash.com/photo-1593132808462-578ca7a387d9?auto=format&fit=crop&w=800&q=80' },
  { label: 'Sky', type: 'image' as const, src: 'https://images.unsplash.com/photo-1470434158598-88e7ad324132?auto=format&fit=crop&w=800&q=80' },
  { label: 'Sunset', type: 'image' as const, src: 'https://images.unsplash.com/photo-1503803548695-c2a7b4a5b875?auto=format&fit=crop&w=800&q=80' },

];

function App() {
  const options = useMemo(() => ({
    backgrounds,
    width: 640,
    height: 480,
    onError: (err: Error | { type: string; message: string }) => {
      if ('message' in err) {
        console.error(err.message);
      } else {
        console.error(err);
      }
    },
    debug: true,
    frameSkip: 2,
    // blurRadius: 10,
    mirror: false,
  }), []);

  const {
    canvasRef,
    videoRef,
    setBackground,
    status,
    error,
    currentBackground,
    availableBackgrounds,
  } = useWebcamBackgroundSwitcher(options);

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', textAlign: 'center' }}>Webcam Background Switcher Demo</h1>
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {availableBackgrounds.map((bg: any) => (
          <button
            key={bg.option.label}
            onClick={() => setBackground(bg)}
            style={{
              margin: 4,
              padding: '8px 16px',
              background: currentBackground?.option.label === bg.option.label ? '#1976d2' : '#eee',
              color: currentBackground?.option.label === bg.option.label ? '#fff' : '#222',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {bg.option.label}
          </button>
        ))}
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          margin: '0 auto',
          aspectRatio: '4 / 3', // modern browsers
          background: '#000',
          border: '1px solid #ccc',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
            aspectRatio: '4 / 3', // for extra safety
          }}
        />
        {status === 'loading' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: '#1976d2',
              zIndex: 2,
            }}
          >
            Loading...
          </div>
        )}
        {status === 'error' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(255,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: '#d32f2f',
              zIndex: 2,
            }}
          >
            Error: {error?.message}
          </div>
        )}
      </div>
      <p style={{ marginTop: 24, color: '#888', textAlign: 'center' }}>
        Try switching backgrounds above. This demo uses the local webcam background switcher package.
      </p>
      <style>{`
        @media (max-width: 700px) {
          h1 { font-size: 1.3rem; }
          div[style*='max-width: 640px'] { max-width: 100vw !important; }
        }
      `}</style>
    </div>
  );
}

export default App;
