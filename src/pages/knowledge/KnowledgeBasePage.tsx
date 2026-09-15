import {
  Activity,
  AlertTriangle,
  BookOpen,
  Cat,
  Check,
  ChevronRight,
  CircleDot,
  Dog,
  FlaskConical,
  Info,
  Network,
  Search,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Card } from "../../components/common/Card";
import { DataTable } from "../../components/common/DataTable";
import { IconBadge } from "../../components/common/IconBadge";
import { Skeleton } from "../../components/common/Skeleton";
import { knowledgeService } from "../../services/knowledge.service";
import { useAuth } from "../../hooks/useAuth";
import type { ClinicalVariable, CatalogItem } from "../../types/evaluation";
import type { Disease, KnowledgeBaseData, KnowledgeTab, RiskLevel, Rule } from "../../types/knowledge";
import { cn } from "../../utils/cn";
import { getErrorMessage } from "../../utils/errors";

type SpeciesFilter = "all" | "dog" | "cat";

const tabs: { id: KnowledgeTab; label: string }[] = [
  { id: "diseases", label: "Enfermedades" },
  { id: "symptoms", label: "Sintomas" },
  { id: "variables", label: "Variables clinicas" },
  { id: "rules", label: "Reglas IF-THEN" },
  { id: "risk", label: "Niveles de riesgo" },
];

function speciesName(speciesId?: number | null) {
  if (speciesId === 1) {
    return "Perro";
  }

  if (speciesId === 2) {
    return "Gato";
  }

  return "General";
}

function matchesSpecies(speciesId: number | null | undefined, filter: SpeciesFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "dog") {
    return speciesId === 1;
  }

  return speciesId === 2;
}

function riskTone(codeOrName: string) {
  const value = codeOrName.toLowerCase();

  if (value.includes("alto")) {
    return {
      className: "bg-red-50 text-red-700",
      iconClassName: "bg-red-600 text-white",
      label: "Rojo",
    };
  }

  if (value.includes("moder")) {
    return {
      className: "bg-amber-50 text-amber-700",
      iconClassName: "bg-amber-500 text-white",
      label: "Naranja",
    };
  }

  return {
    className: "bg-emerald-50 text-emerald-700",
    iconClassName: "bg-emerald-600 text-white",
    label: "Verde",
  };
}

function probabilityRange(risk: RiskLevel) {
  const min = risk.min_probability == null ? null : Math.round(risk.min_probability * 100);
  const max = risk.max_probability == null ? null : Math.round(risk.max_probability * 100);

  if (min == null || max == null) {
    return "Sin rango";
  }

  return `${min} - ${max} %`;
}

function conditionText(rule: Rule) {
  const groups = new Map<number, string[]>();
  rule.conditions.forEach((condition) => {
    const text = `${condition.variable_key} ${condition.operator} ${String(condition.expected_value)}`;
    const group = condition.logical_group ?? 1;
    groups.set(group, [...(groups.get(group) ?? []), text]);
  });
  return [...groups.values()].map((conditions) => `(${conditions.join(" AND ")})`).join(" OR ");
}

function variableRange(variable: ClinicalVariable) {
  if (variable.normal_min == null && variable.normal_max == null) {
    return variable.unit || "Cualitativa";
  }

  return `${variable.normal_min ?? "-"} - ${variable.normal_max ?? "-"}${variable.unit ? ` ${variable.unit}` : ""}`;
}

