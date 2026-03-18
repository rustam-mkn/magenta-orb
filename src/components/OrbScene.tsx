import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, Group } from 'three'
import { OrbField } from './OrbField'

export function OrbScene() {
  const groupRef = useRef<Group>(null)

  useFrame((state) => {
    const group = groupRef.current
    if (!group) {
      return
    }

    const t = state.clock.elapsedTime
    group.rotation.y = t * 0.12
    group.rotation.x = Math.sin(t * 0.23) * 0.08
    group.rotation.z = Math.cos(t * 0.17) * 0.05
  })

  return (
    <>
      <color attach="background" args={['#12000a']} />
      <fog attach="fog" args={['#12000a', 5.2, 10]} />
      <ambientLight intensity={0.2} color={new Color('#ff4da6')} />
      <group ref={groupRef}>
        <OrbField />
      </group>
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.95}
          luminanceThreshold={0.08}
          luminanceSmoothing={0.22}
          mipmapBlur
          radius={0.78}
        />
        <Noise opacity={0.018} premultiply />
        <Vignette eskil={false} offset={0.16} darkness={0.82} />
      </EffectComposer>
    </>
  )
}
