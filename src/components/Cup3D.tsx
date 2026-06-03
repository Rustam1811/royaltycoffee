/**
 * 3D Cup / Thermos — spin-then-pause animation
 * Quick 360° spin → 1.5 s pause → repeat
 */

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import * as THREE from 'three';

const GLB_URL = `${import.meta.env.BASE_URL}images/3Dcup_tiny.glb`.replace('//', '/');

/* ── Preload GLB as soon as this module loads, before Canvas even mounts ── */
useLoader.preload(GLTFLoader, GLB_URL, (loader: GLTFLoader) => {
  loader.setMeshoptDecoder(MeshoptDecoder);
});

/* ── Spin-pause constants ── */
const SPIN_DURATION = 0.9;   // seconds for one full 360°
const PAUSE_DURATION = 1.5;  // seconds idle after spin
const CYCLE = SPIN_DURATION + PAUSE_DURATION;

/**
 * Front-face angle — the Y-rotation at which the thermos label faces the camera.
 * GLB models often have the label at 90° or 270° from default orientation.
 */
const FRONT_ANGLE = Math.PI * 1.5;  // 270° — opposite side (label face)

/** Smooth ease-in-out */
const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

interface CupModelProps { url: string; }

const CupModel: React.FC<CupModelProps> = ({ url }) => {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });
  const elapsed = useRef(0);

  // Clone the scene on every mount so cached GLTF doesn't carry stale transforms
  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    clone.scale.setScalar(1.8 / maxDim);
    return clone;
  }, [gltf]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    elapsed.current += delta;
    const t = elapsed.current % CYCLE;
    if (t <= SPIN_DURATION) {
      groupRef.current.rotation.y = FRONT_ANGLE + easeInOut(t / SPIN_DURATION) * Math.PI * 2;
    } else {
      groupRef.current.rotation.y = FRONT_ANGLE;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
};

const LoadingFallback: React.FC = () => (
  <mesh>
    <cylinderGeometry args={[0.3, 0.25, 0.8, 32]} />
    <meshStandardMaterial color="#D4AF37" opacity={0.5} transparent />
  </mesh>
);

interface Cup3DProps { className?: string; }

// Детектор поддержки WebGL — на старых WebView (Huawei/Xiaomi/Poco)
// инициализация Three.js может крашить процесс целиком. Проверяем заранее.
let _webglSupported: boolean | null = null;
const isWebGLSupported = (): boolean => {
  if (_webglSupported !== null) return _webglSupported;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    _webglSupported = !!gl;
  } catch {
    _webglSupported = false;
  }
  return _webglSupported;
};

const StaticThermosFallback: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={className}
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #FFF7E0 0%, #F4EDE4 100%)',
    }}
  >
    <span style={{ fontSize: '2.2em', filter: 'drop-shadow(0 2px 4px rgba(212,175,55,0.4))' }}>☕</span>
  </div>
);

export const Cup3D: React.FC<Cup3DProps> = ({ className = '' }) => {
  if (!isWebGLSupported()) {
    return <StaticThermosFallback className={className} />;
  }
  return (
    <div className={className} style={{ minWidth: 1, minHeight: 1 }}>
      <Canvas
        camera={{ position: [0, 0.3, 3.2], fov: 42 }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
        resize={{ scroll: true, debounce: { scroll: 50, resize: 0 } }}
        onCreated={({ gl }) => {
          // Гарантированно освобождаем контекст при размонтировании
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('[Cup3D] WebGL context lost');
          });
        }}
      >
        <ambientLight intensity={0.8} />
        <hemisphereLight args={['#ffffff', '#D4AF37', 0.6]} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-3, -3, -3]} intensity={0.25} />
        <pointLight position={[0, 2, 0]} intensity={0.5} color="#D4AF37" />
        <Suspense fallback={<LoadingFallback />}>
          <CupModel url={GLB_URL} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Cup3D;
