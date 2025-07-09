import React from 'react';
import VideoComponent from '../components/VideoComponent';

const HomePage: React.FC = () => (
    <div style={{ padding: 32 }}>
        <h1>BackDrop Engine Demo (Next.js)</h1>
        <p>This demo shows how to use the core logic in a Next.js app.</p>
        <VideoComponent />
    </div>
);

export default HomePage; 