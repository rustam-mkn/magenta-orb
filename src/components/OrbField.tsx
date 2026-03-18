import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  MathUtils,
  Points,
  ShaderMaterial,
} from 'three'
import { ORB_CONFIG } from '../orb/config'

const vertexShader = `
  precision highp float;

  uniform float uPixelRatio;

  attribute float aSize;
  attribute vec3 aColor;

  varying vec3 vColor;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio * (1.0 / max(0.85, -mvPosition.z));
    vColor = aColor;
  }
`

const fragmentShader = `
  precision highp float;

  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    float core = smoothstep(0.34, 0.0, dist);
    float glow = smoothstep(0.78, 0.0, dist);
    float alpha = core * 0.92 + glow * 0.34;

    if (alpha < 0.02) {
      discard;
    }

    gl_FragColor = vec4(vColor, alpha);
  }
`

type OrbData = {
  geometry: BufferGeometry
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  spherical: Float32Array
  random: Float32Array
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function rotateXY(x: number, y: number, angle: number) {
  const s = Math.sin(angle)
  const c = Math.cos(angle)
  return [x * c - y * s, x * s + y * c] as const
}

function rotateXZ(x: number, z: number, angle: number) {
  const s = Math.sin(angle)
  const c = Math.cos(angle)
  return [x * c - z * s, x * s + z * c] as const
}

function rotateYZ(y: number, z: number, angle: number) {
  const s = Math.sin(angle)
  const c = Math.cos(angle)
  return [y * c - z * s, y * s + z * c] as const
}

function createOrbData(): OrbData {
  const count = ORB_CONFIG.pointCount
  const geometry = new BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const spherical = new Float32Array(count * 2)
  const random = new Float32Array(count)

  let index = 0
  for (let y = 0; y < ORB_CONFIG.latSegments; y += 1) {
    const v = (y + 0.5) / ORB_CONFIG.latSegments

    for (let x = 0; x < ORB_CONFIG.lonSegments; x += 1) {
      const u = x / ORB_CONFIG.lonSegments
      const i2 = index * 2

      spherical[i2] = u
      spherical[i2 + 1] = v
      random[index] = Math.random()
      sizes[index] = 4

      index += 1
    }
  }

  const positionAttribute = new BufferAttribute(positions, 3)
  positionAttribute.setUsage(DynamicDrawUsage)
  const colorAttribute = new BufferAttribute(colors, 3)
  colorAttribute.setUsage(DynamicDrawUsage)
  const sizeAttribute = new BufferAttribute(sizes, 1)
  sizeAttribute.setUsage(DynamicDrawUsage)

  geometry.setAttribute('position', positionAttribute)
  geometry.setAttribute('aColor', colorAttribute)
  geometry.setAttribute('aSize', sizeAttribute)

  return { geometry, positions, colors, sizes, spherical, random }
}

function createMaterial(pixelRatio: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader,
    fragmentShader,
  })
}

