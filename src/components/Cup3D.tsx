/**
 * 3D Cup Component using Three.js
 * Вращающийся 3D стакан
 */

import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface CupModelProps {
  url: string;
}

const CupModel: React.FC<CupModelProps> = ({ url }) => {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useLoader(GLTFLoader, url);

  // Автоматическое вращение
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.6;
    }
  });

  useEffect(() => {
    if (gltf.scene) {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(center);
      
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.4 / maxDim;
      gltf.scene.scale.setScalar(scale);
    }
  }, [gltf]);

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} />
    </group>
  );
};

// Фоллбэк при загрузке
const LoadingFallback: React.FC = () => (
  <mesh>
    <cylinderGeometry args={[0.3, 0.25, 0.8, 32]} />
    <meshStandardMaterial color="#D4AF37" opacity={0.5} transparent />
  </mesh>
);

interface Cup3DProps {
  className?: string;
}

export const Cup3D: React.FC<Cup3DProps> = ({ className = '' }) => {
  return (
    <div className={`${className}`} style={{ minWidth: 1, minHeight: 1, contain: 'strict' }}>
      <Canvas
        camera={{ position: [0, 0.2, 3.4], fov: 45 }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
        resize={{ scroll: false, debounce: { scroll: 100, resize: 100 } }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        <pointLight position={[0, 2, 0]} intensity={0.6} color="#D4AF37" />
        
        {/* Окружение для отражений */}
        <Environment preset="city" />
        
        {/* 3D модель */}
        <Suspense fallback={<LoadingFallback />}>
          <CupModel url="/images/3Dcup.glb" />
        </Suspense>
        
        {/* Управление камерой (опционально - можно крутить мышкой) */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          autoRotate={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};

export default Cup3D;
