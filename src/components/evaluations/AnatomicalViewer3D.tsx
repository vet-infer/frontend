import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Group } from "three";
import type { AnatomicalRegion } from "../../types/evaluation";

type AnatomicalViewer3DProps = {
  species: string;
  riskLevel: string;
  regions: AnatomicalRegion[];
  secondaryRegions?: AnatomicalRegion[];
};

const BASE_COLOR = "#c4b5fd";

function riskColor(riskLevel: string) {
  const risk = riskLevel.toLowerCase();
  if (risk.includes("alto")) return "#dc2626";
  if (risk.includes("moder")) return "#d97706";
  return "#ca8a04";
}

function mixColor(hex: string, ratio: number) {
  const base = parseInt(BASE_COLOR.slice(1), 16);
  const target = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const b = (base >> shift) & 0xff;
    const t = (target >> shift) & 0xff;
    return Math.round(b + (t - b) * ratio);
  };
  const r = channel(16);
  const g = channel(8);
  const b = channel(0);
  return `rgb(${r}, ${g}, ${b})`;
}

function isCat(species: string) {
  return species.toLowerCase().startsWith("gat");
}

function meshNamesFor(list: AnatomicalRegion[], species: string) {
  const cat = isCat(species);
  return new Set(
    list.map((region) => (cat ? region.mesh_name_cat : region.mesh_name_dog)).filter((name): name is string => Boolean(name)),
  );
}

function partColor(meshName: string, primary: Set<string>, secondary: Set<string>, highlight: string) {
  if (primary.has("body") || primary.has(meshName)) return highlight;
  if (secondary.has("body") || secondary.has(meshName)) return mixColor(highlight, 0.45);
  return BASE_COLOR;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function CameraControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enablePan = false;
    controls.minDistance = 2.2;
    controls.maxDistance = 5;
    controlsRef.current = controls;
    return () => controls.dispose();
  }, [camera, gl]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}

function Creature({
  species,
  primary,
  secondary,
  highlight,
}: {
  species: string;
  primary: Set<string>;
  secondary: Set<string>;
  highlight: string;
}) {
  const cat = isCat(species);
  const groupRef = useRef<Group>(null);
  const animate = useMemo(() => !prefersReducedMotion(), []);

  useFrame(({ clock }) => {
    if (!animate || !groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(t * 0.35) * 0.15;
    groupRef.current.position.y = -0.2 + Math.sin(t * 1.2) * 0.015;
  });

  const color = (meshName: string) => partColor(meshName, primary, secondary, highlight);
  const material = (meshName: string) => (
    <meshStandardMaterial color={color(meshName)} roughness={0.55} metalness={0.05} />
  );
  const plainMaterial = <meshStandardMaterial color={BASE_COLOR} roughness={0.55} metalness={0.05} />;

  return (
    <group position={[0, -0.2, 0]} ref={groupRef}>
      {/* torso: chest (front) + abdomen (back), rounded capsules instead of boxes */}
      <mesh position={[0.5, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.35, 0.55, 6, 16]} />
        {material("chest")}
      </mesh>
      <mesh position={[-0.6, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.33, 0.55, 6, 16]} />
        {material("abdomen")}
      </mesh>

      {/* head + mouth */}
      <mesh position={[1.35, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.42, 32, 32]} />
        {material("head")}
      </mesh>
      <mesh position={[1.78, 0.82, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.11, 0.2, 4, 12]} />
        {material("head_mouth")}
      </mesh>

      {/* ears */}
      <mesh position={[1.2, 1.3, 0.22]} rotation={[0, 0, cat ? -0.3 : 0.5]} castShadow>
        {cat ? <coneGeometry args={[0.14, 0.3, 12]} /> : <capsuleGeometry args={[0.06, 0.2, 4, 10]} />}
        {plainMaterial}
      </mesh>
      <mesh position={[1.2, 1.3, -0.22]} rotation={[0, 0, cat ? -0.3 : -0.5]} castShadow>
        {cat ? <coneGeometry args={[0.14, 0.3, 12]} /> : <capsuleGeometry args={[0.06, 0.2, 4, 10]} />}
        {plainMaterial}
      </mesh>

      {/* legs */}
      {[
        [1.0, 0.0, 0.25],
        [1.0, 0.0, -0.25],
        [-1.0, 0.0, 0.25],
        [-1.0, 0.0, -0.25],
      ].map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, y, z]} castShadow>
          <capsuleGeometry args={[0.09, 0.4, 4, 12]} />
          {plainMaterial}
        </mesh>
      ))}

      {/* tail: tapered, smoother segments */}
      <mesh position={[-1.35, cat ? 1.0 : 0.55, 0]} rotation={[0, 0, cat ? 0.9 : 0.3]} castShadow>
        <cylinderGeometry args={[0.06, 0.025, cat ? 0.9 : 0.6, 16]} />
        {plainMaterial}
      </mesh>
    </group>
  );
}

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function supportsWebGL() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function ViewerFallback() {
  return (
    <div className="flex h-72 w-full items-center justify-center bg-slate-50 text-sm text-slate-500 sm:h-80">
      Vista 3D no disponible en este navegador.
    </div>
  );
}

export function AnatomicalViewer3D({ species, riskLevel, regions, secondaryRegions = [] }: AnatomicalViewer3DProps) {
  const [webglOk] = useState(supportsWebGL);
  const highlight = useMemo(() => riskColor(riskLevel), [riskLevel]);

  const primary = useMemo(() => meshNamesFor(regions, species), [regions, species]);
  const secondary = useMemo(() => meshNamesFor(secondaryRegions, species), [secondaryRegions, species]);

  const regionLabels = useMemo(() => Array.from(new Set(regions.map((region) => region.name))), [regions]);
  const secondaryLabels = useMemo(
    () => Array.from(new Set(secondaryRegions.map((region) => region.name))),
    [secondaryRegions],
  );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="h-72 w-full sm:h-80">
        {webglOk ? (
          <WebGLErrorBoundary fallback={<ViewerFallback />}>
            <Canvas camera={{ position: [2.6, 1.8, 2.6], fov: 45 }} shadows>
              <color attach="background" args={["#f8fafc"]} />
              <ambientLight intensity={0.55} />
              <directionalLight
                castShadow
                intensity={1.2}
                position={[3, 4, 2]}
                shadow-mapSize={[1024, 1024]}
              />
              <directionalLight intensity={0.35} position={[-3, 1.5, -2]} />
              <Suspense fallback={null}>
                <Creature species={species} primary={primary} secondary={secondary} highlight={highlight} />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                  <planeGeometry args={[6, 6]} />
                  <shadowMaterial transparent opacity={0.22} />
                </mesh>
              </Suspense>
              <CameraControls />
            </Canvas>
          </WebGLErrorBoundary>
        ) : (
          <ViewerFallback />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm">
        <span className="font-semibold text-slate-600">Zona afectada:</span>
        {regionLabels.length === 0 ? (
          <span className="text-slate-400">No definida para esta enfermedad.</span>
        ) : (
          regionLabels.map((label) => (
            <span key={label} className="rounded-full bg-red-50 px-3 py-1 font-bold text-red-700">
              {label}
            </span>
          ))
        )}
        {secondaryLabels.map((label) => (
          <span key={label} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-500">
            {label} (secundaria)
          </span>
        ))}
      </div>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
        Modelo 3D genérico ilustrativo, no representa anatomía real del paciente.
      </p>
    </div>
  );
}