export function OrbField() {
  const pointsRef = useRef<Points>(null)
  const materialRef = useRef<ShaderMaterial | null>(null)

  const orbData = useMemo(() => createOrbData(), [])
  const material = useMemo(() => {
    const next = createMaterial(Math.min(window.devicePixelRatio || 1, 2))
    materialRef.current = next
    return next
  }, [])

  useFrame((state) => {
    const points = pointsRef.current
    if (!points) {
      return
    }

    const rawTime = state.clock.elapsedTime
    const t = rawTime * 0.46
    const { positions, colors, sizes, spherical, random, geometry } = orbData

    for (let index = 0; index < ORB_CONFIG.pointCount; index += 1) {
      const i2 = index * 2
      const i3 = index * 3
      const u = spherical[i2]
      const v = spherical[i2 + 1]
      const seed = random[index]

      const phi = (u - 0.5) * Math.PI * 2
      const theta = v * Math.PI

      const dirX = Math.sin(theta) * Math.cos(phi)
      const dirY = Math.cos(theta)
      const dirZ = Math.sin(theta) * Math.sin(phi)

      let flowAX = dirX
      let flowAY = dirY
      let flowAZ = dirZ
      ;[flowAX, flowAZ] = rotateXZ(flowAX, flowAZ, 0.42 * Math.sin(t * 0.65))
      ;[flowAX, flowAY] = rotateXY(flowAX, flowAY, 0.32 * Math.cos(t * 0.41))

      let flowBX = dirX
      let flowBY = dirY
      let flowBZ = dirZ
      ;[flowBY, flowBZ] = rotateYZ(flowBY, flowBZ, t * 0.82 + dirX * 0.35)
      ;[flowBX, flowBZ] = rotateXZ(flowBX, flowBZ, 0.28 * Math.sin(t * 0.77 + dirY * 2.6))

      const ringSweep = Math.exp(-((flowAX * 0.88 + flowAY * 0.34 - 0.42 * Math.sin(t * 0.64)) ** 2) / 0.022)
      const ribbonShape = flowBZ - 0.18 * Math.sin(flowBX * 4.8 + t * 2.2)
      const ribbon =
        Math.exp(-(ribbonShape ** 2) / 0.03) * smoothstep(-0.95, 0.55, flowBX)
      const loopA =
        Math.exp(
          -((Math.hypot(flowBX + 0.26 * Math.sin(t * 0.86), flowBY - 0.22 * Math.cos(t * 0.66)) - 0.31) ** 2) /
            0.01,
        )
      const loopB =
        Math.exp(
          -((Math.hypot(flowAZ - 0.31 * Math.cos(t * 0.58), flowAY + 0.18 * Math.sin(t * 0.9)) - 0.24) ** 2) /
            0.008,
        )
      const band = Math.min(Math.max(Math.max(ringSweep, ribbon, loopA, loopB), 0), 1)

      const latWave = Math.sin(v * Math.PI * 7 - t * 1.55 + Math.sin(u * Math.PI * 4)) * 0.022
      const swirlWave = Math.sin((u - v) * Math.PI * 14 + t * 2.15 + seed * 10) * 0.01
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.62 + seed * 12)

      let radius = 1 + latWave * 0.7 + swirlWave * 0.55 + band * 0.052 + loopA * 0.038 + loopB * 0.03
      radius = Math.min(Math.max(radius, 0.965), 1.075)

      let px = dirX * radius
      let py = dirY * radius
      let pz = dirZ * radius

      ;[px, pz] = rotateXZ(px, pz, (0.08 + band * 0.1) * Math.sin(t * 0.78 + dirY * 2.4))
      ;[px, py] = rotateXY(px, py, (0.055 + loopA * 0.1) * Math.cos(t * 0.56 + dirZ * 2.1))

      const shellPush = ribbon * 0.008 + loopA * 0.012 + loopB * 0.01
      px += dirX * shellPush
      py += dirY * shellPush
      pz += dirZ * shellPush

      positions[i3] = px * ORB_CONFIG.radius
      positions[i3 + 1] = py * ORB_CONFIG.radius
      positions[i3 + 2] = pz * ORB_CONFIG.radius

      const front = smoothstep(-0.9, 0.65, dirZ)
      const shell = smoothstep(0.94, 1.0, radius) * 0.42 + 0.34
      const energy = mix(0.42, 1.0, band) * (0.84 + pulse * 0.16) * shell
      const baseT = Math.min(Math.max(shell * 0.48 + band * 0.82 + front * 0.16, 0), 1)
      const accentT = Math.min(Math.max(shell * 0.18 + band * 0.34 + pulse * 0.14, 0), 1)

      let r = mix(0.62, 1.0, baseT)
      let g = mix(0.05, 0.31, baseT)
      let b = mix(0.28, 0.63, baseT)

      r = mix(r, 1.0, accentT)
      g = mix(g, 0.58, accentT)
      b = mix(b, 0.86, accentT)

      colors[i3] = r * energy
      colors[i3 + 1] = g * energy
      colors[i3 + 2] = b * energy
      sizes[index] = mix(5.8, 11.0, band) + front * 1.05 + pulse * 0.4
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.aColor.needsUpdate = true
    geometry.attributes.aSize.needsUpdate = true
    geometry.computeBoundingSphere()

    points.rotation.y = rawTime * 0.11
  })

  return (
    <points
      ref={pointsRef}
      geometry={orbData.geometry}
      material={material}
      frustumCulled={false}
    />
  )
}
