import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { OrbScene } from './components/OrbScene'
import './index.css'

function App() {
  return (
    <main className="app-shell">
      <div className="scene-frame">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 4.8], fov: 28 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <OrbScene />
          </Suspense>
        </Canvas>
      </div>
      <div className="scene-copy">
        <p className="scene-copy__eyebrow">Procedural Visualization</p>
        <h1 className="scene-copy__title">MAGENTA ORB</h1>
      </div>
    </main>
  )
}

export default App
