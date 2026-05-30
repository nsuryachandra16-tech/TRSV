import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import mapData from '../assets/telangana.json';

// Real Telangana geographic bounds
const MIN_LNG = 77.2366;
const MAX_LNG = 81.3211;
const MIN_LAT = 15.8368;
const MAX_LAT = 19.9169;
const MAP_SCALE = 12;

const projectCoord = (lng, lat) => {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG) - 0.5) * MAP_SCALE;
  const z = -((lat - MIN_LAT) / (MAX_LAT - MIN_LAT) - 0.5) * MAP_SCALE;
  return new THREE.Vector3(x, 0, z);
};

const generateNodes = (coords, count = 7) => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  coords.forEach(pt => {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.z < minZ) minZ = pt.z;
    if (pt.z > maxZ) maxZ = pt.z;
  });
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const nodes = [{ x: cx, z: cz, isCenter: true }];
  for (let i = 0; i < count - 1; i++) {
    const angle = (i / (count - 1)) * Math.PI * 2 + Math.random() * 0.5;
    nodes.push({
      x: cx + Math.cos(angle) * (maxX - minX) * (0.2 + Math.random() * 0.22),
      z: cz + Math.sin(angle) * (maxZ - minZ) * (0.2 + Math.random() * 0.22),
      isCenter: false
    });
  }
  return nodes;
};

// Hyderabad district name variants in GeoJSON
const HYDERABAD_NAMES = ['hyderabad', 'medchal', 'ranga reddy', 'rangareddy'];
const isGHDistrict = (name = '') => HYDERABAD_NAMES.some(n => name.toLowerCase().includes(n));

// Camera controller with GSAP cinematic movements
function CameraController({ phase }) {
  const { camera, size } = useThree();
  const isMobile = size.width < 768;
  const animated = useRef(false);

  useEffect(() => {
    camera.position.set(0, isMobile ? 16 : 11, isMobile ? 18 : 13);
    camera.lookAt(0, 0, 0);
  }, [camera, isMobile]);

  useEffect(() => {
    if (phase === 'reveal') {
      gsap.to(camera.position, { x: 0, y: isMobile ? 12.5 : 8.5, z: isMobile ? 13.5 : 9.5, duration: 3, ease: 'power2.out' });
    }
    if (phase === 'zoom' && !animated.current) {
      animated.current = true;
      const tl = gsap.timeline();
      tl.to(camera.position, { x: -0.8, y: isMobile ? 2.2 : 1.5, z: isMobile ? 3.2 : 2.2, duration: 2.2, ease: 'power3.inOut', onUpdate: () => camera.lookAt(-0.5, 0, -0.5) });
      tl.to(camera.position, { x: 0.8, y: isMobile ? 2.5 : 1.8, z: isMobile ? 3 : 2, duration: 1.5, ease: 'power1.inOut', onUpdate: () => camera.lookAt(0, 0, -0.2) });
      tl.to(camera.position, { x: 0, y: isMobile ? 9.8 : 6.8, z: isMobile ? 10.8 : 7.8, duration: 2.8, ease: 'expo.out', onUpdate: () => camera.lookAt(0, -0.5, -0.2) });
    }
  }, [phase, camera, isMobile]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const fz = isMobile ? 10.8 : 7.8;
    if (phase === 'idle') {
      camera.position.x += Math.sin(t * 0.4) * 0.0012;
      camera.position.z += Math.cos(t * 0.3) * 0.0012;
    } else if (phase === 'float') {
      camera.position.x = Math.sin(t * 0.15) * 1.0;
      camera.position.z = fz + Math.cos(t * 0.15) * 0.3;
      camera.lookAt(0, -0.5, -0.2);
    }
  });

  return null;
}

// Scan beam
function ScanBeam({ x }) {
  return (
    <group position={[x, 0.16, 0]}>
      <Line points={[new THREE.Vector3(0, 0, -6), new THREE.Vector3(0, 0, 6)]} color="#ffffff" lineWidth={3.5} transparent opacity={0.8} />
      <Line points={[new THREE.Vector3(0, 0, -6), new THREE.Vector3(0, 0, 6)]} color="#dfcba5" lineWidth={8} transparent opacity={0.3} />
    </group>
  );
}

