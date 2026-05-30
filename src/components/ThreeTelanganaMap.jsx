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

// ─── Sutherland-Hodgman clipping algorithm to build clean Voronoi boundaries ───
function clipPolygon(poly, mid, normal) {
  const clipped = [];
  if (!poly || poly.length === 0) return [];
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    
    const d1 = (p1.x - mid.x) * normal.x + (p1.z - mid.z) * normal.z;
    const d2 = (p2.x - mid.x) * normal.x + (p2.z - mid.z) * normal.z;
    
    if (d1 <= 0.00001) {
      clipped.push(p1);
    }
    if ((d1 < -0.00001 && d2 > 0.00001) || (d1 > 0.00001 && d2 < -0.00001)) {
      const t = d1 / (d1 - d2);
      clipped.push({
        x: p1.x + t * (p2.x - p1.x),
        z: p1.z + t * (p2.z - p1.z)
      });
    }
  }
  return clipped;
}

const getDistrictPolygon = (districtName, features) => {
  const center = getDistrictCenter(districtName, features);
  return center ? center.pts : null;
};

// ─── Single District Mesh Component ──────────────────────────────────────────
function DistrictMesh({ feature, idx, onClickGH, mapLevel, selectedConstituency }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const name = feature.properties?.name || '';
  const active = isGH(name);

  // Hide all non-GH districts when zoomed in to GH for a clean focused look
  const isHyd = name.toLowerCase().includes('hyderabad');
  const borderColor = isHyd ? '#eab308' : '#10b981';

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

  // When zoomed in, hide the main district mesh of GH districts so we can render their constituency meshes instead
  if (mapLevel === 'gh') {
    return null;
  }

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

// ─── Camera Controller with deep multi-level zoom (State -> GH -> Constituency) ───
function CameraCtrl({ mapLevel, selectedConstituency, constituencyCells }) {
  const { camera, size } = useThree();
  const mobile = size.width < 768;
  const prevTarget = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    let targetCam = new THREE.Vector3(0, mobile ? 13 : 9, mobile ? 14 : 10);
    let targetLook = new THREE.Vector3(0, 0, 0);

    if (mapLevel === 'state') {
      targetCam.set(0, mobile ? 13 : 9, mobile ? 14 : 10);
      targetLook.set(0, 0, 0);
    } else if (mapLevel === 'gh' && !selectedConstituency) {
      targetCam.set(-0.5, mobile ? 5 : 3.5, mobile ? 5.5 : 4);
      targetLook.set(-0.3, 0, -0.3);
    } else if (mapLevel === 'gh' && selectedConstituency) {
      const name = selectedConstituency.constituency_name.toLowerCase();
      const cell = constituencyCells.find(c => c.constituency.constituency_name.toLowerCase() === name);
      if (cell) {
        const poly = cell.poly;
        const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
        const cz = poly.reduce((s, p) => s + p.z, 0) / poly.length;
        
        // Dynamic deep camera framing around the clicked constituency block
        targetCam.set(cx, mobile ? 1.6 : 1.25, cz + (mobile ? 1.2 : 0.95));
        targetLook.set(cx, 0, cz);
      } else {
        targetCam.set(-0.5, mobile ? 5 : 3.5, mobile ? 5.5 : 4);
        targetLook.set(-0.3, 0, -0.3);
      }
    }

    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(prevTarget.current);

    gsap.to(camera.position, {
      x: targetCam.x,
      y: targetCam.y,
      z: targetCam.z,
      duration: 1.8,
      ease: 'power3.inOut'
    });

    gsap.to(prevTarget.current, {
      x: targetLook.x,
      y: targetLook.y,
      z: targetLook.z,
      duration: 1.8,
      ease: 'power3.inOut',
      onUpdate: () => {
        camera.lookAt(prevTarget.current.x, prevTarget.current.y, prevTarget.current.z);
      }
    });
  }, [mapLevel, selectedConstituency, constituencyCells, camera, mobile]);

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

