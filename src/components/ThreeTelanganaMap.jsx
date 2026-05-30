import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import mapData from '../assets/telangana.json';

// ─── Projection Settings ───────────────────────────────────────────────────
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

// Extrude settings
const EXTRUDE_LOCKED = { depth: 0.12, bevelEnabled: false };
const EXTRUDE_ACTIVE = { depth: 0.25, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.005, bevelThickness: 0.008 };

// ─── Curated Green & Yellow Mixed "Beast" Materials ─────────────────────────
const MAT_LOCKED = new THREE.MeshLambertMaterial({ color: 0x111c14, transparent: true, opacity: 0.82 });
const MAT_LOCKED_HOVER = new THREE.MeshLambertMaterial({ color: 0x1d3224, transparent: true, opacity: 0.9 });
const MAT_GH = new THREE.MeshPhysicalMaterial({
  color: 0x059669,            // Emerald Green
  emissive: 0xd97706,         // Warm Gold-Yellow Glow
  emissiveIntensity: 0.28,
  roughness: 0.1,
  metalness: 0.25,
  clearcoat: 1.0,
  ior: 1.45,
  transmission: 0.4,
  transparent: true,
  opacity: 0.92
});
const MAT_GH_HOVER = new THREE.MeshPhysicalMaterial({
  color: 0x10b981,            // Bright Emerald Green
  emissive: 0xf59e0b,         // Yellow Glow
  emissiveIntensity: 0.48,
  roughness: 0.05,
  metalness: 0.3,
  clearcoat: 1.0,
  ior: 1.45,
  transmission: 0.3,
  transparent: true,
  opacity: 0.96
});
const MAT_GH_SEL = new THREE.MeshPhysicalMaterial({
  color: 0xeab308,            // Golden Yellow
  emissive: 0xca8a04,         // Gold Glow
  emissiveIntensity: 0.6,
  roughness: 0.05,
  metalness: 0.35,
  clearcoat: 1.0,
  ior: 1.5,
  transmission: 0.2,
  transparent: true,
  opacity: 1.0
});

// Parse one GeoJSON feature
function parseFeature(feature) {
  const geo = feature.geometry;
  let ring = [];
  if (geo.type === 'Polygon') ring = geo.coordinates[0];
  else if (geo.type === 'MultiPolygon') {
    geo.coordinates.forEach(p => { if (p[0].length > ring.length) ring = p[0]; });
  }
  const step = Math.max(1, Math.floor(ring.length / 80));
  const simplified = ring.filter((_, i) => i % step === 0);
  const pts = simplified.map(c => project(c[0], c[1]));

  const shape = new THREE.Shape();
  if (pts.length > 2) {
    shape.moveTo(pts[0].x, -pts[0].z);
    pts.slice(1).forEach(p => shape.lineTo(p.x, -p.z));
    shape.closePath();
  }
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
  return { shape, pts, cx, cz };
}

const geoCache = new Map();
function getGeom(id, shape, extrude) {
  const key = `${id}_${extrude.depth}`;
  if (!geoCache.has(key)) {
    geoCache.set(key, new THREE.ExtrudeGeometry(shape, extrude));
  }
  return geoCache.get(key);
}