export function KnowledgeBasePage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<KnowledgeBaseData | null>(null);
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("diseases");
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadKnowledgeBase() {
      setIsLoading(true);
      setError("");

      try {
        const result = await knowledgeService.getKnowledgeBase(isAdmin);

        if (isMounted) {
          setData(result);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, "No fue posible cargar la base de conocimiento."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadKnowledgeBase();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [activeTab, query, speciesFilter]);

  const filteredDiseases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (data?.diseases ?? [])
      .filter(
        (disease) =>
          matchesSpecies(disease.species_id, speciesFilter) &&
          (!normalizedQuery ||
            [disease.name, disease.description, speciesName(disease.species_id)]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(normalizedQuery)))
      )
      .sort((left, right) => {
        const leftRules = (data?.rules ?? []).filter((rule) => rule.is_active && rule.disease_id === left.id).length;
        const rightRules = (data?.rules ?? []).filter((rule) => rule.is_active && rule.disease_id === right.id).length;
        return rightRules - leftRules || left.species_id - right.species_id || left.name.localeCompare(right.name);
      });
  }, [data?.diseases, data?.rules, query, speciesFilter]);

  const filteredSymptoms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (data?.symptoms ?? []).filter(
      (symptom) =>
        matchesSpecies(symptom.species_id, speciesFilter) &&
        (!normalizedQuery ||
          [symptom.name, symptom.description, speciesName(symptom.species_id)]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery)))
    );
  }, [data?.symptoms, query, speciesFilter]);

  const filteredVariables = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (data?.clinicalVariables ?? []).filter(
      (variable) =>
        matchesSpecies(variable.species_id, speciesFilter) &&
        (!normalizedQuery ||
          [variable.name, variable.key, variable.unit, speciesName(variable.species_id)]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery)))
    );
  }, [data?.clinicalVariables, query, speciesFilter]);

  const filteredRules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const diseaseIds = new Set(filteredDiseases.map((disease) => disease.id));

    return (data?.rules ?? []).filter(
      (rule) =>
        (speciesFilter === "all" || diseaseIds.has(rule.disease_id)) &&
        (!normalizedQuery ||
          [rule.code, rule.name, rule.risk_level, conditionText(rule)]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery)))
    );
  }, [data?.rules, filteredDiseases, query, speciesFilter]);

  const riskLevels = data?.riskLevels ?? [];
  const stats = {
    diseases: data?.diseases.length ?? 0,
    variables: data?.clinicalVariables.length ?? 0,
    activeRules: data?.rules.filter((rule) => rule.is_active).length ?? 0,
    inactiveRules: data?.rules.filter((rule) => !rule.is_active).length ?? 0,
  };

  const selectedDisease = filteredDiseases[selectedIndex];
  const selectedVariable = filteredVariables[selectedIndex];
  const selectedRule = filteredRules[selectedIndex];
  const selectedRisk = riskLevels[selectedIndex] ?? riskLevels[0];

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">Base de conocimiento</h1>
          <p className="mt-2 text-base text-slate-500">
            Consulta enfermedades, variables clinicas y reglas utilizadas por el motor de inferencia.
          </p>
          <div className="mt-6 flex flex-col gap-3 lg:flex-row">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={21} />
              <input
                className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por enfermedad, regla o variable clinica..."
                value={query}
              />
            </label>
            <SpeciesButton active={speciesFilter === "all"} label="Todos" onClick={() => setSpeciesFilter("all")} />
            <SpeciesButton active={speciesFilter === "dog"} icon={Dog} label="Perro" onClick={() => setSpeciesFilter("dog")} />
            <SpeciesButton active={speciesFilter === "cat"} icon={Cat} label="Gato" onClick={() => setSpeciesFilter("cat")} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={BookOpen} label="Enfermedades consideradas" value={stats.diseases} />
          <StatCard icon={Activity} label="Variables clinicas" value={stats.variables} tone="green" />
          <StatCard icon={Network} label="Reglas activas" value={stats.activeRules} />
          <StatCard icon={CircleDot} label="Reglas inactivas" value={stats.inactiveRules} tone="orange" />
        </div>
      </section>

      {error ? <AlertMessage message={error} tone="error" onClose={() => setError("")} /> : null}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-5">
          {tabs.filter((tab) => isAdmin || tab.id !== "rules").map((tab) => (
            <button
              className={cn(
                "min-h-14 border-b-2 px-4 text-sm font-bold transition",
                activeTab === tab.id
                  ? "border-brand-500 text-brand-500"
                  : "border-transparent text-slate-500 hover:bg-violet-50 hover:text-brand-700"
              )}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          {activeTab === "diseases" ? (
            <KnowledgeSplit
              empty={filteredDiseases.length === 0}
              listTitle="Enfermedades consideradas"
              left={
                <>
                  {filteredDiseases.map((disease, index) => (
                    <ListButton active={index === selectedIndex} key={disease.id} onClick={() => setSelectedIndex(index)}>
                      <IconBadge className="h-14 w-14" icon={Stethoscope} iconSize={27} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-[#172554]">{disease.name}</span>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">
                          {speciesName(disease.species_id)} / {filteredSymptoms.filter((item) => item.species_id === disease.species_id).length} sintomas / {(() => {
                            const count = filteredRules.filter((rule) => rule.is_active && rule.disease_id === disease.id).length;
                            return count ? `${count} reglas IF-THEN` : "Perfil Bayes sin regla directa";
                          })()}
                        </span>
                      </span>
                    </ListButton>
                  ))}
                </>
              }
              right={selectedDisease ? <DiseaseDetail disease={selectedDisease} rules={data?.rules ?? []} symptoms={data?.symptoms ?? []} variables={data?.clinicalVariables ?? []} /> : null}
            />
          ) : null}

          {activeTab === "symptoms" ? (
            <Card className="p-6">
              <h2 className="mb-5 text-xl font-extrabold text-[#172554]">Catalogo de sintomas</h2>
              <DataTable
                columns={["Sintoma", "Especie", "Descripcion", "Estado"]}
                rows={filteredSymptoms}
                renderRow={(symptom: CatalogItem) => (
                  <tr key={symptom.id}>
                    <td className="px-5 py-4 font-bold text-slate-700">{symptom.name}</td>
                    <td className="px-5 py-4">{speciesName(symptom.species_id)}</td>
                    <td className="px-5 py-4">{symptom.description || "Sintoma usado como evidencia clinica."}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Activo</span>
                    </td>
                  </tr>
                )}
              />
            </Card>
          ) : null}

          {activeTab === "variables" ? (
            <KnowledgeSplit
              empty={filteredVariables.length === 0}
              listTitle="Variables clinicas consideradas"
              left={
                <>
                  {filteredVariables.map((variable, index) => (
                    <ListButton active={index === selectedIndex} key={variable.id} onClick={() => setSelectedIndex(index)}>
                      <IconBadge className="h-14 w-14" icon={FlaskConical} iconSize={27} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-[#172554]">{variable.name}</span>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">
                          {variable.data_type} Â· {speciesName(variable.species_id)} Â· {variableRange(variable)}
                        </span>
                      </span>
                    </ListButton>
                  ))}
                </>
              }
              right={selectedVariable ? <VariableDetail variable={selectedVariable} rules={data?.rules ?? []} /> : null}
            />
          ) : null}

          {activeTab === "rules" ? (
            <KnowledgeSplit
              empty={filteredRules.length === 0}
              listTitle="Reglas IF-THEN consideradas"
              left={
                <>
                  {filteredRules.map((rule, index) => (
                    <ListButton active={index === selectedIndex} key={rule.id} onClick={() => setSelectedIndex(index)}>
                      <IconBadge className="h-14 w-14" icon={Network} iconSize={27} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-[#172554]">
                          {rule.code} - {rule.name}
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">
                          {rule.conditions.length} condiciones Â· {rule.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </span>
                    </ListButton>
                  ))}
                </>
              }
              right={selectedRule ? <RuleDetail rule={selectedRule} diseases={data?.diseases ?? []} /> : null}
            />
          ) : null}

          {activeTab === "risk" ? (
            <RiskLevelsView riskLevels={riskLevels} selectedRisk={selectedRisk} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} />
          ) : null}
        </>
      )}
    </div>
  );
}

function SpeciesButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: typeof Dog;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition",
        active ? "bg-brand-500 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-violet-50"
      )}
      onClick={onClick}
      type="button"
    >
      {Icon ? <Icon size={18} /> : null}
      {label}
    </button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "violet",
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  tone?: "violet" | "green" | "orange";
}) {
  const tones = {
    violet: "bg-violet-50 text-brand-500",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-full", tones[tone])}>
          <Icon size={26} />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-extrabold text-[#172554]">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function KnowledgeSplit({
  empty,
  listTitle,
  left,
  right,
}: {
  empty: boolean;
  listTitle: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  if (empty) {
    return (
      <Card className="grid min-h-72 place-items-center p-8 text-center">
        <div>
          <BookOpen className="mx-auto text-brand-500" size={34} />
          <h2 className="mt-4 text-xl font-extrabold text-[#172554]">Sin informacion para mostrar</h2>
          <p className="mt-2 text-sm text-slate-500">Ajusta la busqueda o el filtro de especie.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid xl:grid-cols-[0.47fr_1fr]">
        <aside className="border-b border-slate-100 p-5 xl:border-b-0 xl:border-r">
          <h2 className="mb-5 text-xl font-extrabold text-[#172554]">{listTitle}</h2>
          <div className="space-y-3">{left}</div>
        </aside>
        <section className="p-6">{right}</section>
      </div>
    </Card>
  );
}

function ListButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition",
        active ? "border-[#635BFF] bg-violet-50/40" : "border-slate-100 bg-white hover:bg-slate-50"
      )}
      onClick={onClick}
      type="button"
    >
      {children}
      <ChevronRight className="shrink-0 text-slate-400" size={20} />
    </button>
  );
}