// ─── 3D Extruded Constituency Mesh Component ──────────────────────────────
function ConstituencyMesh({ constituency, poly, onClick, isSelected }) {
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => {
    const shp = new THREE.Shape();
    if (poly.length > 2) {
      shp.moveTo(poly[0].x, -poly[0].z);
      poly.slice(1).forEach(p => shp.lineTo(p.x, -p.z));
      shp.closePath();
    }
    return shp;
  }, [poly]);

  const geom = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.003,
      bevelThickness: 0.005
    });
  }, [shape]);

  const currentMat = useMemo(() => {
    if (isSelected) return MAT_GH_SEL;
    return hovered ? MAT_GH_HOVER : MAT_GH;
  }, [isSelected, hovered]);

  const borderPts = useMemo(() => {
    return poly.map(p => new THREE.Vector3(p.x, 0.225, p.z)).concat([new THREE.Vector3(poly[0].x, 0.225, poly[0].z)]);
  }, [poly]);

  const { cx, cz } = useMemo(() => {
    const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const cz = poly.reduce((s, p) => s + p.z, 0) / poly.length;
    return { cx, cz };
  }, [poly]);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={geom}
        material={currentMat}
        onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        onClick={e => { e.stopPropagation(); onClick(constituency.raw); }}
      />
      <Line
        points={borderPts}
        color={isSelected ? '#ffffff' : '#1e3527'}
        lineWidth={isSelected ? 2.5 : 1.0}
        transparent
        opacity={isSelected ? 1.0 : 0.45}
      />
      {hovered && (
        <Html position={[cx, 0.35, cz]} center distanceFactor={10} className="pointer-events-none select-none z-55">
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
            {constituency.constituency_name}
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

  // Generate clipped Voronoi cell polygons for all Greater Hyderabad constituencies
  const constituencyCells = useMemo(() => {
    if (mapLevel !== 'gh') return [];

    const hydList = [], medchalList = [], rrList = [];
    ghConstituencies.forEach(c => {
      const d = (c.district || '').toLowerCase();
      if (d.includes('hyderabad')) hydList.push(c);
      else if (d.includes('medchal')) medchalList.push(c);
      else if (d.includes('rangareddy') || d.includes('ranga reddy')) rrList.push(c);
    });

    const cells = [];

    const processDistrictCells = (groupList, districtName, r) => {
      if (groupList.length === 0) return;
      const districtPts = getDistrictPolygon(districtName, features);
      if (!districtPts || districtPts.length === 0) return;

      const center = getDistrictCenter(districtName, features);
      if (!center) return;
      const { cx, cz } = center;
      const n = groupList.length;

      // 1. Generate node coordinates (seed points)
      const nodes = groupList.map((c, idx) => {
        const angle = (idx / n) * 2 * Math.PI;
        return {
          x: cx + r * Math.cos(angle),
          z: cz + r * Math.sin(angle),
          raw: c,
          constituency_name: c.constituency_name
        };
      });

      // 2. Generate clipped Voronoi cell polygon for each node
      nodes.forEach((nodeI, i) => {
        let poly = districtPts.map(p => ({ x: p.x, z: p.z }));
        
        nodes.forEach((nodeJ, j) => {
          if (i === j) return;
          const mid = { x: (nodeI.x + nodeJ.x) / 2, z: (nodeI.z + nodeJ.z) / 2 };
          const normal = { x: nodeJ.x - nodeI.x, z: nodeJ.z - nodeI.z };
          poly = clipPolygon(poly, mid, normal);
        });

        if (poly && poly.length > 2) {
          cells.push({
            constituency: nodeI,
            poly
          });
        }
      });
    };

    processDistrictCells(hydList, 'Hyderabad', 0.45);
    processDistrictCells(medchalList, 'Medchal', 0.75);
    processDistrictCells(rrList, 'Rangareddy', 1.25);

    return cells;
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

        {/* Render precise 3D constituency meshes */}
        {mapLevel === 'gh' && constituencyCells.map((cell, i) => (
          <ConstituencyMesh
            key={`cell-${cell.constituency.raw.id || i}`}
            constituency={cell.constituency}
            poly={cell.poly}
            onClick={setSelectedConstituency}
            isSelected={selectedConstituency && cell.constituency.constituency_name.toLowerCase() === selectedConstituency.constituency_name?.toLowerCase()}
          />
        ))}
      </group>

      <CameraCtrl
        mapLevel={mapLevel}
        selectedConstituency={selectedConstituency}
        constituencyCells={constituencyCells}
      />
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

  const handleBackgroundClick = useCallback(() => {
    if (selectedConstituency) {
      setSelectedConstituency(null);
    }
  }, [selectedConstituency, setSelectedConstituency]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      {mapLevel === 'gh' && (
        <button
          onClick={() => {
            setMapLevel('state');
            setSelectedConstituency(null);
          }}
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
        onPointerDown={handleBackgroundClick}
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