// ─── Single District Mesh Component ──────────────────────────────────────────
function DistrictMesh({ feature, idx, onClickGH, mapLevel, selectedConstituency }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const name = feature.properties?.name || '';
  const active = isGH(name);

  // Hide all non-GH districts when zoomed in to GH for a clean focused look
  if (mapLevel === 'gh' && !active) return null;

  const { shape, pts, cx, cz } = useMemo(() => parseFeature(feature), [feature]);
  const geom = useMemo(() => getGeom(`${idx}_${active}`, shape, active ? EXTRUDE_ACTIVE : EXTRUDE_LOCKED), [idx, shape, active]);
  
  const isSelected = useMemo(() => {
    if (!active || !selectedConstituency) return false;
    const d = (selectedConstituency.district || '').toLowerCase();
    return d.includes(name.toLowerCase());
  }, [active, selectedConstituency, name]);

  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.position.y = -3;
    gsap.to(meshRef.current.position, {
      y: 0, duration: 1.2, delay: idx * 0.03, ease: 'power3.out'
    });
  }, []); // eslint-disable-line

  const currentMat = useMemo(() => {
    if (mapLevel === 'gh') {
      if (isSelected) return MAT_GH_SEL;
      return hovered ? MAT_GH_HOVER : MAT_GH;
    }
    if (!active) return hovered ? MAT_LOCKED_HOVER : MAT_LOCKED;
    if (isSelected) return MAT_GH_SEL;
    return hovered ? MAT_GH_HOVER : MAT_GH;
  }, [active, isSelected, mapLevel, hovered]);

  const isHyd = name.toLowerCase().includes('hyderabad');
  const borderColor = isHyd ? '#eab308' : '#10b981';

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={geom}
        material={currentMat}
        onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = active ? 'pointer' : 'default'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        onClick={e => { e.stopPropagation(); if (active && mapLevel === 'state') onClickGH(name); }}
      />
      {pts.length > 2 && (
        <Line
          position={[0, active ? 0.26 : 0.13, 0]}
          points={pts}
          color={active ? borderColor : '#1e3527'}
          lineWidth={active ? 2.5 : 0.8}
          transparent
          opacity={active ? 0.95 : 0.35}
        />
      )}
      {active && hovered && mapLevel === 'state' && (
        <Html position={[cx, 0.4, cz]} center distanceFactor={12} className="pointer-events-none select-none">
          <div style={{
            background: 'rgba(8,16,12,0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #eab308',
            boxShadow: '0 0 10px rgba(234,179,8,0.4)',
            color: '#fff',
            padding: '3px 10px',
            borderRadius: 6,
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            fontWeight: 850,
            whiteSpace: 'nowrap'
          }}>
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
      gsap.to(camera.position, { x: -0.5, y: mobile ? 5 : 3.5, z: mobile ? 5.5 : 4, duration: 1.8, ease: 'power3.inOut', onUpdate: () => camera.lookAt(-0.3, 0, -0.3) });
    }
  }, [mapLevel, camera, mobile]);

  useEffect(() => {
    camera.position.set(0, mobile ? 13 : 9, mobile ? 14 : 10);
    camera.lookAt(0, 0, 0);
  }, []); // eslint-disable-line

  return null;
}

const getDistrictCenter = (districtName, features) => {
  const nameLower = districtName.toLowerCase();
  let targetName = '';
  if (nameLower.includes('hyderabad')) targetName = 'hyderabad';
  else if (nameLower.includes('medchal')) targetName = 'medchal';
  else if (nameLower.includes('rangareddy') || nameLower.includes('ranga reddy')) targetName = 'rangareddy';
  
  if (!targetName) return null;
  const feat = features.find(f => (f.properties?.name || '').toLowerCase().includes(targetName));
  if (!feat) return null;
  
  return parseFeature(feat);
};

