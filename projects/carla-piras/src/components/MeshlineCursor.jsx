import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";

export default function MeshlineCursor({ params }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({});
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    if (!params.enabled) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.OrthographicCamera(
      -aspect,
      aspect,
      1,
      -1,
      -10,
      10
    );
    camera.position.z = 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      const a = w / h;
      camera.left = -a;
      camera.right = a;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const state = stateRef.current;
    state.lines = [];
    state.target = new THREE.Vector3(0, 0, 0);
    state.prevMouseX = 0;
    state.prevMouseY = 0;
    state.mouseSpeed = 0;

    const buildLines = () => {
      state.lines.forEach(({ mesh, geometry, material }) => {
        scene.remove(mesh);
        geometry.dispose();
        material.dispose();
      });
      state.lines = [];

      const p = paramsRef.current;
      const palette = [p.c1, p.c2, p.c3, p.c4];

      for (let i = 0; i < p.numLines; i++) {
        const angle = (i / p.numLines) * Math.PI * 2;
        const r = p.radius + (Math.random() - 0.5) * 0.05;
        const offset = new THREE.Vector3(
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          0
        );

        const points = [];
        for (let j = 0; j < p.numPoints; j++) {
          points.push(offset.clone());
        }

        const positions = new Float32Array(p.numPoints * 3);
        writePoints(points, positions);

        const geometry = new MeshLineGeometry();
        geometry.setPoints(positions, (t) => {
          const edge = 0.1;
          if (t < edge) return THREE.MathUtils.lerp(0.1, 1, t / edge);
          if (t > 1 - edge)
            return THREE.MathUtils.lerp(0.1, 1, (1 - t) / edge);
          return 1;
        });

        const material = new MeshLineMaterial({
          color: new THREE.Color(palette[i % palette.length]),
          lineWidth: p.lineWidth,
          resolution: new THREE.Vector2(
            window.innerWidth,
            window.innerHeight
          ),
          transparent: true,
          opacity: 0.9,
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        state.lines.push({
          mesh,
          geometry,
          material,
          points,
          positions,
          offset,
          velocity: new THREE.Vector3(),
          spring: p.spring + (Math.random() - 0.5) * 0.02,
          friction: p.friction + (Math.random() - 0.5) * 0.04,
        });
      }
    };

    buildLines();
    state.buildLines = buildLines;

    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      state.target.x = nx * (window.innerWidth / window.innerHeight);
      state.target.y = ny;
      state.mouseMoveX = e.clientX - state.prevMouseX;
      state.mouseMoveY = e.clientY - state.prevMouseY;
      state.prevMouseX = e.clientX;
      state.prevMouseY = e.clientY;
    };
    window.addEventListener("pointermove", onMove);

    let raf;
    let lastT = performance.now();
    const force = new THREE.Vector3();
    const targetOffset = new THREE.Vector3();

    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.max(1, t - lastT);
      lastT = t;

      const p = paramsRef.current;

      state.lines.forEach((line) => {
        for (let i = line.points.length - 1; i >= 0; i--) {
          if (i === 0) {
            targetOffset.copy(state.target).add(line.offset);
            force.copy(targetOffset).sub(line.points[0]).multiplyScalar(p.spring);
            line.velocity.add(force).multiplyScalar(p.friction);
            line.points[0].add(line.velocity);
          } else {
            line.points[i].lerp(line.points[i - 1], p.lerp);
          }
        }
        writePoints(line.points, line.positions);
        line.geometry.setPoints(line.positions, (tval) => {
          const edge = 0.1;
          if (tval < edge) return THREE.MathUtils.lerp(0.1, 1, tval / edge);
          if (tval > 1 - edge)
            return THREE.MathUtils.lerp(0.1, 1, (1 - tval) / edge);
          return 1;
        });
      });

      const mx = state.mouseMoveX || 0;
      const my = state.mouseMoveY || 0;
      const speed =
        (Math.sqrt(mx * mx + my * my) / (dt / 16 || 1)) *
        0.01 *
        p.speedMultiplier;
      state.mouseSpeed = THREE.MathUtils.lerp(state.mouseSpeed, speed, 0.15);
      state.mouseMoveX *= 0.85;
      state.mouseMoveY *= 0.85;

      state.lines.forEach((line) => {
        const target = THREE.MathUtils.clamp(
          state.mouseSpeed * p.lineWidth * 80,
          p.lineWidth * 0.3,
          p.lineWidth * 6
        );
        line.material.lineWidth = THREE.MathUtils.lerp(
          line.material.lineWidth,
          target,
          0.15
        );
      });

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      state.lines.forEach(({ mesh, geometry, material }) => {
        scene.remove(mesh);
        geometry.dispose();
        material.dispose();
      });
      renderer.dispose();
    };
  }, [
    params.enabled,
    params.numLines,
    params.numPoints,
    params.radius,
    params.c1,
    params.c2,
    params.c3,
    params.c4,
  ]);

  if (!params.enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 40,
        mixBlendMode: "multiply",
      }}
    />
  );
}

function writePoints(points, positions) {
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  }
}