function DiseaseDetail({
  disease,
  rules,
  symptoms,
  variables,
}: {
  disease: Disease;
  rules: Rule[];
  symptoms: CatalogItem[];
  variables: ClinicalVariable[];
}) {
  const relatedRules = rules.filter((rule) => rule.disease_id === disease.id);
  const relatedSymptoms = symptoms.filter((symptom) => symptom.species_id === disease.species_id).slice(0, 6);
  const relatedVariables = variables.filter((variable) => variable.species_id === disease.species_id).slice(0, 6);

  return (
    <div>
      <DetailHeader icon={Stethoscope} title={disease.name} badges={[speciesName(disease.species_id)]} subtitle={disease.description ?? "Enfermedad considerada por el motor de inferencia clinica."} />
      <TagSection items={relatedSymptoms.map((item) => item.name)} title="Sintomas principales" />
      <TagSection items={relatedVariables.map((item) => item.name)} title="Variables clinicas asociadas" />
      <h3 className="mb-3 text-lg font-extrabold text-[#172554]">Reglas IF-THEN relacionadas</h3>
      <DataTable
        columns={["Regla", "Condicion resumida", "Riesgo", "Estado"]}
        rows={relatedRules}
        renderRow={(rule) => (
          <tr key={rule.id}>
            <td className="px-5 py-3 font-bold text-slate-700">{rule.code}</td>
            <td className="px-5 py-3">{conditionText(rule)}</td>
            <td className="px-5 py-3">{rule.risk_level}</td>
            <td className="px-5 py-3">
              <StatusPill active={rule.is_active} />
            </td>
          </tr>
        )}
      />
      <InfoNote text="La base de conocimiento sirve como apoyo explicativo y no reemplaza el criterio profesional del medico veterinario." />
    </div>
  );
}