// ─── Constituency Node Component ─────────────────────────────────────────────
function ConstituencyNode({ node, onClick, isSelected }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <group>
      <Line
        points={[new THREE.Vector3(node.cx, 0.13, node.cz), new THREE.Vector3(node.x, 0.13, node.z)]}
        color={isSelected ? '#eab308' : '#10b981'}
        lineWidth={isSelected ? 1.8 : 0.8}
        transparent
        opacity={isSelected ? 0.9 : 0.3}
      />
      <mesh position={[node.x, 0.13, node.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.06, 16]} />
        <meshBasicMaterial color={isSelected ? '#eab308' : (hovered ? '#10b981' : '#059669')} transparent opacity={hovered ? 0.95 : 0.6} />
      </mesh>
      <mesh
        position={[node.x, 0.22, node.z]}
        onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        onClick={e => { e.stopPropagation(); onClick(node.raw); }}
      >
        <cylinderGeometry args={[0.025, 0.025, 0.18, 8]} />
        <meshBasicMaterial color={isSelected ? '#eab308' : (hovered ? '#ffffff' : '#10b981')} />
      </mesh>
      {hovered && (
        <mesh position={[node.x, 0.22, node.z]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#eab308" transparent opacity={0.25} />
        </mesh>
      )}
      {hovered && (
        <Html position={[node.x, 0.45, node.z]} center distanceFactor={10} className="pointer-events-none select-none z-55">
          <div style={{
            background: 'rgba(8,16,12,0.96)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #eab308',
            boxShadow: '0 0 10px rgba(234,179,8,0.5)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            fontWeight: 900,
            whiteSpace: 'nowrap'
          }}>
            {node.constituency_name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Scene Contents ──────────────────────────────────────────────────────────
function SceneContents({ mapLevel, onClickGH, selectedConstituency, setSelectedConstituency, constituencyList, features }) {
  const ghConstituencies = useMemo(() => {
    return (constituencyList || []).filter(c => {
      const d = (c.district || '').toLowerCase();
      return d.includes('hyderabad') || d.includes('medchal') || d.includes('rangareddy') || d.includes('ranga reddy');
    });
  }, [constituencyList]);

  const constituencyNodes = useMemo(() => {
    if (mapLevel !== 'gh') return [];
    const hydList = [], medchalList = [], rrList = [];
    ghConstituencies.forEach(c => {
      const d = (c.district || '').toLowerCase();
      if (d.includes('hyderabad')) hydList.push(c);
      else if (d.includes('medchal')) medchalList.push(c);
      else if (d.includes('rangareddy') || d.includes('ranga reddy')) rrList.push(c);
    });

    const nodes = [];
    const processGroup = (groupList, r) => {
      if (groupList.length === 0) return;
      const center = getDistrictCenter(groupList[0].district, features);
      if (!center) return;
      const { cx, cz } = center;
      const n = groupList.length;
      groupList.forEach((c, idx) => {
        const angle = (idx / n) * 2 * Math.PI;
        const x = cx + r * Math.cos(angle);
        const z = cz + r * Math.sin(angle);
        nodes.push({
          id: c.id,
          constituency_name: c.constituency_name,
          district: c.district,
          raw: c,
          x,
          z,
          cx,
          cz
        });
      });
    };

    processGroup(hydList, 0.45);
    processGroup(medchalList, 0.75);
    processGroup(rrList, 1.25);
    return nodes;
  }, [ghConstituencies, mapLevel, features]);

  // Generate sector boundary division lines and concentric zones inside Greater Hyderabad
  const ghGrids = useMemo(() => {
    if (mapLevel !== 'gh') return { partitions: [], rings: [] };

    const hydList = [], medchalList = [], rrList = [];
    ghConstituencies.forEach(c => {
      const d = (c.district || '').toLowerCase();
      if (d.includes('hyderabad')) hydList.push(c);
      else if (d.includes('medchal')) medchalList.push(c);
      else if (d.includes('rangareddy') || d.includes('ranga reddy')) rrList.push(c);
    });

    const partitions = [];
    const rings = [];

    const genRing = (cx, cz, r, color) => {
      const pts = [];
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        pts.push(new THREE.Vector3(cx + r * Math.cos(angle), 0.26, cz + r * Math.sin(angle)));
      }
      return { pts, color };
    };

    // 1. Hyderabad Grid (Inner zone: radius 0 to 0.6)
    const hydCenter = getDistrictCenter('Hyderabad', features);
    if (hydCenter && hydList.length > 0) {
      const { cx, cz } = hydCenter;
      const n = hydList.length;
      for (let i = 0; i < n; i++) {
        const midAngle = (i / n) * 2 * Math.PI + (Math.PI / n);
        const endX = cx + 0.6 * Math.cos(midAngle);
        const endZ = cz + 0.6 * Math.sin(midAngle);
        partitions.push({
          points: [new THREE.Vector3(cx, 0.26, cz), new THREE.Vector3(endX, 0.26, endZ)],
          color: '#eab308'
        });
      }
      rings.push(genRing(cx, cz, 0.6, '#eab308'));
    }

    // 2. Medchal Grid (Middle zone: radius 0.6 to 0.95)
    const medchalCenter = getDistrictCenter('Medchal', features);
    if (medchalCenter && medchalList.length > 0) {
      const { cx, cz } = medchalCenter;
      const n = medchalList.length;
      for (let i = 0; i < n; i++) {
        const midAngle = (i / n) * 2 * Math.PI + (Math.PI / n);
        const startX = cx + 0.6 * Math.cos(midAngle);
        const startZ = cz + 0.6 * Math.sin(midAngle);
        const endX = cx + 0.95 * Math.cos(midAngle);
        const endZ = cz + 0.95 * Math.sin(midAngle);
        partitions.push({
          points: [new THREE.Vector3(startX, 0.26, startZ), new THREE.Vector3(endX, 0.26, endZ)],
          color: '#10b981'
        });
      }
      rings.push(genRing(cx, cz, 0.95, '#10b981'));
    }

    // 3. Rangareddy Grid (Outer zone: radius 0.95 to 1.6)
    const rrCenter = getDistrictCenter('Rangareddy', features);
    if (rrCenter && rrList.length > 0) {
      const { cx, cz } = rrCenter;
      const n = rrList.length;
      for (let i = 0; i < n; i++) {
        const midAngle = (i / n) * 2 * Math.PI + (Math.PI / n);
        const startX = cx + 0.95 * Math.cos(midAngle);
        const startZ = cz + 0.95 * Math.sin(midAngle);
        const endX = cx + 1.6 * Math.cos(midAngle);
        const endZ = cz + 1.6 * Math.sin(midAngle);
        partitions.push({
          points: [new THREE.Vector3(startX, 0.26, startZ), new THREE.Vector3(endX, 0.26, endZ)],
          color: '#10b981'
        });
      }
      rings.push(genRing(cx, cz, 1.6, '#10b981'));
    }

    return { partitions, rings };
  }, [ghConstituencies, mapLevel, features]);

  return (
    <>
      <ambientLight intensity={2.2} />
      <directionalLight position={[6, 10, 6]} intensity={2.5} color="#ffffff" />
      <directionalLight position={[-4, 5, -4]} intensity={1.0} color="#dfcba5" />
      <pointLight position={[0, 4, 0]} intensity={3} distance={20} color="#10b981" />

      <group position={[0, -0.3, 0]}>
        {features.map((feat, i) => (
          <DistrictMesh
            key={i}
            idx={i}
            feature={feat}
            onClickGH={onClickGH}
            mapLevel={mapLevel}
            selectedConstituency={selectedConstituency}
          />
        ))}

        {/* Holographic sector boundaries partitioning the districts into constituency zones */}
        {mapLevel === 'gh' && ghGrids.partitions.map((part, i) => (
          <Line
            key={`part-${i}`}
            points={part.points}
            color={part.color}
            lineWidth={1.2}
            transparent
            opacity={0.35}
          />
        ))}
        {mapLevel === 'gh' && ghGrids.rings.map((ring, i) => (
          <Line
            key={`ring-${i}`}
            points={ring.pts}
            color={ring.color}
            lineWidth={1.2}
            transparent
            opacity={0.35}
          />
        ))}

        {mapLevel === 'gh' && constituencyNodes.map((node, i) => (
          <ConstituencyNode
            key={`node-${node.id || i}`}
            node={node}
            onClick={setSelectedConstituency}
            isSelected={selectedConstituency && node.constituency_name.toLowerCase() === selectedConstituency.constituency_name?.toLowerCase()}
          />
        ))}
      </group>

      <CameraCtrl mapLevel={mapLevel} />
    </>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function ThreeTelanganaMap({
  mapLevel, setMapLevel, selectedConstituency, setSelectedConstituency, constituencyList, onHoverRegion
}) {
  const onClickGH = useCallback((name) => {
    setMapLevel('gh');
    if (onHoverRegion) onHoverRegion(null);
  }, [setMapLevel, onHoverRegion]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      {mapLevel === 'gh' && (
        <button
          onClick={() => setMapLevel('state')}
          style={{
            position: 'absolute',
            top: 10,
            left: 12,
            zIndex: 10,
            background: 'rgba(5,150,105,0.15)',
            border: '1px solid rgba(16,185,129,0.4)',
            color: '#10b981',
            padding: '4px 12px',
            borderRadius: 8,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            transition: 'all 0.2s'
          }}
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
        <SceneContents
          mapLevel={mapLevel}
          onClickGH={onClickGH}
          selectedConstituency={selectedConstituency}
          setSelectedConstituency={setSelectedConstituency}
          constituencyList={constituencyList}
          features={mapData.features}
        />
      </Canvas>

      {mapLevel === 'state' && (
        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', color: 'rgba(16,185,129,0.7)', fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', pointerEvents: 'none', fontFamily: 'monospace' }}>
          Hover districts · Click Hyderabad to zoom
        </div>
      )}
    </div>
  );
}
