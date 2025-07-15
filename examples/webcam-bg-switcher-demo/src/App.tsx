import React, { useMemo, useState } from 'react';
// @ts-ignore: Local symlinked package for demo purposes
import { useWebcamBackgroundSwitcher } from 'backdrop-engine';
import { BeautyFilter } from '../../../src/utils/faceFilters';
import './App.css';

// Sample backgrounds
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

// Sample beauty filters
const beautyFilterOptions: BeautyFilter[] = [
  {
    id: 'skin-smoothing',
    type: 'skin-smoothing',
    intensity: 0.5,
    enabled: true,
    options: {
      blurRadius: 3,
    },
  },
  {
    id: 'eye-enhancement',
    type: 'eye-enhancement',
    intensity: 0.6,
    enabled: true,
    options: {
      brightness: 1.2,
      contrast: 1.1,
    },
  },
  {
    id: 'lip-enhancement',
    type: 'lip-enhancement',
    intensity: 0.4,
    enabled: true,
    options: {
      color: '#ff6b9d',
    },
  },
  {
    id: 'face-contouring',
    type: 'face-contouring',
    intensity: 0.3,
    enabled: true,
    options: {
      slimFactor: 0.1,
    },
  },
  {
    id: 'blush',
    type: 'blush',
    intensity: 0.5,
    enabled: true,
    options: {
      blushColor: '#ff9999',
      blushOpacity: 0.3,
    },
  },
  {
    id: 'brightening',
    type: 'brightening',
    intensity: 0.4,
    enabled: true,
  },
];

function App() {
  const [selectedBeautyFilters, setSelectedBeautyFilters] = useState<BeautyFilter[]>([]);

  const options = useMemo(() => ({
    backgrounds,
    width: 640,
    height: 480,
    debug: true,
    enableFaceFilters: true,
    jeelizOptions: {
      canvasId: 'jeeFaceFilterCanvas',
      NNPath: '/NN_DEFAULT.json',
      callbackReady: () => console.log('Jeeliz ready'),
      callbackTrack: (state: any) => console.log('Jeeliz track', state),
    },
  }), []);

  const {
    videoRef,
    canvasRef,
    setBackground,
    status,
    error,
    currentBackground,
    availableBackgrounds,
    faceDetections,
    beautyFilters,
    addBeautyFilter,
    removeBeautyFilter,
    clearBeautyFilters,
    jeelizStatus,
  } = useWebcamBackgroundSwitcher(options);

  const handleBackgroundChange = (background: any) => {
    setBackground(background);
  };

  const handleBeautyFilterToggle = (filter: BeautyFilter) => {
    const isActive = selectedBeautyFilters.some(f => f.id === filter.id);
    if (isActive) {
      removeBeautyFilter(filter.id);
      setSelectedBeautyFilters(prev => prev.filter(f => f.id !== filter.id));
    } else {
      addBeautyFilter(filter);
      setSelectedBeautyFilters(prev => [...prev, filter]);
    }
  };

  const handleClearBeautyFilters = () => {
    clearBeautyFilters();
    setSelectedBeautyFilters([]);
  };

  if (status === 'loading') {
    return <div className="App">Loading...</div>;
  }

  if (error) {
    return <div className="App">Error: {error.message}</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Webcam Background Switcher with Beauty Filters</h1>
      </header>

      <main className="App-main">
        <div className="video-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ display: 'none' }}
          />
          <canvas
            id="jeeFaceFilterCanvas"
            ref={canvasRef}
            width={640}
            height={480}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'cover',
              aspectRatio: '4 / 3',
            }}
          />
        </div>

        <div className="controls">
          <div className="control-section">
            <h3>Background</h3>
            <div className="button-group">
              {availableBackgrounds.map((bg) => (
                <button
                  key={bg.option.label}
                  onClick={() => handleBackgroundChange(bg)}
                  className={currentBackground?.option.label === bg.option.label ? 'active' : ''}
                >
                  {bg.option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-section">
            <h3>Beauty Filters</h3>
            <div className="button-group">
              {beautyFilterOptions.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => handleBeautyFilterToggle(filter)}
                  className={selectedBeautyFilters.some(f => f.id === filter.id) ? 'active' : ''}
                >
                  {filter.type.replace('-', ' ')}
                </button>
              ))}
              <button onClick={handleClearBeautyFilters} className="clear-btn">
                Clear All
              </button>
            </div>
          </div>

          <div className="status-section">
            <h3>Status</h3>
            <div className="status-grid">
              <div>Background: {currentBackground?.option.label || 'None'}</div>
              <div>Face Detection: {jeelizStatus === 'ready' ? 'Ready' : jeelizStatus}</div>
              <div>Active Filters: {selectedBeautyFilters.length}</div>
              <div>✓ Face Detected: {faceDetections.length > 0 ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
