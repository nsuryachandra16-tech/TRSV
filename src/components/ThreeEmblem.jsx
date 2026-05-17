import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function ThreeEmblem() {
  const mountRef = useRef(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL Support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch (e) {
      setWebGlSupported(false);
      return;
    }

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Group to hold all 3D geometries
    const emblemGroup = new THREE.Group();
    scene.add(emblemGroup);

    // Small detailed inner golden shield sigil (Protection Symbol)
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 0.9);
    shieldShape.lineTo(0.6, 0.7);
    shieldShape.lineTo(0.6, 0.1);
    shieldShape.quadraticCurveTo(0.6, -0.6, 0, -1.0);
    shieldShape.quadraticCurveTo(-0.6, -0.6, -0.6, 0.1);
    shieldShape.lineTo(-0.6, 0.7);
    shieldShape.lineTo(0, 0.9);

    const extrudeSettings = {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03
    };

    const goldenShieldGeom = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
    goldenShieldGeom.center();

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Radiant Luxury Gold
      metalness: 0.95,
      roughness: 0.15
    });
    const goldShieldMesh = new THREE.Mesh(goldenShieldGeom, goldMaterial);
    goldShieldMesh.scale.set(0.6, 0.6, 0.6); // Perfect size to fit inside glass sphere
    goldShieldMesh.position.z = -0.06; // Center inside sphere volume

    // Central Glass Crystal Sphere (Refractive transparency core)
    const crystalGeom = new THREE.SphereGeometry(0.9, 32, 32);
    const crystalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.95, // Crystal transparency
      thickness: 0.9,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });
    const crystalMesh = new THREE.Mesh(crystalGeom, crystalMaterial);
    
    // Add the golden shield inside the crystal sphere as a child!
    // It will refract beautifully through the glass layers.
    crystalMesh.add(goldShieldMesh);
    emblemGroup.add(crystalMesh);

    // Outer Cyber Grid Lattice (Wireframe Lattice)
    const latticeGeom = new THREE.IcosahedronGeometry(1.35, 1);
    const latticeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee, // Cyber Cyan
      metalness: 0.2,
      roughness: 0.1,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const latticeMesh = new THREE.Mesh(latticeGeom, latticeMaterial);
    emblemGroup.add(latticeMesh);

    // Horizontal Telemetry Scanning Ring
    const scanRingGeom = new THREE.RingGeometry(1.45, 1.55, 64);
    const scanRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9, // Glowing Sky Blue
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const scanRingMesh = new THREE.Mesh(scanRingGeom, scanRingMaterial);
    scanRingMesh.rotation.x = Math.PI / 2; // Flat plane
    emblemGroup.add(scanRingMesh);

    // Dynamic Diagonal Orbit Ring
    const orbitRingGeom = new THREE.TorusGeometry(1.8, 0.04, 16, 100);
    const orbitRingMaterial = new THREE.MeshStandardMaterial({
      color: 0x22d3ee, // Cyan Ring
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x0891b2,
      emissiveIntensity: 0.3
    });
    const orbitRingMesh = new THREE.Mesh(orbitRingGeom, orbitRingMaterial);
    orbitRingMesh.rotation.x = Math.PI / 3;
    emblemGroup.add(orbitRingMesh);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Direct lighting that casts gleams
    const pointLight1 = new THREE.PointLight(0x0ea5e9, 180, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x22d3ee, 120, 50);
    pointLight2.position.set(-5, -5, 3);
    scene.add(pointLight2);

    const dirLight = new THREE.DirectionalLight(0xffffff, 4.0);
    dirLight.position.set(2, 4, 6);
    scene.add(dirLight);

    // Cursor tracking state variables
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left - width / 2;
      const y = event.clientY - rect.top - height / 2;
      targetX = (x / width) * 1.5;
      targetY = (y / height) * 1.5;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Resize listener
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW && newH) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Render loop
    let clock = new THREE.Clock();
    let animId;

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Rotate the central crystal sphere (which automatically rotates the gold shield inside it)
      crystalMesh.rotation.y = elapsedTime * 0.4;
      crystalMesh.rotation.x = elapsedTime * 0.15;

      // Spin the cyber grid lattice in the opposite direction
      latticeMesh.rotation.y = -elapsedTime * 0.2;
      latticeMesh.rotation.z = elapsedTime * 0.1;

      // Spin the flat horizontal telemetry ring
      scanRingMesh.rotation.z = elapsedTime * 0.6;

      // Spin the dynamic diagonal orbit ring
      orbitRingMesh.rotation.z = -elapsedTime * 0.3;

      // Elastic cursor reaction (Lerp easing)
      mouseX += (targetX - mouseX) * 0.08;
      mouseY += (targetY - mouseY) * 0.08;

      emblemGroup.rotation.y = mouseX;
      emblemGroup.rotation.x = -mouseY;

      // Float effect
      emblemGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.12;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      container.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  if (!webGlSupported) {
    return <FallbackSVGEmblem />;
  }

  return (
    <div 
      ref={mountRef} 
      className="w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 mx-auto cursor-grab active:cursor-grabbing relative flex items-center justify-center"
    />
  );
}

// Sleek responsive vector shield fallback for maximum accessibility
function FallbackSVGEmblem() {
  return (
    <div className="w-64 h-64 sm:w-80 sm:h-80 relative flex items-center justify-center animate-float-slow">
      {/* Halo outer rings */}
      <div className="absolute inset-0 border border-cyan-400/20 dark:border-cyan-500/20 rounded-full animate-[spin_12s_linear_infinite]" />
      <div className="absolute inset-6 border border-sky-400/10 dark:border-sky-500/10 rounded-full animate-[spin_8s_linear_infinite_reverse]" />
      
      {/* Decorative Core Shield */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-40 h-40 drop-shadow-glow-cyan dark:drop-shadow-[0_0_25px_rgba(34,211,238,0.4)]"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        
        {/* Futuristic Grid Shield structure */}
        <polygon 
          points="50,5 90,20 90,55 50,95 10,55 10,20" 
          fill="url(#shieldGrad)" 
          className="opacity-90"
        />
        
        {/* Core details */}
        <polygon 
          points="50,15 80,26 80,50 50,82 20,50 20,26" 
          fill="#ffffff" 
          className="opacity-20"
        />
        
        {/* Inner symbol block (T) */}
        <path 
          d="M38,30 H62 V38 H54 V70 H46 V38 H38 Z" 
          fill="#ffffff"
          className="drop-shadow-sm font-extrabold"
        />
      </svg>
    </div>
  );
}
