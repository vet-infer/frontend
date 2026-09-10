import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { AnatomicalRegion } from "../../types/evaluation";

type AnatomicalViewer3DProps = {
  species: string;
  regions: AnatomicalRegion[];
};

const HIGHLIGHT_COLOR = "#dc2626";
const BASE_COLOR = "#c4b5fd";

function isCat(species: string) {
  return species.toLowerCase().startsWith("gat");
}

function partColor(meshName: string, highlighted: Set<string>) {
  if (highlighted.has("body") || highlighted.has(meshName)) return HIGHLIGHT_COLOR;
  return BASE_COLOR;
}

function Creature({ species, highlighted }: { species: string; highlighted: Set<string> }) {
  const cat = isCat(species);

  return (
    <group position={[0, -0.2, 0]}>
      {/* torso: chest (front) + abdomen (back) */}
      <mesh position={[0.5, 0.6, 0]} castShadow>
        <boxGeometry args={[1.1, 0.7, 0.7]} />
        <meshStandardMaterial color={partColor("chest", highlighted)} />
      </mesh>
      <mesh position={[-0.6, 0.6, 0]} castShadow>
        <boxGeometry args={[1.1, 0.65, 0.65]} />
        <meshStandardMaterial color={partColor("abdomen", highlighted)} />
      </mesh>

      {/* head + mouth */}
      <mesh position={[1.35, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshStandardMaterial color={partColor("head", highlighted)} />
      </mesh>
      <mesh position={[1.75, 0.82, 0]} castShadow>
        <boxGeometry args={[0.4, 0.22, 0.3]} />
        <meshStandardMaterial color={partColor("head_mouth", highlighted)} />
      </mesh>

      {/* ears */}
      <mesh position={[1.2, 1.3, 0.22]} rotation={[0, 0, cat ? -0.3 : 0.5]} castShadow>
        {cat ? <coneGeometry args={[0.14, 0.3, 4]} /> : <boxGeometry args={[0.12, 0.32, 0.05]} />}
        <meshStandardMaterial color={BASE_COLOR} />
      </mesh>
      <mesh position={[1.2, 1.3, -0.22]} rotation={[0, 0, cat ? -0.3 : -0.5]} castShadow>
        {cat ? <coneGeometry args={[0.14, 0.3, 4]} /> : <boxGeometry args={[0.12, 0.32, 0.05]} />}
        <meshStandardMaterial color={BASE_COLOR} />
      </mesh>

      {/* legs */}
      {[
        [1.0, 0.0, 0.25],
        [1.0, 0.0, -0.25],
        [-1.0, 0.0, 0.25],
        [-1.0, 0.0, -0.25],
      ].map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, y, z]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.55, 12]} />
          <meshStandardMaterial color={BASE_COLOR} />
        </mesh>
      ))}

      {/* tail */}
      <mesh position={[-1.35, cat ? 1.0 : 0.55, 0]} rotation={[0, 0, cat ? 0.9 : 0.3]} castShadow>
        <cylinderGeometry args={[0.06, 0.03, cat ? 0.9 : 0.6, 10]} />
        <meshStandardMaterial color={BASE_COLOR} />
      </mesh>
    </group>
  );
}

export function AnatomicalViewer3D({ species, regions }: AnatomicalViewer3DProps) {
  const highlighted = useMemo(() => {
    const cat = isCat(species);
    const names = regions
      .map((region) => (cat ? region.mesh_name_cat : region.mesh_name_dog))
      .filter((name): name is string => Boolean(name));
    return new Set(names);
  }, [regions, species]);

  const regionLabels = useMemo(
    () => Array.from(new Set(regions.map((region) => region.name))),
    [regions],
  );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="h-72 w-full sm:h-80">
        <Canvas camera={{ position: [2.6, 1.8, 2.6], fov: 45 }} shadows>
          <ambientLight intensity={0.7} />
          <directionalLight castShadow intensity={1.1} position={[3, 4, 2]} />
          <Suspense fallback={null}>
            <Creature species={species} highlighted={highlighted} />
          </Suspense>
          <OrbitControls enablePan={false} minDistance={2.2} maxDistance={5} />
        </Canvas>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm">
        <span className="font-semibold text-slate-600">Zona afectada:</span>
        {regionLabels.length === 0 ? (
          <span className="text-slate-400">No definida para esta enfermedad.</span>
        ) : (
          regionLabels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-red-50 px-3 py-1 font-bold text-red-700"
            >
              {label}
            </span>
          ))
        )}
      </div>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
        Modelo 3D genérico ilustrativo, no representa anatomía real del paciente.
      </p>
    </div>
  );
}
