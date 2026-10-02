import {
  BookOpen,
  ClipboardList,
  FileClock,
  Home,
  LineChart,
  Network,
  PawPrint,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppRoute = {
  path: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const routes: AppRoute[] = [
  { path: "/home", label: "Inicio", icon: Home },
  { path: "/owners", label: "Propietarios", icon: Users },
  { path: "/patients", label: "Pacientes", icon: PawPrint },
  { path: "/evaluations", label: "Evaluaciones", icon: ClipboardList },
  { path: "/results", label: "Resultados", icon: LineChart },
  { path: "/history", label: "Historial clinico", icon: FileClock },
  { path: "/knowledge", label: "Base de conocimiento", icon: BookOpen },
  { path: "/rules", label: "Reglas IF-THEN", icon: Network, adminOnly: true },
  { path: "/settings", label: "Configuracion", icon: Settings },
];
