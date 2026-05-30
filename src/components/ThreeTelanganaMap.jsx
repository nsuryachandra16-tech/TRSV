import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import mapData from '../assets/telangana.json';

// ─── Projection ────────────────────────────────────────────────────────────
const MIN_LNG = 77.2366, MAX_LNG = 81.3211;
const MIN_LAT = 15.8368, MAX_LAT = 19.9169;
const SCALE = 11;

function project(lng, lat) {
  return new THREE.Vector3(
    ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG) - 0.5) * SCALE,
    0,
    -((lat - MIN_LAT) / (MAX_LAT - MIN_LAT) - 0.5) * SCALE
  );
}

// Active GH district names in the GeoJSON
const GH_NAMES = ['hyderabad', 'medchal', 'rangareddy', 'ranga reddy'];
const isGH = (name = '') => GH_NAMES.some(n => name.toLowerCase().replace(/\s/g, '').includes(n.replace(/\s/g, '')));

// Simplified extrude settings — low bevel for performance
const EXTRUDE_LOCKED = { depth: 0.12, bevelEnabled: false };
const EXTRUDE_ACTIVE = { depth: 0.25, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.005, bevelThickness: 0.008 };

// Shared materials — created once, never recreated
const MAT_LOCKED = new THREE.MeshLambertMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.72 });
const MAT_LOCKED_HOVER = new THREE.MeshLambertMaterial({ color: 0x2d5a8e, transparent: true, opacity: 0.85 });
const MAT_GH = new THREE.MeshPhysicalMaterial({ color: 0x0ea5e9, emissive: 0x0369a1, emissiveIntensity: 0.18, roughness: 0.1, metalness: 0.2, clearcoat: 1, ior: 1.4, transmission: 0.35, transparent: true, opacity: 0.92 });
const MAT_GH_HOVER = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.4, roughness: 0.05, metalness: 0.3, clearcoat: 1, ior: 1.4, transmission: 0.25, transparent: true, opacity: 0.97 });
const MAT_GH_SEL = new THREE.MeshPhysicalMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.55, roughness: 0.05, metalness: 0.3, clearcoat: 1, ior: 1.4, transmission: 0.2, transparent: true, opacity: 1 });

// ─── Parse one GeoJSON feature into shape + border ──────────────────────────
function parseFeature(feature) {
  const geo = feature.geometry;
  let ring = [];
  if (geo.type === 'Polygon') ring = geo.coordinates[0];
  else if (geo.type === 'MultiPolygon') {
    geo.coordinates.forEach(p => { if (p[0].length > ring.length) ring = p[0]; });
  }
  // Simplify: take every Nth point to reduce vertex count
  const step = Math.max(1, Math.floor(ring.length / 80));
  const simplified = ring.filter((_, i) => i % step === 0);
  const pts = simplified.map(c => project(c[0], c[1]));

  const shape = new THREE.Shape();
  if (pts.length > 2) {
    shape.moveTo(pts[0].x, -pts[0].z);
    pts.slice(1).forEach(p => shape.lineTo(p.x, -p.z));
    shape.closePath();
  }

  // Center of district
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;

  return { shape, pts, cx, cz };
}

// ─── Lazy geometry cache — built once per feature ───────────────────────────
const geoCache = new Map();
function getGeom(id, shape, extrude) {
  const key = `${id}_${extrude.depth}`;
  if (!geoCache.has(key)) {
    geoCache.set(key, new THREE.ExtrudeGeometry(shape, extrude));
  }
  return geoCache.get(key);
}