// Individual district block
function District({ feature, index, phase, scanX, showScan, onClickGH, mapLevel }) {
  const meshRef = useRef();
  const [drawn, setDrawn] = useState(0);
  const [nodeScale, setNodeScale] = useState(0);
  const [hovered, setHovered] = useState(false);

  const { shape, borderPoints, districtName } = useMemo(() => {
    const geo = feature.geometry;
    let poly = [];
    if (geo.type === 'Polygon') poly = geo.coordinates[0];
    else if (geo.type === 'MultiPolygon') {
      geo.coordinates.forEach(p => { if (p[0].length > poly.length) poly = p[0]; });
    }
    const projected = poly.map(pt => projectCoord(pt[0], pt[1]));
    const s = new THREE.Shape();
    if (projected.length > 0) {
      s.moveTo(projected[0].x, -projected[0].z);
      projected.slice(1).forEach(pt => s.lineTo(pt.x, -pt.z));
      s.closePath();
    }
    return { shape: s, borderPoints: projected, districtName: feature.properties?.name || '' };
  }, [feature]);

  const nodes = useMemo(() => borderPoints.length ? generateNodes(borderPoints, 7) : [], [borderPoints]);

  const activeBorder = useMemo(() => {
    if (drawn >= 0.99) return borderPoints;
    return borderPoints.slice(0, Math.max(2, Math.floor(borderPoints.length * drawn)));
  }, [borderPoints, drawn]);

  const isGH = isGHDistrict(districtName);

  useEffect(() => {
    if (phase === 'reveal' || phase === 'scan' || phase === 'zoom' || phase === 'float') {
      const delay = 0.5 + index * 0.16;
      gsap.to({ v: 0 }, { v: 1, duration: 1.8, delay, ease: 'power2.inOut', onUpdate: function () { setDrawn(this.targets()[0].v); } });
      if (meshRef.current) {
        gsap.to(meshRef.current.position, { y: 0, duration: 2.2, delay: delay + 0.6, ease: 'power3.out' });
        gsap.to(meshRef.current.scale, { x: 1, y: 1, z: 1, duration: 2.2, delay: delay + 0.6, ease: 'power3.out' });
      }
      gsap.to({ v: 0 }, { v: 1, duration: 1.2, delay: delay + 1.2, ease: 'elastic.out(1, 0.6)', onUpdate: function () { setNodeScale(this.targets()[0].v); } });
    }
  }, [phase, index]);

  useFrame(() => {
    if (!meshRef.current) return;
    const dist = Math.abs((borderPoints[0]?.x || 0) - scanX);
    if (showScan && dist < 1.8) {
      meshRef.current.material.emissiveIntensity = (1 - dist / 1.8) * 0.65;
      meshRef.current.material.color.setHex(0xfff8e7);
    } else if (hovered) {
      meshRef.current.material.emissiveIntensity = isGH ? 0.6 : 0.45;
      meshRef.current.material.color.setHex(isGH ? 0xaef3ff : 0xfff8e7);
    } else {
      meshRef.current.material.emissiveIntensity = isGH ? 0.12 : 0.05;
      meshRef.current.material.color.setHex(isGH ? 0x7dd3fc : 0xdfcba5);
    }
  });

  const extrudeSettings = useMemo(() => ({
    depth: isGH ? 0.28 : 0.15,
    bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: -0.008, bevelThickness: 0.01
  }), [isGH]);

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[0, -2.5, 0]}
        scale={[1, 1, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow receiveShadow
        onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={e => { e.stopPropagation(); if (isGH && mapLevel === 'state') onClickGH(); }}
      >
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshPhysicalMaterial
          color={isGH ? '#7dd3fc' : '#dfcba5'}
          emissive={isGH ? '#0ea5e9' : '#c5a059'}
          emissiveIntensity={isGH ? 0.12 : 0.05}
          transmission={isGH ? 0.5 : 0.65}
          opacity={isGH ? 0.92 : 0.8}
          transparent
          roughness={isGH ? 0.08 : 0.12}
          metalness={isGH ? 0.2 : 0.15}
          clearcoat={1.0}
          clearcoatRoughness={0.08}
          ior={1.48}
          thickness={isGH ? 0.6 : 0.4}
        />
      </mesh>

      {activeBorder.length > 1 && (
        <Line
          position={[0, 0.16, 0]}
          points={activeBorder}
          color={isGH ? '#38bdf8' : '#c5a059'}
          lineWidth={isGH ? 3 : 2.2}
          transparent opacity={0.9}
        />
      )}

      {nodeScale > 0.01 && (
        <group>
          {nodes.map((nd, i) => (
            <group key={i} position={[nd.x, 0.17, nd.z]} scale={[nodeScale, nodeScale, nodeScale]}>
              <mesh><sphereGeometry args={[nd.isCenter ? 0.07 : 0.045, 16, 16]} /><meshBasicMaterial color={nd.isCenter ? (isGH ? '#38bdf8' : '#ffffff') : '#dfcba5'} /></mesh>
              <mesh><sphereGeometry args={[nd.isCenter ? 0.12 : 0.08, 16, 16]} /><meshBasicMaterial color={isGH ? '#0ea5e9' : '#c5a059'} transparent opacity={0.35} /></mesh>
            </group>
          ))}
          {nodes.slice(1).map((nd, i) => (
            <Line key={`w${i}`} position={[0, 0.16, 0]}
              points={[new THREE.Vector3(nodes[0].x, 0, nodes[0].z), new THREE.Vector3(nd.x, 0, nd.z)]}
              color={isGH ? '#38bdf8' : '#dfcba5'} lineWidth={0.6} transparent opacity={0.25 * nodeScale}
            />
          ))}
        </group>
      )}

      {hovered && nodeScale > 0.5 && (
        <Html position={[nodes[0]?.x || 0, 0.3, nodes[0]?.z || 0]} center distanceFactor={11} className="pointer-events-none select-none">
          <div style={{ backgroundColor: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)', border: `1px solid ${isGH ? 'rgba(56,189,248,0.7)' : 'rgba(197,160,89,0.6)'}`, color: '#fff', padding: '4px 12px', borderRadius: '6px', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
            {districtName}{isGH && mapLevel === 'state' ? ' ★ CLICK TO ZOOM' : ''}
          </div>
        </Html>
      )}
    </group>
  );
}

// GH constituency sub-view using filtered features
function GHConstituencyView({ constituencyList, selectedConstituency, onSelectConstituency }) {
  // We reuse the same district blocks but zoomed in on GH area features only
  const ghFeatures = useMemo(() => {
    return mapData.features.filter(f => isGHDistrict(f.properties?.name || ''));
  }, []);

  return (
    <group>
      {ghFeatures.map((feat, i) => {
        const name = feat.properties?.name || '';
        const matched = constituencyList.find(c => c.constituency_name?.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.constituency_name?.toLowerCase()));
        const isSelected = matched && selectedConstituency?.id === matched?.id;
        return (
          <GHBlock
            key={i}
            feature={feat}
            index={i}
            isSelected={isSelected}
            name={name}
            onSelect={() => { if (matched) { onSelectConstituency(matched); document.getElementById(`constituency-card-${matched.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }}
          />
        );
      })}
    </group>
  );
}

function GHBlock({ feature, index, isSelected, name, onSelect }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [risen, setRisen] = useState(false);

  const { shape, borderPoints } = useMemo(() => {
    const geo = feature.geometry;
    let poly = [];
    if (geo.type === 'Polygon') poly = geo.coordinates[0];
    else if (geo.type === 'MultiPolygon') { geo.coordinates.forEach(p => { if (p[0].length > poly.length) poly = p[0]; }); }
    const projected = poly.map(pt => projectCoord(pt[0], pt[1]));
    const s = new THREE.Shape();
    if (projected.length > 0) {
      s.moveTo(projected[0].x, -projected[0].z);
      projected.slice(1).forEach(pt => s.lineTo(pt.x, -pt.z));
      s.closePath();
    }
    return { shape: s, borderPoints: projected };
  }, [feature]);

  const nodes = useMemo(() => borderPoints.length ? generateNodes(borderPoints, 5) : [], [borderPoints]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.y = -2.5;
      gsap.to(meshRef.current.position, { y: 0, duration: 1.8, delay: index * 0.12, ease: 'power3.out', onComplete: () => setRisen(true) });
    }
  }, [index]);

  useFrame(() => {
    if (!meshRef.current) return;
    if (isSelected) { meshRef.current.material.emissiveIntensity = 0.5; meshRef.current.material.color.setHex(0x22d3ee); }
    else if (hovered) { meshRef.current.material.emissiveIntensity = 0.35; meshRef.current.material.color.setHex(0x7dd3fc); }
    else { meshRef.current.material.emissiveIntensity = 0.08; meshRef.current.material.color.setHex(0x0f766e); }
  });

  return (
    <group>
      <mesh ref={meshRef} position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow
        onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={e => { e.stopPropagation(); onSelect(); }}
      >
        <extrudeGeometry args={[shape, { depth: 0.22, bevelEnabled: true, bevelSegments: 3, bevelSize: -0.006, bevelThickness: 0.01 }]} />
        <meshPhysicalMaterial color="#0f766e" emissive="#0ea5e9" emissiveIntensity={0.08} transmission={0.45} opacity={0.9} transparent roughness={0.1} metalness={0.2} clearcoat={1} ior={1.48} thickness={0.5} />
      </mesh>
      {borderPoints.length > 1 && risen && (
        <Line position={[0, 0.17, 0]} points={borderPoints} color={isSelected ? '#38bdf8' : '#0ea5e9'} lineWidth={isSelected ? 3 : 1.8} transparent opacity={0.9} />
      )}
      {hovered && nodes[0] && (
        <Html position={[nodes[0].x, 0.3, nodes[0].z]} center distanceFactor={11} className="pointer-events-none select-none">
          <div style={{ backgroundColor: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(56,189,248,0.7)', color: '#fff', padding: '4px 12px', borderRadius: '6px', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// Main export
export default function ThreeTelanganaMap({ mapLevel, setMapLevel, selectedConstituency, setSelectedConstituency, constituencyList, onHoverRegion }) {
  const [phase, setPhase] = useState('idle');
  const [scanX, setScanX] = useState(-10);
  const [showScan, setShowScan] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 400);
    const t2 = setTimeout(() => setPhase('scan'), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase === 'scan') {
      setShowScan(true);
      gsap.to({ x: -6.5 }, {
        x: 6.5, duration: 2.2, ease: 'power1.inOut',
        onUpdate: function () { setScanX(this.targets()[0].x); },
        onComplete: () => { setShowScan(false); setPhase('zoom'); setTimeout(() => setPhase('float'), 6500); }
      });
    }
  }, [phase]);

  const handleClickGH = () => {
    setMapLevel('gh');
    onHoverRegion(null);
  };

  return (
    <div className="w-full h-full min-h-[420px] relative">
      <Canvas shadows gl={{ antialias: true, alpha: true }} camera={{ fov: 45, near: 0.1, far: 100 }}>
        <color attach="background" args={[null]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 8, 5]} intensity={3.5} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
        <directionalLight position={[-5, 4, -5]} intensity={1.2} color="#dfcba5" />
        <spotLight position={[0, 10, 2]} intensity={6} angle={Math.PI / 4} penumbra={0.6} color="#ffffff" castShadow />
        <pointLight position={[scanX, 1.2, 0]} intensity={showScan ? 35 : 0} distance={4} color="#ffffff" />

        {mapLevel === 'state' && (
          <group position={[0, -0.4, 0]}>
            {mapData.features.map((feat, i) => (
              <District key={i} feature={feat} index={i} phase={phase} scanX={scanX} showScan={showScan} onClickGH={handleClickGH} mapLevel={mapLevel} />
            ))}
            {showScan && <ScanBeam x={scanX} />}
          </group>
        )}

        {mapLevel === 'gh' && (
          <group position={[0, -0.4, 0]}>
            <GHConstituencyView
              constituencyList={constituencyList}
              selectedConstituency={selectedConstituency}
              onSelectConstituency={setSelectedConstituency}
            />
          </group>
        )}

        <CameraController phase={phase} />
        {mapLevel === 'gh' && <OrbitControls enablePan={false} minDistance={3} maxDistance={18} />}
      </Canvas>

      {mapLevel === 'state' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest text-amber-400/70 pointer-events-none">
          Click Greater Hyderabad to zoom in
        </div>
      )}
    </div>
  );
}
