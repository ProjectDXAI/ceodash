"use client";

import { useEffect, useRef } from "react";

const TILE_SIZE = 40;
const GAP = 4;
const CELL = TILE_SIZE + GAP;
const LIGHT_COLOR = "#111111";
const DARK_COLOR = "#1a1a1a";
const BG_COLOR = "#111111";
const RADIUS = 1440;
const CORNER_RADIUS = 3;
const LERP_SPEED = 0.05; // How fast tiles rotate toward target (0–1, lower = smoother)

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

/** Shortest angular path from `from` to `to` (handles wraparound) */
function angleLerp(from: number, to: number, t: number): number {
  let diff = to - from;
  // Wrap to [-π, π]
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * t;
}

export default function MiiFloor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const rotationsRef = useRef<Float32Array | null>(null);
  const gridSizeRef = useRef({ cols: 0, rows: 0 });
  const needsDrawRef = useRef(true);
  const idleFramesRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";

      // Resize rotation buffer
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cols = Math.ceil(w / CELL) + 2;
      const rows = Math.ceil(h / CELL) + 2;
      if (cols !== gridSizeRef.current.cols || rows !== gridSizeRef.current.rows) {
        gridSizeRef.current = { cols, rows };
        rotationsRef.current = new Float32Array(cols * rows);
      }
    }

    function onMouseMove(e: MouseEvent) {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      needsDrawRef.current = true;
      idleFramesRef.current = 0;
    }

    function onMouseLeave() {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
      needsDrawRef.current = true;
      idleFramesRef.current = 0;
    }

    function draw() {
      if (!ctx || !canvas || !rotationsRef.current) return;

      // Stop looping after tiles have settled (60 frames of idle = ~1s)
      if (!needsDrawRef.current) {
        idleFramesRef.current++;
        if (idleFramesRef.current > 60) {
          rafRef.current = requestAnimationFrame(draw);
          return;
        }
      }
      needsDrawRef.current = false;

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const { cols, rows } = gridSizeRef.current;
      const rots = rotationsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      const HP = Math.PI / 2;

      // Pass 1: light (static) tiles
      ctx.fillStyle = LIGHT_COLOR;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if ((row + col) % 2 !== 0) {
            const cx = col * CELL + CELL / 2;
            const cy = row * CELL + CELL / 2;
            roundRect(ctx, cx - TILE_SIZE / 2, cy - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, CORNER_RADIUS);
          }
        }
      }

      // Pass 2: dark (rotating) tiles on top so corners aren't clipped
      ctx.fillStyle = DARK_COLOR;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if ((row + col) % 2 === 0) {
            const idx = row * cols + col;
            const currentRot = rots[idx];

            const cx = col * CELL + CELL / 2;
            const cy = row * CELL + CELL / 2;
            const dx = mx - cx;
            const dy = my - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let targetRot = 0;
            if (dist < RADIUS && dist > CELL * 0.5) {
              const angleToMouse = Math.atan2(dy, dx);

              let bestCandidate = 0;
              let bestAngDist = Infinity;
              for (let k = 0; k < 4; k++) {
                let diff = angleToMouse - k * HP - currentRot;
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                if (Math.abs(diff) < bestAngDist) {
                  bestAngDist = Math.abs(diff);
                  bestCandidate = currentRot + diff;
                }
              }

              const t = 1 - dist / RADIUS;
              const ease = t * t;
              targetRot = bestCandidate * ease;
            }

            const newRot = angleLerp(currentRot, targetRot, LERP_SPEED);
            rots[idx] = newRot;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(newRot);
            roundRect(ctx, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, CORNER_RADIUS);
            ctx.restore();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