// ─── Single District Mesh ───────────────────────────────────────────────────
function DistrictMesh({ feature, idx, onClickGH, mapLevel, selId }) {
  const meshRef = useRef();
  const hovered = useRef(false);
  const risen = useRef(false);
  const name = feature.properties?.name || '';
  const active = isGH(name);

  const { shape, pts, cx, cz } = useMemo(() => parseFeature(feature), [feature]);
  const geom = useMemo(() => getGeom(`${idx}_${active}`, shape, active ? EXTRUDE_ACTIVE : EXTRUDE_LOCKED), [idx, shape, active]);
  const isSelected = active && selId && name.toLowerCase().includes(selId.toLowerCase());

  // Rise up animation — runs only once
  useEffect(() => {
    if (!meshRef.current || risen.current) return;
    risen.current = true;
    meshRef.current.position.y = -3;
    gsap.to(meshRef.current.position, {
      y: 0, duration: 1.6, delay: idx * 0.04, ease: 'power3.out'
    });
  }, []); // eslint-disable-line

  const getMat = useCallback(() => {
    if (!active) return hovered.current ? MAT_LOCKED_HOVER : MAT_LOCKED;
    if (isSelected) return MAT_GH_SEL;
    return hovered.current ? MAT_GH_HOVER : MAT_GH;
  }, [active, isSelected]);

  // Border line points on XZ plane
  const borderPts = useMemo(() => pts, [pts]);

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={geom}
        material={getMat()}
        onPointerOver={e => { e.stopPropagation(); hovered.current = true; document.body.style.cursor = active ? 'pointer' : 'default'; if (meshRef.current) meshRef.current.material = getMat(); }}
        onPointerOut={() => { hovered.current = false; document.body.style.cursor = 'default'; if (meshRef.current) meshRef.current.material = getMat(); }}
        onClick={e => { e.stopPropagation(); if (active && mapLevel === 'state') onClickGH(name); }}
      />
      {borderPts.length > 2 && (
        <Line
          position={[0, active ? 0.26 : 0.13, 0]}
          points={borderPts}
          color={active ? '#38bdf8' : '#334155'}
          lineWidth={active ? 2.5 : 0.9}
          transparent
          opacity={active ? 0.9 : 0.4}
        />
      )}
      {active && hovered.current && (
        <Html position={[cx, 0.4, cz]} center distanceFactor={12} className="pointer-events-none select-none">
          <div style={{ background: 'rgba(8,8,16,0.93)', backdropFilter: 'blur(8px)', border: '1px solid rgba(56,189,248,0.65)', color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {name} — Click to zoom
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Camera Controller ──────────────────────────────────────────────────────
function CameraCtrl({ mapLevel }) {
  const { camera, size } = useThree();
  const mobile = size.width < 768;
  const prevLevel = useRef(null);

  useEffect(() => {
    if (prevLevel.current === mapLevel) return;
    prevLevel.current = mapLevel;

    if (mapLevel === 'state') {
      gsap.to(camera.position, { x: 0, y: mobile ? 13 : 9, z: mobile ? 14 : 10, duration: 1.8, ease: 'power2.inOut', onUpdate: () => camera.lookAt(0, 0, 0) });
    } else {
      // Zoom into GH cluster (slightly south of center)
      gsap.to(camera.position, { x: -0.5, y: mobile ? 5 : 3.5, z: mobile ? 5.5 : 4, duration: 1.8, ease: 'power3.inOut', onUpdate: () => camera.lookAt(-0.3, 0, -0.3) });
    }
  }, [mapLevel, camera, mobile]);

  // Initial position
  useEffect(() => {
    camera.position.set(0, mobile ? 13 : 9, mobile ? 14 : 10);
    camera.lookAt(0, 0, 0);
  }, []); // eslint-disable-line

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Very gentle drift — low cost
    if (mapLevel === 'state') {
      camera.position.x = Math.sin(t * 0.18) * 0.4;
    }
  });

  return null;
}

// ─── Scan Beam — simple, cheap ──────────────────────────────────────────────
function ScanBeam({ x }) {
  return (
    <group position={[x, 0.15, 0]}>
      <Line points={[new THREE.Vector3(0, 0, -6.5), new THREE.Vector3(0, 0, 6.5)]} color="#ffffff" lineWidth={2.5} transparent opacity={0.75} />
      <Line points={[new THREE.Vector3(0, 0, -6.5), new THREE.Vector3(0, 0, 6.5)]} color="#f59e0b" lineWidth={7} transparent opacity={0.25} />
    </group>
  );
}

// ─── Scene Contents — stable, never remounts ────────────────────────────────
function SceneContents({ mapLevelRef, onClickGHRef, selIdRef, featuresRef }) {
  const scanX = useRef(-10);
  const showScan = useRef(false);
  const scanned = useRef(false);

  // Run scan once after mount
  useEffect(() => {
    if (scanned.current) return;
    scanned.current = true;
    const t = setTimeout(() => {
      showScan.current = true;
      gsap.to(scanX, { current: 6.5, duration: 2.4, ease: 'power1.inOut', onComplete: () => { showScan.current = false; } });
    }, 2800);
    return () => clearTimeout(t);
  }, []);

  // Force re-render tick via useFrame — minimal cost
  useFrame(() => {});

  const mapLevel = mapLevelRef.current;

  return (
    <>
      <ambientLight intensity={2.2} />
      <directionalLight position={[6, 10, 6]} intensity={2.5} color="#ffffff" />
      <directionalLight position={[-4, 5, -4]} intensity={1.0} color="#dfcba5" />
      <pointLight position={[0, 4, 0]} intensity={3} distance={20} color="#0ea5e9" />

      <group position={[0, -0.3, 0]}>
        {featuresRef.current.map((feat, i) => (
          <DistrictMesh
            key={i}
            feature={feat}
            idx={i}
            onClickGH={onClickGHRef.current}
            mapLevel={mapLevel}
            selId={selIdRef.current}
          />
        ))}
        {showScan.current && <ScanBeam x={scanX.current} />}
      </group>

      <CameraCtrl mapLevel={mapLevel} />
    </>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function ThreeTelanganaMap({
  mapLevel, setMapLevel, selectedConstituency, setSelectedConstituency, constituencyList, onHoverRegion
}) {
  // Use refs so SceneContents never remounts when props change
  const mapLevelRef = useRef(mapLevel);
  const selIdRef = useRef(selectedConstituency?.constituency_name || '');
  const featuresRef = useRef(mapData.features);

  // Keep refs in sync without triggering Canvas remount
  useEffect(() => { mapLevelRef.current = mapLevel; }, [mapLevel]);
  useEffect(() => { selIdRef.current = selectedConstituency?.constituency_name || ''; }, [selectedConstituency]);

  const onClickGHRef = useRef((name) => {
    setMapLevel('gh');
    onHoverRegion(null);
  });
  useEffect(() => {
    onClickGHRef.current = (name) => { setMapLevel('gh'); onHoverRegion(null); };
  }, [setMapLevel, onHoverRegion]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Back button overlay */}
      {mapLevel === 'gh' && (
        <button
          onClick={() => setMapLevel('state')}
          style={{ position: 'absolute', top: 10, left: 12, zIndex: 10, background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8', padding: '4px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(6px)' }}
        >
          ← State Map
        </button>
      )}

      <Canvas
        shadows={false}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 45, near: 0.1, far: 100 }}
        style={{ width: '100%', height: '100%' }}
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={[null]} />
        {/* SceneContents only ever mounts once — uses refs for live state */}
        <SceneContents
          mapLevelRef={mapLevelRef}
          onClickGHRef={onClickGHRef}
          selIdRef={selIdRef}
          featuresRef={featuresRef}
        />
      </Canvas>

      {mapLevel === 'state' && (
        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', color: 'rgba(56,189,248,0.6)', fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', pointerEvents: 'none', fontFamily: 'monospace' }}>
          Hover districts · Click Hyderabad to zoom
        </div>
      )}
    </div>
  );
}
