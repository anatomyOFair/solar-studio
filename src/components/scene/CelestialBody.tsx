import { useState, useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { positionToScene, radiusToScene, PLANET_COLORS, DEFAULT_COLOR } from '../../utils/sceneScaling'
import { extrapolatePosition } from '../../utils/extrapolatePosition'
import { useStore } from '../../store/store'
import type { CelestialObject } from '../../types'

import mercuryTex from '../../assets/textures/8k_mercury.jpg'
import venusTex from '../../assets/textures/8k_venus_surface.jpg'
import earthTex from '../../assets/textures/8k_earth_daymap.jpg'
import earthCloudsTex from '../../assets/textures/8k_earth_clouds.jpg'
import earthNightTex from '../../assets/textures/8k_earth_nightmap.jpg'
import marsTex from '../../assets/textures/8k_mars.jpg'
import jupiterTex from '../../assets/textures/8k_jupiter.jpg'
import saturnTex from '../../assets/textures/8k_saturn.jpg'
import saturnRingTex from '../../assets/textures/8k_saturn_ring_alpha.png'
import uranusTex from '../../assets/textures/2k_uranus.jpg'
import neptuneTex from '../../assets/textures/2k_neptune.jpg'

// Rotation speed multipliers relative to Earth (1.0) — based on real sidereal periods.
// Base visual speed is slow enough to appreciate the day/night terminator.
// Venus is retrograde (negative). Gas giants spin ~2.5× faster than Earth.
// Real-time rotation: Earth completes 2π rad in 86164s (sidereal day).
// 2π / 86164 ≈ 0.0000729 rad/s. useFrame delta is in seconds.
const BASE_ROTATION_RAD_S = (2 * Math.PI) / 86164
const ROTATION_SPEED: Record<string, number> = {
  mercury:  0.017,  // 58.6 day period
  venus:   -0.004,  // 243 days, retrograde
  earth:    1.0,
  mars:     0.97,
  jupiter:  2.44,
  saturn:   2.27,
  uranus:   1.39,
  neptune:  1.49,
}

// Atmosphere config: [color, intensity, exponent, scale]
// Real atmosphere ratios are tiny (Earth = 1.016, Jupiter = 1.001) — invisible at scene scale.
// We exaggerate uniformly but preserve relative proportions and use real colors/opacities.
// Venus = thickest visible haze, Mars = thinnest, gas giants = subtle (their "surface" IS atmosphere).
const ATMOSPHERE: Record<string, [string, number, number, number]> = {
  earth:   ['#6BA3D6', 0.45, 2.2, 1.07],  // thin transparent blue limb
  venus:   ['#e8d5a0', 0.6, 1.9, 1.07],   // thick opaque yellow-white sulfuric haze
  mars:    ['#c4836a', 0.2, 3.2, 1.05],   // very thin reddish-tan dust haze
  jupiter: ['#d4a56a', 0.28, 2.8, 1.04],  // subtle warm glow at cloud tops
  saturn:  ['#c9b87a', 0.2, 2.8, 1.04],   // faint golden haze
  uranus:  ['#7fdbda', 0.3, 2.8, 1.04],   // pale cyan methane glow
  neptune: ['#4a6bdf', 0.35, 2.8, 1.04],  // deep blue methane haze
}

const atmosVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`

const atmosFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uExponent;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float rim = 1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0);
    // rim=0 at center (occluded by planet), rim=1 at outer edge
    // Multiply rim (grows outward) by (1-rim)^exp (fades at outer edge)
    // Result: glow peaks near the planet surface and diffuses to transparent
    float glow = pow(rim, 1.5) * pow(1.0 - rim, uExponent) * 4.0;
    gl_FragColor = vec4(uColor, glow * uIntensity);
  }
`

// Earth day/night shader — blends day texture with emissive night lights based on sun direction
const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vSunDir;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    // Sun is at world origin
    vSunDir = normalize(-worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const earthFragmentShader = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vSunDir;
  void main() {
    vec3 day = texture2D(uDayMap, vUv).rgb;
    vec3 night = texture2D(uNightMap, vUv).rgb;
    float NdotL = dot(vNormalWorld, vSunDir);
    // Smooth transition at the terminator
    float blend = smoothstep(-0.1, 0.2, NdotL);
    // Day: texture * lambertian, Night: emissive city lights
    vec3 dayLit = day * max(NdotL, 0.0) + day * 0.03;
    vec3 nightLit = night * 1.5;
    gl_FragColor = vec4(mix(nightLit, dayLit, blend), 1.0);
  }
`

const TEXTURE_PATHS: Record<string, string> = {
  mercury: mercuryTex,
  venus: venusTex,
  earth: earthTex,
  mars: marsTex,
  jupiter: jupiterTex,
  saturn: saturnTex,
  uranus: uranusTex,
  neptune: neptuneTex,
}

interface CelestialBodyProps {
  object: CelestialObject
}

function TexturedPlanet({ object }: CelestialBodyProps) {
  const simulatedTime = useStore((state) => state.simulatedTime)
  const objectsUpdatedAt = useStore((state) => state.objectsUpdatedAt)

  const { x, y, z } = useMemo(() => {
    const effectiveTime = simulatedTime ?? new Date()
    return extrapolatePosition(object, effectiveTime, objectsUpdatedAt)
  }, [object, simulatedTime, objectsUpdatedAt])

  const radius = radiusToScene(object.radius_km ?? 1000, object.id)
  const color = PLANET_COLORS[object.id] ?? DEFAULT_COLOR
  const position = positionToScene(x, y, z)

  const selectedObject = useStore((state) => state.selectedObject)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const isSelected = selectedObject?.id === object.id

  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)

  const texturePath = TEXTURE_PATHS[object.id]
  const hasTexture = !!texturePath
  const isEarth = object.id === 'earth'
  const isSaturn = object.id === 'saturn'

  const textures = useLoader(
    THREE.TextureLoader,
    hasTexture
      ? isEarth
        ? [texturePath, earthCloudsTex, earthNightTex]
        : isSaturn
          ? [texturePath, saturnRingTex]
          : [texturePath]
      : []
  )

  const mainTexture = textures[0] ?? null
  const secondaryTexture = textures[1] ?? null
  const nightTexture = isEarth ? (textures[2] ?? null) : null

  // Saturn ring geometry — flat annulus
  const ringGeometry = useMemo(() => {
    if (!isSaturn) return null
    const inner = radius * 1.2
    const outer = radius * 2.2
    const geo = new THREE.RingGeometry(inner, outer, 64)
    // Rotate UVs so texture maps radially
    const pos = geo.attributes.position
    const uv = geo.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const dist = Math.sqrt(x * x + y * y)
      uv.setXY(i, (dist - inner) / (outer - inner), 0.5)
    }
    return geo
  }, [isSaturn, radius])

  useFrame((_state, delta) => {
    if (!groupRef.current) return
    const target = hovered || isSelected ? 1.2 : 1.0
    groupRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1)

    if (isEarth && meshRef.current) {
      // Absolute rotation so the lit hemisphere matches real geography.
      // Subsolar longitude ≈ (12 − UTCh) × 15° — the meridian where it's noon.
      const now = useStore.getState().simulatedTime ?? new Date()
      const utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600
      const sunLon = (12 - utcH) * (Math.PI / 12)
      meshRef.current.rotation.y = Math.atan2(position[2], -position[0]) - sunLon
      if (cloudsRef.current) cloudsRef.current.rotation.y = meshRef.current.rotation.y + 0.02
    } else if (isTidallyLocked && meshRef.current) {
      // Moon always shows near side toward Earth
      const { objects, objectsUpdatedAt } = useStore.getState()
      const earth = objects.find(o => o.id === 'earth')
      if (earth) {
        const now = useStore.getState().simulatedTime ?? new Date()
        const ep = extrapolatePosition(earth, now, objectsUpdatedAt)
        const earthPos = positionToScene(ep.x, ep.y, ep.z)
        const dx = earthPos[0] - position[0]
        const dz = earthPos[2] - position[2]
        meshRef.current.rotation.y = Math.atan2(-dz, dx)
      }
    } else {
      const speed = BASE_ROTATION_RAD_S * (ROTATION_SPEED[object.id] ?? 1.0) * delta
      if (meshRef.current) meshRef.current.rotation.y += speed
      if (cloudsRef.current) cloudsRef.current.rotation.y += speed * 1.5
    }
  })

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    if (isSelected) {
      setSelectedObject(null)
    } else {
      setSelectedObject(object)
    }
  }

  const isMoon = object.type === 'moon'
  const isTidallyLocked = object.id === 'moon'

  return (
    <group position={position}>
     <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        {isEarth && mainTexture && nightTexture ? (
          <shaderMaterial
            vertexShader={earthVertexShader}
            fragmentShader={earthFragmentShader}
            uniforms={{
              uDayMap: { value: mainTexture },
              uNightMap: { value: nightTexture },
            }}
          />
        ) : hasTexture ? (
          <meshStandardMaterial
            map={mainTexture}
            roughness={isMoon ? 0.9 : 0.7}
            metalness={0.05}
          />
        ) : (
          <meshStandardMaterial
            color={color}
            roughness={isMoon ? 0.9 : 0.6}
            metalness={isMoon ? 0.1 : 0.2}
          />
        )}
      </mesh>

      {/* Earth cloud layer */}
      {isEarth && secondaryTexture && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[radius * 1.01, 64, 64]} />
          <meshStandardMaterial
            map={secondaryTexture}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Saturn ring */}
      {isSaturn && ringGeometry && secondaryTexture && (
        <mesh geometry={ringGeometry} rotation={[Math.PI / 2 + 0.47, 0, 0]}>
          <meshStandardMaterial
            map={secondaryTexture}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      )}

      {/* Atmospheric Fresnel glow */}
      {ATMOSPHERE[object.id] && (() => {
        const [color, intensity, exponent, scale] = ATMOSPHERE[object.id]
        return (
          <mesh>
            <sphereGeometry args={[radius * scale, 64, 64]} />
            <shaderMaterial
              vertexShader={atmosVertexShader}
              fragmentShader={atmosFragmentShader}
              uniforms={{
                uColor: { value: new THREE.Color(color) },
                uIntensity: { value: intensity },
                uExponent: { value: exponent },
              }}
              transparent
              blending={THREE.AdditiveBlending}
              side={THREE.FrontSide}
              depthWrite={false}
            />
          </mesh>
        )
      })()}

     </group>

      {/* Always-visible small label, larger when selected */}
      <Html
        position={[0, radius + 0.4, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          background: isSelected ? 'rgba(10, 15, 26, 0.8)' : 'rgba(10, 15, 26, 0.45)',
          backdropFilter: isSelected ? 'blur(12px)' : undefined,
          WebkitBackdropFilter: isSelected ? 'blur(12px)' : undefined,
          border: isSelected ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '6px',
          padding: isSelected ? '4px 12px' : '2px 8px',
          color: 'white',
          fontSize: isSelected ? '13px' : '10px',
          fontWeight: isSelected ? 600 : 400,
          opacity: hovered || isSelected ? 1 : 0.6,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          transition: 'all 0.15s ease',
        }}>
          {object.name}
        </div>
      </Html>
    </group>
  )
}

export default function CelestialBody({ object }: CelestialBodyProps) {
  if (object.id === 'sun') return null
  return <TexturedPlanet object={object} />
}
