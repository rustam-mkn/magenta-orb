import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { OrbScene } from './components/OrbScene'
import './index.css'

function App() {
  return (
    <main className="app-shell">
      <div className="scene-frame">
        <div className="orb-visualization" aria-hidden="true">
          <div className="orb-visualization__core" />
          <div className="orb-visualization__band orb-visualization__band--a" />
          <div className="orb-visualization__band orb-visualization__band--b" />
          <div className="orb-visualization__dots" />
        </div>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 4.8], fov: 28 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <OrbScene />
          </Suspense>
        </Canvas>
        <div className="lens-overlay" aria-hidden="true" />
        <div className="hud-overlay" aria-hidden="true">
          <span className="hud-mark hud-mark-top" />
          <span className="hud-mark hud-mark-right" />
          <span className="hud-mark hud-mark-bottom" />
          <span className="hud-mark hud-mark-left" />
        </div>
      </div>
      <div className="scene-copy">
        <p className="scene-copy__eyebrow">Procedural Visualization</p>
        <h1 className="scene-copy__title">Magenta Orb</h1>
      </div>
    </main>
  )
}

export default App
