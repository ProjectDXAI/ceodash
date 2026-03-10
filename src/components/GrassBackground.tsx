"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ─── GLSL Shaders (Breath of the Wild style) ───────────────────────────

const grassVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWindStrength;

  attribute float bladeTip;    // 0 at base, 1 at tip
  attribute float bladeRandom;  // per-blade random value for variation

  varying float vHeight;
  varying float vRandom;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vHeight = bladeTip;
    vRandom = bladeRandom;

    vec3 pos = position;
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

    // Wind displacement — only affects vertices near the tip
    float windPhase = uTime * 1.8 + vWorldPos.x * 0.3 + vWorldPos.z * 0.2;
    float windNoise = noise(vWorldPos.xz * 0.15 + uTime * 0.4);

    // Primary sway
    float sway = sin(windPhase + bladeRandom * 6.28) * bladeTip * bladeTip;
    // Gust effect
    float gust = (windNoise - 0.5) * 2.0 * bladeTip * bladeTip;

    pos.x += (sway * 0.6 + gust * 0.4) * uWindStrength;
    pos.z += (sway * 0.3 + gust * 0.2) * uWindStrength * 0.5;

    // Slight y compression when swaying a lot (bending)
    pos.y -= abs(sway) * bladeTip * 0.15 * uWindStrength;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const grassFragmentShader = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform vec3 uShadowColor;
  uniform float uTime;
  uniform float uFadeNear;
  uniform float uFadeFar;
  uniform vec3 uCameraPos;

  varying float vHeight;
  varying float vRandom;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Gradient from base to tip
    vec3 color = mix(uBaseColor, uTipColor, vHeight);

    // Add per-blade color variation
    float colorVariation = vRandom * 0.15;
    color += vec3(colorVariation * 0.3, colorVariation, colorVariation * 0.2);

    // Moving shadow (like clouds passing over)
    float shadow = noise(vWorldPos.xz * 0.08 + uTime * 0.15);
    shadow = smoothstep(0.3, 0.7, shadow);
    color = mix(color, uShadowColor, shadow * 0.25);

    // Subtle AO at the base
    float ao = smoothstep(0.0, 0.3, vHeight);
    color *= mix(0.6, 1.0, ao);

    // Warm orange highlight at the tips (dusk sunlight catching the grass)
    float tipHighlight = smoothstep(0.7, 1.0, vHeight);
    vec3 duskWarm = vec3(0.95, 0.75, 0.45); // Warm golden-orange
    color = mix(color, duskWarm, tipHighlight * 0.15);

    // Cool blue tint in the shadows (reflected sky light)
    vec3 duskCool = vec3(0.4, 0.5, 0.7);
    float shadowTint = 1.0 - ao; // Stronger at the base
    color = mix(color, duskCool, shadowTint * 0.08);

    // Depth fade — grass becomes transparent based on Z position
    float depth = -(vWorldPos.z);
    float alpha = 1.0 - smoothstep(uFadeNear, uFadeFar, depth);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ─── Fullscreen sky (texture-based) ─────────────────────────────────────

const skyFullscreenVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Render as fullscreen quad ignoring camera — always fills the screen
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const skyFullscreenFragmentShader = /* glsl */ `
  uniform sampler2D uSkyTexture;
  uniform float uImageAspect;   // width / height of the sky image
  uniform float uScreenAspect;  // width / height of the canvas

  varying vec2 vUv;

  void main() {
    // --- "cover" fit: uniform scale, no distortion ---
    vec2 uv = vUv;

    // Scale UVs so image covers the screen without stretching
    if (uScreenAspect > uImageAspect) {
      // Screen is wider than image — fit width, crop top/bottom
      float scale = uImageAspect / uScreenAspect;
      uv.y = (uv.y - 0.5) * scale + 0.5;
    } else {
      // Screen is taller than image — fit height, crop sides
      float scale = uScreenAspect / uImageAspect;
      uv.x = (uv.x - 0.5) * scale + 0.5;
    }

    // Shift the image up so its bottom edge sits at the horizon
    // After cover-fit, uv.y is centered; shift down in UV = image moves up on screen
    uv.y = uv.y - 0.35;

    // Clamp to edge so we don't see wrapping artifacts
    uv = clamp(uv, 0.0, 1.0);

    gl_FragColor = texture2D(uSkyTexture, uv);
  }
`;

// ─── Ground shader (fades to horizon) ───────────────────────────────────

const groundVertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const groundFragmentShader = /* glsl */ `
  uniform vec3 uGroundColor;
  uniform vec3 uCameraPos;
  uniform float uFadeNear;
  uniform float uFadeFar;

  varying vec3 vWorldPos;

  void main() {
    vec3 color = uGroundColor;

    // Depth fade — ground becomes transparent based on Z position
    float depth = -(vWorldPos.z);
    float alpha = 1.0 - smoothstep(uFadeNear, uFadeFar, depth);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ─── Grass field geometry builder ───────────────────────────────────────

function createGrassGeometry(
  bladeCount: number,
  fieldWidth: number,
  fieldDepth: number,
  bladeHeight: number,
  bladeHeightVariation: number,
  bladeWidth: number
) {
  const VERTS_PER_BLADE = 5;

  const positions = new Float32Array(bladeCount * VERTS_PER_BLADE * 3);
  const bladeTips = new Float32Array(bladeCount * VERTS_PER_BLADE);
  const bladeRandoms = new Float32Array(bladeCount * VERTS_PER_BLADE);
  const indices: number[] = [];

  for (let i = 0; i < bladeCount; i++) {
    const baseIndex = i * VERTS_PER_BLADE;

    // Random position on the field
    const cx = (Math.random() - 0.5) * fieldWidth;
    const cz = (Math.random() - 0.5) * fieldDepth;
    const angle = Math.random() * Math.PI;

    // Blades farther from camera get slightly shorter for natural thinning
    const distanceFactor = 1.0 - Math.max(0, (-cz - fieldDepth * 0.2) / (fieldDepth * 0.6)) * 0.3;

    const h = (bladeHeight + (Math.random() - 0.5) * bladeHeightVariation * 2) * distanceFactor;
    const w = bladeWidth * (0.7 + Math.random() * 0.6);
    const rand = Math.random();

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // v0 bottom-left
    positions[(baseIndex + 0) * 3 + 0] = cx - w * cos;
    positions[(baseIndex + 0) * 3 + 1] = 0;
    positions[(baseIndex + 0) * 3 + 2] = cz - w * sin;
    bladeTips[baseIndex + 0] = 0.0;

    // v1 bottom-right
    positions[(baseIndex + 1) * 3 + 0] = cx + w * cos;
    positions[(baseIndex + 1) * 3 + 1] = 0;
    positions[(baseIndex + 1) * 3 + 2] = cz + w * sin;
    bladeTips[baseIndex + 1] = 0.0;

    // v2 mid-left
    positions[(baseIndex + 2) * 3 + 0] = cx - w * 0.5 * cos;
    positions[(baseIndex + 2) * 3 + 1] = h * 0.5;
    positions[(baseIndex + 2) * 3 + 2] = cz - w * 0.5 * sin;
    bladeTips[baseIndex + 2] = 0.5;

    // v3 mid-right
    positions[(baseIndex + 3) * 3 + 0] = cx + w * 0.5 * cos;
    positions[(baseIndex + 3) * 3 + 1] = h * 0.5;
    positions[(baseIndex + 3) * 3 + 2] = cz + w * 0.5 * sin;
    bladeTips[baseIndex + 3] = 0.5;

    // v4 tip (center)
    positions[(baseIndex + 4) * 3 + 0] = cx;
    positions[(baseIndex + 4) * 3 + 1] = h;
    positions[(baseIndex + 4) * 3 + 2] = cz;
    bladeTips[baseIndex + 4] = 1.0;

    for (let v = 0; v < VERTS_PER_BLADE; v++) {
      bladeRandoms[baseIndex + v] = rand;
    }

    // Triangle indices
    indices.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
    indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
    indices.push(baseIndex + 2, baseIndex + 3, baseIndex + 4);
    indices.push(baseIndex + 3, baseIndex + 4, baseIndex + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("bladeTip", new THREE.BufferAttribute(bladeTips, 1));
  geometry.setAttribute("bladeRandom", new THREE.BufferAttribute(bladeRandoms, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// ─── Shared constants ───────────────────────────────────────────────────

const CAMERA_POS = new THREE.Vector3(0, 5.5, 7);
const CAMERA_LOOK_AT = new THREE.Vector3(0, 2.5, -10);
const FOG_NEAR = 25;
const FOG_FAR = 45;

// ─── React Three Fiber components ───────────────────────────────────────

const REFERENCE_HEIGHT = 420; // px — the canvas height where the view looks "normal"
const REFERENCE_VFOV = 50;   // degrees — the vertical FOV at reference height

function CameraController() {
  const { camera, size } = useThree();

  useMemo(() => {
    camera.position.copy(CAMERA_POS);
    camera.lookAt(CAMERA_LOOK_AT);
  }, [camera]);

  // Asymmetric projection: taller canvas only extends the view UPWARD.
  // The bottom half (grass/horizon) stays pixel-identical.
  useFrame(() => {
    const perspCam = camera as THREE.PerspectiveCamera;
    const near = perspCam.near;
    const far = perspCam.far;

    const refHalfTan = Math.tan((REFERENCE_VFOV * Math.PI / 180) / 2);
    const heightRatio = size.height / REFERENCE_HEIGHT;

    // Bottom stays locked — same as the original symmetric 50° view
    const bottom = -near * refHalfTan;
    // Top extends upward for taller canvases (at 420px this equals +refHalfTan = symmetric)
    const top = near * refHalfTan * (2 * heightRatio - 1);

    // Horizontal FOV stays the same regardless of canvas height
    const hHalfExtent = near * (size.width / REFERENCE_HEIGHT) * refHalfTan;
    const left = -hHalfExtent;
    const right = hHalfExtent;

    perspCam.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
    perspCam.projectionMatrixInverse.copy(perspCam.projectionMatrix).invert();
  });

  return null;
}

/** Fullscreen sky — rendered as a screen-space quad behind everything */
function FullscreenSky() {
  const { size } = useThree();

  const skyTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(
      "/sky.jpg",
      undefined,
      undefined,
      (err) => { console.error("Failed to load sky texture:", err); }
    );
    tex.colorSpace = THREE.LinearSRGBColorSpace; // Keep raw colors — no linearization
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, []);

  // Image aspect ratio — the sky photo is landscape (~1.5:1)
  // We'll update this once the texture loads
  const imageAspectRef = useRef(1.5);
  useMemo(() => {
    skyTexture.image && (imageAspectRef.current = skyTexture.image.width / skyTexture.image.height);
  }, [skyTexture]);

  const skyUniforms = useMemo(
    () => ({
      uSkyTexture: { value: skyTexture },
      uImageAspect: { value: imageAspectRef.current },
      uScreenAspect: { value: size.width / size.height },
    }),
    [skyTexture]
  );

  // Keep screen aspect up to date
  useFrame(() => {
    skyUniforms.uScreenAspect.value = size.width / size.height;
    // Update image aspect if texture has loaded
    if (skyTexture.image) {
      skyUniforms.uImageAspect.value = skyTexture.image.width / skyTexture.image.height;
    }
  });

  // Fullscreen quad geometry: 2 triangles covering clip space -1..1
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
       1,  1, 0,
      -1, -1, 0,
       1,  1, 0,
      -1,  1, 0,
    ]);
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 0,
      1, 1,
      0, 1,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} renderOrder={-1000} frustumCulled={false}>
      <shaderMaterial
        vertexShader={skyFullscreenVertexShader}
        fragmentShader={skyFullscreenFragmentShader}
        uniforms={skyUniforms}
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GrassField() {
  const meshRef = useRef<THREE.Mesh>(null);

  const grassUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWindStrength: { value: 1.2 },
      uBaseColor: { value: new THREE.Color("#2e5a28") },  // Deep green with warm undertone
      uTipColor: { value: new THREE.Color("#8fb87a") },   // Soft sage with golden warmth
      uShadowColor: { value: new THREE.Color("#1f3a2a") }, // Cool blue-green shadow
      uFadeNear: { value: FOG_NEAR },
      uFadeFar: { value: FOG_FAR },
      uCameraPos: { value: CAMERA_POS.clone() },
    }),
    []
  );

  // Wide & deep field so edges are never visible
  const grassGeometry = useMemo(
    () => createGrassGeometry(50000, 250, 60, 1.4, 0.6, 0.07),
    []
  );

  useFrame(({ clock }) => {
    grassUniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh ref={meshRef} geometry={grassGeometry} position={[0, -2.0, -18]}>
      <shaderMaterial
        vertexShader={grassVertexShader}
        fragmentShader={grassFragmentShader}
        uniforms={grassUniforms}
        side={THREE.DoubleSide}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
}

function Ground() {
  const groundUniforms = useMemo(
    () => ({
      uGroundColor: { value: new THREE.Color("#3d6b45") }, // Muted dusk green
      uCameraPos: { value: CAMERA_POS.clone() },
      uFadeNear: { value: FOG_NEAR },
      uFadeFar: { value: FOG_FAR },
    }),
    []
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.01, -18]}>
      <planeGeometry args={[200, 200]} />
      <shaderMaterial
        vertexShader={groundVertexShader}
        fragmentShader={groundFragmentShader}
        uniforms={groundUniforms}
        side={THREE.DoubleSide}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
}

function Scene() {
  // Set the clear color to match sky texture horizon so no black shows
  const { gl } = useThree();
  useMemo(() => {
    gl.setClearColor(new THREE.Color(0.55, 0.60, 0.70), 0);
  }, [gl]);

  return (
    <>
      <CameraController />
      <FullscreenSky />
      <Ground />
      <GrassField />
    </>
  );
}

// ─── Main exported component ────────────────────────────────────────────

interface GrassBackgroundProps {
  className?: string;
}

export default function GrassBackground({ className }: GrassBackgroundProps) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        borderRadius: "inherit",
        overflow: "hidden",
        background: "linear-gradient(180deg, #3a4a5c 0%, #2e5a28 60%, #1f3a2a 100%)",
      }}
    >
      <Canvas
        camera={{
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        dpr={1}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