function VariableDetail({ variable, rules }: { variable: ClinicalVariable; rules: Rule[] }) {
  const relatedRules = rules.filter((rule) => rule.conditions.some((condition) => condition.variable_key === variable.key));

  return (
    <div>
      <DetailHeader icon={FlaskConical} title={variable.name} badges={[speciesName(variable.species_id)]} subtitle={`Variable clinica de tipo ${variable.data_type} utilizada por el motor de inferencia.`} />
      <h3 className="mb-3 text-lg font-extrabold text-[#172554]">Rango de referencia</h3>
      <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 p-5">
        <p className="text-sm font-bold text-slate-500">Valor esperado</p>
        <p className="mt-2 text-xl font-extrabold text-[#172554]">{variableRange(variable)}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">Clave tecnica: {variable.key}</p>
      </div>
      <h3 className="mb-3 text-lg font-extrabold text-[#172554]">Reglas IF-THEN relacionadas</h3>
      <DataTable
        columns={["Regla", "Condicion", "Riesgo", "Estado"]}
        rows={relatedRules}
        renderRow={(rule) => (
          <tr key={rule.id}>
            <td className="px-5 py-3 font-bold text-slate-700">{rule.code}</td>
            <td className="px-5 py-3">{conditionText(rule)}</td>
            <td className="px-5 py-3">{rule.risk_level}</td>
            <td className="px-5 py-3">
              <StatusPill active={rule.is_active} />
            </td>
          </tr>
        )}
      />
      <InfoNote text="Cada variable debe interpretarse junto con sintomas, antecedentes y criterio clinico profesional." />
    </div>
  );
}

function RuleDetail({ rule, diseases }: { rule: Rule; diseases: Disease[] }) {
  const disease = diseases.find((item) => item.id === rule.disease_id);

  return (
    <div>
      <DetailHeader icon={Network} title={rule.code} badges={[rule.is_active ? "Activa" : "Inactiva", rule.risk_level]} subtitle={rule.name} />
      <h3 className="mb-3 text-lg font-extrabold text-[#172554]">Condicion IF</h3>
      <div className="mb-6 flex flex-wrap gap-3">
        {rule.conditions.map((condition) => (
          <span className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600" key={condition.id}>
            {condition.variable_key} {condition.operator} {String(condition.expected_value)}{(condition.logical_group ?? 1) > 1 ? ` · alternativa ${condition.logical_group}` : ""}
          </span>
        ))}
      </div>
      <div className="mb-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm font-bold text-emerald-700">Resultado THEN</p>
          <p className="mt-2 text-lg font-extrabold text-emerald-800">Compatible con {disease?.name ?? "enfermedad relacionada"}</p>
        </div>
        <div className="rounded-lg border border-violet-100 bg-violet-50 p-5">
          <p className="text-sm font-bold text-brand-500">Enfermedad relacionada</p>
          <p className="mt-2 text-lg font-extrabold text-[#172554]">{disease?.name ?? "Sin enfermedad asociada"}</p>
        </div>
      </div>
      <DataTable
        columns={["Version", "Estado", "Prioridad", "Peso"]}
        rows={[rule]}
        renderRow={(item) => (
          <tr key={item.id}>
            <td className="px-5 py-3">v{item.version}.0</td>
            <td className="px-5 py-3">
              <StatusPill active={item.is_active} />
            </td>
            <td className="px-5 py-3">{item.priority}</td>
            <td className="px-5 py-3">{item.weight}</td>
          </tr>
        )}
      />
      <InfoNote text="Las reglas IF-THEN sirven como apoyo explicativo y no reemplazan el criterio profesional del medico veterinario." />
    </div>
  );
}

