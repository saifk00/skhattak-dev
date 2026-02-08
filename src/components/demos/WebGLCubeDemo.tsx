import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function WebGLCubeDemo() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1117');

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x58a6ff, roughness: 0.25, metalness: 0.3 }),
    );
    const cube2 = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x3fb950, roughness: 0.2, metalness: 0.25 }),
    );
    cube2.position.set(2, 1, -2);

    scene.add(cube);
    scene.add(cube2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(3, 3, 5);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x58a6ff, 0.7, 12);
    fillLight.position.set(-3, -1, 2);
    scene.add(fillLight);

    const resize = () => {
      const width = Math.max(280, host.clientWidth);
      const height = Math.max(240, Math.round(width * 0.62));
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let frameId = 0;
    const animate = () => {
      cube.rotation.x += 0.012;
      cube.rotation.y += 0.014;
      cube2.rotation.x += 0.008;
      cube2.rotation.y += 0.011;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      cube.geometry.dispose();
      cube2.geometry.dispose();
      (cube.material as THREE.Material).dispose();
      (cube2.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <section
      style={{
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '16px',
        margin: '20px 0',
        background: 'var(--surface)',
      }}
    >
      <div ref={hostRef} />
    </section>
  );
}
