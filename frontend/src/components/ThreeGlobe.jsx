import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function ThreeGlobe() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || 300;
    let height = container.clientHeight || 300;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Primary sphere wireframe: Emerald Green (0x10b981)
    const globeGeom = new THREE.SphereGeometry(1.5, 30, 20);
    const globeMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const globeMesh = new THREE.Mesh(globeGeom, globeMat);
    globeGroup.add(globeMesh);

    // Outer atmospheric grid: Cool Blue (0x3b82f6)
    const outerGeom = new THREE.SphereGeometry(1.56, 12, 10);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    const outerMesh = new THREE.Mesh(outerGeom, outerMat);
    globeGroup.add(outerMesh);

    // Satellite Orbit rings: Golden Amber (0xf59e0b)
    const ringGeom = new THREE.RingGeometry(1.8, 1.81, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    const ringMesh1 = new THREE.Mesh(ringGeom, ringMat);
    ringMesh1.rotation.x = Math.PI / 2.5;
    globeGroup.add(ringMesh1);

    const ringMesh2 = new THREE.Mesh(ringGeom, ringMat);
    ringMesh2.rotation.x = -Math.PI / 3;
    ringMesh2.rotation.y = Math.PI / 4;
    globeGroup.add(ringMesh2);

    // Orbiting particle coordinates (nodes along routes - White)
    const particleCount = 45;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.5;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.95
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    globeGroup.add(particles);

    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      mouseX = (x / rect.width) - 0.5;
      mouseY = (y / rect.height) - 0.5;
      
      targetRotationY = mouseX * 2.5;
      targetRotationX = mouseY * 2.5;
    };

    container.addEventListener('mousemove', handleMouseMove);

    let animationFrameId;
    const animate = () => {
      globeGroup.rotation.y += 0.003;
      
      globeGroup.rotation.y += (targetRotationY - globeGroup.rotation.y) * 0.05;
      globeGroup.rotation.x += (targetRotationX - globeGroup.rotation.x) * 0.05;

      ringMesh1.rotation.z += 0.002;
      ringMesh2.rotation.z -= 0.002;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };
    
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      globeGeom.dispose();
      globeMat.dispose();
      outerGeom.dispose();
      outerMat.dispose();
      ringGeom.dispose();
      ringMat.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-56 sm:h-64 relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
