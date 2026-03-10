"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

interface CableData {
  from: [number, number];
  to: [number, number];
  color: string;
  sag: number;
  zIndex: number;
}

const CABLE_COLORS = ["#e74c3c", "#f39c12", "#3498db", "#2ecc71", "#9b59b6", "#ff6b9d", "#66ffcc"];

function buildCurve(from: [number, number], to: [number, number], sag: number, z: number): THREE.CatmullRomCurve3 {
  const segs = 24;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = from[0] + (to[0] - from[0]) * t;
    const y = from[1] + (to[1] - from[1]) * t - sag * Math.sin(Math.PI * t);
    pts.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(pts);
}

function Cable({ from, to, color, sag, zIndex }: CableData) {
  const z = zIndex * 0.15;
  const curve = buildCurve(from, to, sag, z);
  const geo = new THREE.TubeGeometry(curve, 36, 0.005, 8, false);

  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial
          color={color}
          roughness={0.35}
          metalness={0.3}
          emissive={color}
          emissiveIntensity={0.12}
        />
      </mesh>
      <JackPlug position={[from[0], from[1], z]} color={color} />
      <JackPlug position={[to[0], to[1], z]} color={color} />
    </group>
  );
}

function JackPlug({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.012, 0.015, 0.03, 10]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function pixelToWorld(
  px: number, py: number,
  cw: number, ch: number,
  viewW: number, viewH: number
): [number, number] {
  return [
    ((px / cw) - 0.5) * viewW,
    (0.5 - (py / ch)) * viewH,
  ];
}

interface PanelRect {
  left: number; right: number; top: number; bottom: number; w: number; h: number;
  cx: number; cy: number;
}

function getRect(el: HTMLElement, cr: DOMRect): PanelRect {
  const r = el.getBoundingClientRect();
  const left = r.left - cr.left;
  const top = r.top - cr.top;
  const w = r.width;
  const h = r.height;
  return {
    left, right: left + w, top, bottom: top + h, w, h,
    cx: left + w / 2,
    cy: top + h / 2,
  };
}

export default function PatchCables() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cables, setCables] = useState<CableData[]>([]);
  const [dims, setDims] = useState({ w: 1, h: 1 });
  const [ready, setReady] = useState(false);
  const prevHash = useRef("");

  const measure = useCallback(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const cr = container.getBoundingClientRect();
    const cw = cr.width;
    const ch = cr.height + 150;

    const chatEl = container.querySelector<HTMLElement>("[data-panel='chat']");
    const activityEl = container.querySelector<HTMLElement>("[data-panel='activity']");
    const toolEl = container.querySelector<HTMLElement>("[data-panel='tool-perf']");
    const marketEl = container.querySelector<HTMLElement>("[data-panel='market']");

    if (!chatEl || !activityEl || !toolEl || !marketEl) return;

    const chat = getRect(chatEl, cr);
    const activity = getRect(activityEl, cr);
    const tool = getRect(toolEl, cr);
    const market = getRect(marketEl, cr);

    if (chat.h < 50 || activity.h < 50 || tool.h < 50 || market.h < 50) return;

    const hash = [cw, ch, chat.cx, chat.cy, chat.h, activity.cx, activity.cy, activity.h,
      tool.cx, tool.cy, tool.h, market.cx, market.cy, market.h].map(v => Math.round(v)).join(",");
    if (hash === prevHash.current) return;
    prevHash.current = hash;

    setDims({ w: cw, h: ch });

    const aspect = cw / ch;
    const viewH = 2;
    const viewW = viewH * aspect;

    const toW = (px: number, py: number): [number, number] =>
      pixelToWorld(px, py, cw, ch, viewW, viewH);

    const nc: CableData[] = [];
    const inset = 60;

    // Each cable gets a different zIndex so they never z-fight
    nc.push({
      from: toW(chat.cx + chat.w * 0.15, chat.cy - chat.h * 0.08),
      to: toW(activity.cx - activity.w * 0.15, activity.cy - activity.h * 0.1),
      color: CABLE_COLORS[0],
      sag: 0.12,
      zIndex: 0,
    });
    nc.push({
      from: toW(chat.cx + chat.w * 0.15, chat.cy + chat.h * 0.15),
      to: toW(activity.cx - activity.w * 0.15, activity.cy + activity.h * 0.12),
      color: CABLE_COLORS[1],
      sag: 0.18,
      zIndex: 1,
    });
    nc.push({
      from: toW(chat.cx - chat.w * 0.05, chat.bottom - inset),
      to: toW(tool.cx - tool.w * 0.15, tool.top + inset),
      color: CABLE_COLORS[2],
      sag: 0.08,
      zIndex: 2,
    });
    nc.push({
      from: toW(activity.cx + activity.w * 0.05, activity.bottom - inset),
      to: toW(tool.cx + tool.w * 0.15, tool.top + inset),
      color: CABLE_COLORS[3],
      sag: 0.08,
      zIndex: 3,
    });
    nc.push({
      from: toW(tool.cx - tool.w * 0.12, tool.bottom - inset),
      to: toW(market.cx - market.w * 0.12, market.top + inset),
      color: CABLE_COLORS[4],
      sag: 0.1,
      zIndex: 4,
    });
    nc.push({
      from: toW(tool.cx + tool.w * 0.12, tool.bottom - inset),
      to: toW(market.cx + market.w * 0.12, market.top + inset),
      color: CABLE_COLORS[5],
      sag: 0.1,
      zIndex: 5,
    });
    nc.push({
      from: toW(chat.cx + chat.w * 0.1, chat.bottom - inset),
      to: toW(market.cx, market.top + inset),
      color: CABLE_COLORS[6],
      sag: 0.25,
      zIndex: 6,
    });

    setCables(nc);
    setReady(true);
  }, []);

  useEffect(() => {
    // Don't measure until the page has had time to fully lay out
    const initialDelay = setTimeout(() => {
      measure();
      // Then keep polling a few more times in case layout shifts
      const followups = [500, 1500, 3000, 5000];
      followups.forEach((d) => setTimeout(measure, d));
    }, 1500);

    const ro = new ResizeObserver(() => {
      prevHash.current = "";
      measure();
    });
    if (containerRef.current?.parentElement) {
      ro.observe(containerRef.current.parentElement);
    }
    return () => { clearTimeout(initialDelay); ro.disconnect(); };
  }, [measure]);

  const aspect = dims.w / dims.h || 1;

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none transition-opacity duration-1000"
      style={{
        zIndex: 1,
        top: 0,
        left: 0,
        right: 0,
        bottom: "-150px",
        opacity: ready ? 1 : 0,
      }}
    >
      <Canvas
        orthographic
        camera={{
          zoom: 1,
          near: -10,
          far: 10,
          left: -aspect,
          right: aspect,
          top: 1,
          bottom: -1,
        }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
        frameloop="demand"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 5]} intensity={0.7} />
        {cables.map((c, i) => (
          <Cable key={`${i}-${c.from[0].toFixed(3)}-${c.to[0].toFixed(3)}`} {...c} />
        ))}
      </Canvas>
    </div>
  );
}
