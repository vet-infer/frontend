import { CalendarDays, Eye, LayoutDashboard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Cell, Legend, Bar, BarChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { DataTable } from "../../components/common/DataTable";
import { IconBadge } from "../../components/common/IconBadge";
import { StatusBadge } from "../../components/common/StatusBadge";
import { dashboardService } from "../../services/dashboard.service";
import type { DashboardData, DashboardScope, RecentEvaluation, RecentPatient, SummaryCard, WeekRange } from "../../types/dashboard";

const initialDashboard: DashboardData = {
  recentEvaluations: [],
  recentPatients: [],
};

const RISK_COLORS = {
  high: "#EF4444",
  moderate: "#F59E0B",
  low: "#10B981",
};

export function DashboardPage() {
  const { selectedWeek } = useOutletContext<{ selectedWeek: WeekRange }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryCard[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData>(initialDashboard);
  const [scope, setScope] = useState<DashboardScope>("general");
  const [isWeeklyFallback, setIsWeeklyFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      const requestedWeek = scope === "weekly" ? selectedWeek : undefined;
      const [summaryData, dashboardData] = await Promise.all([
        dashboardService.getSummary(requestedWeek),
        dashboardService.getDashboard(requestedWeek),
      ]);
      const shouldUseGeneralFallback = scope === "weekly" && dashboardData.recentEvaluations.length === 0;
      const [effectiveSummary, effectiveDashboard] = shouldUseGeneralFallback
        ? await Promise.all([dashboardService.getSummary(), dashboardService.getDashboard()])
        : [summaryData, dashboardData];

      if (isMounted) {
        setSummary(effectiveSummary);
        setDashboard(effectiveDashboard);
        setIsWeeklyFallback(shouldUseGeneralFallback);
        setIsLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [scope, selectedWeek]);

  const riskDistributionData = useMemo(() => {
    const counts = { low: 0, moderate: 0, high: 0 };

    dashboard.recentEvaluations.forEach((evalItem) => {
      if (evalItem.risk in counts) {
        counts[evalItem.risk as keyof typeof counts] += 1;
      }
    });

    return [
      { name: "Riesgo Alto", value: counts.high, color: RISK_COLORS.high },
      { name: "Riesgo Moderado", value: counts.moderate, color: RISK_COLORS.moderate },
      { name: "Riesgo Bajo", value: counts.low, color: RISK_COLORS.low },
    ].filter((item) => item.value > 0);
  }, [dashboard.recentEvaluations]);

  const diseasePrevalenceData = useMemo(() => {
    const prevalence: Record<string, number> = {};

    dashboard.recentEvaluations.forEach((evalItem) => {
      if (evalItem.result && evalItem.result !== "Pendiente de inferencia") {
        prevalence[evalItem.result] = (prevalence[evalItem.result] ?? 0) + 1;
      }
    });

    return Object.entries(prevalence)
      .map(([name, value]) => ({ name, Casos: value }))
      .sort((a, b) => b.Casos - a.Casos)
      .slice(0, 5);
  }, [dashboard.recentEvaluations]);

  const scopeDescription = isWeeklyFallback
    ? "La semana seleccionada no registra evaluaciones; se muestran indicadores generales."
    : scope === "weekly"
      ? "Indicadores calculados con las evaluaciones de la semana seleccionada."
      : "Indicadores generales acumulados con la informacion clinica registrada.";

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#172554]">Alcance del dashboard</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{scopeDescription}</p>
        </div>
        <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto">
          <Button
            className="min-h-9 flex-1 rounded-md px-3 text-xs sm:flex-none"
            icon={<LayoutDashboard size={16} />}
            onClick={() => setScope("general")}
            type="button"
            variant={scope === "general" ? "primary" : "ghost"}
          >
            General
          </Button>
          <Button
            className="min-h-9 flex-1 rounded-md px-3 text-xs sm:flex-none"
            icon={<CalendarDays size={16} />}
            onClick={() => setScope("weekly")}
            type="button"
            variant={scope === "weekly" ? "primary" : "ghost"}
          >
            Semanal
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;
          const isDanger = item.tone === "danger";

          return (
            <Card className="p-4" key={item.label}>
              <div className="flex items-center gap-4">
                <IconBadge
                  className="h-14 w-14 shrink-0"
                  icon={Icon}
                  iconSize={24}
                  iconStrokeWidth={1.9}
                  tone={isDanger ? "danger" : "brand"}
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-5 text-[#172554]">{item.label}</h3>
                  <p className="mt-1 text-2xl font-extrabold leading-none text-brand-500">{item.value}</p>
                  <p className={isDanger ? "mt-1 text-xs font-semibold text-red-500" : "mt-1 text-xs font-semibold text-emerald-600"}>
                    {item.change}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#172554]">Distribucion de Riesgo Clinico</h3>
            <p className="text-xs font-medium text-slate-500">Severidad de los casos clinicos procesados por el motor</p>
          </div>
          <div className="h-64">
            {riskDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                    {riskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#FFF", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px", fontWeight: "bold" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: "600" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartMessage message="Sin evaluaciones procesadas para calcular distribucion de riesgo." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#172554]">Top Enfermedades Inferidas</h3>
            <p className="text-xs font-medium text-slate-500">Patologias con mayor frecuencia de diagnostico</p>
          </div>
          <div className="h-64">
            {diseasePrevalenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diseasePrevalenceData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={140}
                    style={{ fontSize: "11px", fontWeight: "bold", fill: "#334155" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F8FAFC" }}
                    contentStyle={{ background: "#FFF", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px", fontWeight: "bold" }}
                  />
                  <Bar dataKey="Casos" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartMessage message="Sin diagnosticos inferidos para calcular prevalencia." />
            )}
          </div>
        </Card>
      </section>

      {isLoading ? <Card className="p-6 text-sm font-semibold text-slate-500">Cargando resumen clinico...</Card> : null}

      <section className="grid gap-5 2xl:grid-cols-2">
        <Card>
          <PanelHeader title="Ultimas evaluaciones clinicas" to="/evaluations" />
          <DataTable
            compact
            columns={["Paciente", "Especie / Raza", "Fecha", "Resultado", "Riesgo", "Accion"]}
            emptyMessage="Aun no hay evaluaciones clinicas registradas."
            rows={dashboard.recentEvaluations}
            renderRow={(row: RecentEvaluation) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-700">{row.patient}</td>
                <td className="max-w-[150px] truncate px-3 py-3">{row.speciesBreed}</td>
                <td className="whitespace-nowrap px-3 py-3">{row.date}</td>
                <td className="max-w-[180px] truncate px-3 py-3">{row.result}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <StatusBadge risk={row.risk} />
                </td>
                <td className="px-3 py-3">
                  <Button
                    aria-label={`Ver resultado de ${row.patient}`}
                    className="h-8 w-8 p-0"
                    onClick={() => navigate(`/results?evaluationId=${row.id}`)}
                    type="button"
                    variant="secondary"
                  >
                    <Eye size={15} />
                  </Button>
                </td>
              </tr>
            )}
          />
        </Card>

        <Card>
          <PanelHeader title="Pacientes recientes" to="/patients" />
          <DataTable
            compact
            columns={["Paciente", "Especie / Raza", "Propietario", "Ult. evaluacion", "Accion"]}
            emptyMessage="Aun no hay pacientes registrados."
            rows={dashboard.recentPatients}
            renderRow={(row: RecentPatient) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-700">{row.patient}</td>
                <td className="max-w-[150px] truncate px-3 py-3">{row.speciesBreed}</td>
                <td className="max-w-[140px] truncate px-3 py-3">{row.owner}</td>
                <td className="whitespace-nowrap px-3 py-3">{row.lastEvaluation}</td>
                <td className="px-3 py-3">
                  <Button className="h-8 px-3 text-xs" onClick={() => navigate(`/patients/${row.id}`)} type="button" variant="secondary">
                    Ver detalle
                  </Button>
                </td>
              </tr>
            )}
          />
        </Card>
      </section>
    </div>
  );
}

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function PanelHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
      <h2 className="text-base font-bold text-[#172554]">{title}</h2>
      <Link className="text-sm font-bold text-brand-500 hover:text-brand-700" to={to}>
        Ver todas
      </Link>
    </div>
  );
}
