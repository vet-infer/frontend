import type { LucideIcon } from "lucide-react";

export type RiskLevel = "low" | "moderate" | "high";

export type SummaryCard = {
  label: string;
  value: string;
  change: string;
  tone: "primary" | "danger";
  icon: LucideIcon;
};

export type WeekRange = {
  start: Date;
  end: Date;
};

export type DashboardScope = "general" | "weekly";

export type RecentEvaluation = {
  id: number;
  patient: string;
  speciesBreed: string;
  date: string;
  result: string;
  risk: RiskLevel;
};

export type RecentPatient = {
  id: number;
  patient: string;
  speciesBreed: string;
  owner: string;
  lastEvaluation: string;
};

export type DashboardData = {
  recentEvaluations: RecentEvaluation[];
  recentPatients: RecentPatient[];
};