function RiskLevelsView({
  riskLevels,
  selectedRisk,
  selectedIndex,
  setSelectedIndex,
}: {
  riskLevels: RiskLevel[];
  selectedRisk?: RiskLevel;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}) {
  if (!selectedRisk) {
    return (
      <Card className="p-8 text-center">
        <p className="font-bold text-[#172554]">No hay niveles de riesgo registrados.</p>
      </Card>
    );
  }

  const tone = riskTone(selectedRisk.name);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 rounded-lg border border-blue-100 bg-blue-50 p-5 text-blue-700">
        <Info className="mt-0.5 shrink-0" size={24} />
        <p className="font-semibold">
          Los niveles de riesgo permiten clasificar la probabilidad de que un paciente presente una enfermedad.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.45fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-5 text-xl font-extrabold text-[#172554]">Niveles de riesgo definidos</h2>
          <div className="space-y-3">
            {riskLevels.map((risk, index) => {
              const itemTone = riskTone(risk.name);
              return (
                <ListButton active={selectedIndex === index} key={risk.id} onClick={() => setSelectedIndex(index)}>
                  <span className={cn("grid h-14 w-14 place-items-center rounded-full", itemTone.iconClassName)}>
                    {risk.name.toLowerCase().includes("alto") ? <AlertTriangle size={27} /> : <Check size={27} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-[#172554]">{risk.name}</span>
                    <span className={cn("mt-2 inline-flex rounded-md px-3 py-1 text-xs font-bold", itemTone.className)}>
                      {probabilityRange(risk)}
                    </span>
                  </span>
                </ListButton>
              );
            })}
          </div>
        </Card>
        <Card className="p-6">
          <DetailHeader icon={ShieldCheck} title={selectedRisk.name} badges={[probabilityRange(selectedRisk), tone.label]} subtitle={selectedRisk.description ?? "Nivel utilizado para interpretar el resultado sugerido."} />
          <DataTable
            columns={["Campo", "Descripcion"]}
            rows={[
              { field: "Descripcion", value: selectedRisk.description ?? "Sin descripcion registrada." },
              {
                field: "Condicion general de activacion",
                value: "Se activan reglas que combinan signos clinicos, biomarcadores y resultados diagnosticos.",
              },
              {
                field: "Interpretacion del resultado",
                value: "El nivel orienta la prioridad clinica y la necesidad de seguimiento veterinario.",
              },
            ]}
            renderRow={(row) => (
              <tr key={row.field}>
                <td className="px-5 py-4 font-bold text-slate-700">{row.field}</td>
                <td className="px-5 py-4">{row.value}</td>
              </tr>
            )}
          />
          <InfoNote text="La clasificación depende del porcentaje calculado: bajo de 0% a menos de 40%, moderado de 40% a menos de 70% y alto de 70% a 100%. Las reglas IF–THEN activadas muestran las condiciones clínicas que sustentan ese cálculo." />
        </Card>
      </div>
    </div>
  );
}

function DetailHeader({
  icon: Icon,
  title,
  subtitle,
  badges,
}: {
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  badges: string[];
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
      <IconBadge className="h-20 w-20 shrink-0" icon={Icon} iconSize={36} />
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-extrabold text-[#172554]">{title}</h2>
          {badges.map((badge) => (
            <span className="rounded-md bg-violet-50 px-3 py-1 text-sm font-bold text-brand-500" key={badge}>
              {badge}
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function TagSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-lg font-extrabold text-[#172554]">{title}</h3>
      <div className="flex flex-wrap gap-3">
        {items.length ? (
          items.map((item) => (
            <span className="rounded-lg border border-slate-100 bg-white px-4 py-2 text-sm font-bold text-slate-600" key={item}>
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm font-semibold text-slate-400">Sin elementos asociados.</span>
        )}
      </div>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={cn("rounded-md px-3 py-1 text-xs font-bold", active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}

function InfoNote({ text }: { text: string }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-700">
      <Info className="mt-0.5 shrink-0" size={18} />
      <span>{text}</span>
    </div>
  );
}
