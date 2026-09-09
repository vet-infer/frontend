import { Edit, Eye, Network, Plus, Power, Save, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { DataTable } from "../../components/common/DataTable";
import { FormField } from "../../components/common/FormField";
import { FormSelect } from "../../components/common/FormSelect";
import { IconBadge } from "../../components/common/IconBadge";
import { Modal } from "../../components/common/Modal";
import { Skeleton } from "../../components/common/Skeleton";
import { evaluationService } from "../../services/evaluation.service";
import { knowledgeService } from "../../services/knowledge.service";
import type { FactDefinition } from "../../types/evaluation";
import type { Disease, RiskLevel, Rule, RuleConditionPayload, RulePayload } from "../../types/knowledge";
import { getErrorMessage as getResponseErrorMessage } from "../../utils/errors";

const operators = ["==", "!=", ">", ">=", "<", "<=", "contains"];

type RuleFormState = {
  code: string;
  name: string;
  disease_id: string;
  risk_level_id: string;
  weight: string;
  priority: string;
  version: string;
  is_active: boolean;
  conditions: RuleConditionPayload[];
};

const emptyCondition: RuleConditionPayload = {
  variable_key: "",
  operator: "==",
  expected_value: true,
  logical_group: 1,
};

function initialForm(): RuleFormState {
  return {
    code: "",
    name: "",
    disease_id: "",
    risk_level_id: "",
    weight: "1",
    priority: "1",
    version: "1",
    is_active: true,
    conditions: [{ ...emptyCondition }],
  };
}

function speciesName(speciesId?: number | null) {
  if (speciesId === 1) {
    return "Perro";
  }

  if (speciesId === 2) {
    return "Gato";
  }

  return "General";
}
function errorMessage(error: unknown) {
  return getResponseErrorMessage(error, "No fue posible completar la operacion.");
}

function toForm(rule: Rule): RuleFormState {
  return {
    code: rule.code,
    name: rule.name,
    disease_id: String(rule.disease_id),
    risk_level_id: String(rule.risk_level_id),
    weight: String(rule.weight),
    priority: String(rule.priority),
    version: String(rule.version),
    is_active: rule.is_active,
    conditions: rule.conditions.map((condition) => ({
      variable_key: condition.variable_key,
      operator: condition.operator,
      expected_value: condition.expected_value,
      logical_group: condition.logical_group ?? 1,
    })),
  };
}

function normalizeValue(value: string | number | boolean, fact?: FactDefinition) {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (fact?.data_type === "boolean") {
    return value === "true";
  }

  if (["number", "numeric", "float", "integer"].includes(fact?.data_type ?? "")) {
    return Number(value);
  }

  return value;
}

function conditionText(condition: Pick<RuleConditionPayload, "variable_key" | "operator" | "expected_value">) {
  return `${condition.variable_key} ${condition.operator} ${String(condition.expected_value)}`;
}

export function RulesAdminPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([]);
  const [facts, setFacts] = useState<FactDefinition[]>([]);
  const [form, setForm] = useState<RuleFormState>(() => initialForm());
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [viewRule, setViewRule] = useState<Rule | null>(null);
  const [statusRule, setStatusRule] = useState<Rule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedDisease = useMemo(
    () => diseases.find((disease) => disease.id === Number(form.disease_id)),
    [diseases, form.disease_id]
  );

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadFacts() {
      if (!selectedDisease) {
        setFacts([]);
        return;
      }

      const result = await evaluationService.getEvaluationFacts(selectedDisease.species_id);
      if (isMounted) {
        setFacts(result);
      }
    }

    void loadFacts().catch((caughtError) => {
      if (isMounted) {
        setError(errorMessage(caughtError));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedDisease]);

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const [rulesResult, diseasesResult, riskResult] = await Promise.all([
        knowledgeService.listRules(),
        knowledgeService.listDiseases(),
        knowledgeService.listRiskLevels(),
      ]);
      setRules(rulesResult);
      setDiseases(diseasesResult.filter((disease) => disease.is_active));
      setRiskLevels(riskResult.filter((risk) => risk.is_active));
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditingRule(null);
    setForm(initialForm());
    setIsFormOpen(true);
    setError("");
  }

  function openEdit(rule: Rule) {
    setEditingRule(rule);
    setForm(toForm(rule));
    setIsFormOpen(true);
    setError("");
  }

  function updateCondition(index: number, patch: Partial<RuleConditionPayload>) {
    setForm((current) => ({
      ...current,
      conditions: current.conditions.map((condition, currentIndex) =>
        currentIndex === index ? { ...condition, ...patch } : condition
      ),
    }));
  }

  function addCondition() {
    setForm((current) => ({ ...current, conditions: [...current.conditions, { ...emptyCondition }] }));
  }

  function removeCondition(index: number) {
    setForm((current) => ({
      ...current,
      conditions: current.conditions.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function buildPayload(): RulePayload {
    const factByKey = new Map(facts.map((fact) => [fact.fact_key, fact]));

    return {
      code: form.code.trim(),
      name: form.name.trim(),
      disease_id: Number(form.disease_id),
      risk_level_id: Number(form.risk_level_id),
      weight: Number(form.weight),
      priority: Number(form.priority),
      version: Number(form.version),
      is_active: form.is_active,
      conditions: form.conditions.map((condition) => ({
        ...condition,
        expected_value: normalizeValue(condition.expected_value, factByKey.get(condition.variable_key)),
      })),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = buildPayload();
      if (editingRule) {
        await knowledgeService.updateRule(editingRule.id, payload);
        setMessage("Regla actualizada correctamente.");
      } else {
        await knowledgeService.createRule(payload);
        setMessage("Regla creada correctamente.");
      }
      setIsFormOpen(false);
      await loadData();
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmStatusChange() {
    if (!statusRule) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await knowledgeService.updateRuleStatus(statusRule.id, { is_active: !statusRule.is_active });
      setMessage(statusRule.is_active ? "Regla desactivada correctamente." : "Regla activada correctamente.");
      setStatusRule(null);
      await loadData();
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">Reglas IF-THEN</h1>
          <p className="mt-2 max-w-3xl text-base text-slate-500">
            Gestion administrativa de reglas de inferencia asociadas a enfermedad, nivel de riesgo y facts clinicos validados.
          </p>
        </div>
        <Button icon={<Plus size={18} />} onClick={openCreate} type="button">
          Crear regla
        </Button>
      </section>

      {message ? <AlertMessage message={message} tone="success" onClose={() => setMessage("")} /> : null}
      {error ? <AlertMessage message={error} tone="error" onClose={() => setError("")} /> : null}

      <Card className="p-5">
        {isLoading ? (
          <Skeleton className="h-72" />
        ) : (
          <DataTable
            columns={["Codigo", "Nombre", "Enfermedad", "Riesgo", "Condiciones", "Estado", "Acciones"]}
            rows={rules}
            renderRow={(rule) => {
              const disease = diseases.find((item) => item.id === rule.disease_id);
              return (
                <tr key={rule.id}>
                  <td className="px-5 py-4 font-bold text-slate-700">{rule.code}</td>
                  <td className="px-5 py-4">{rule.name}</td>
                  <td className="px-5 py-4">{disease?.name ?? `ID ${rule.disease_id}`}</td>
                  <td className="px-5 py-4">{rule.risk_level}</td>
                  <td className="px-5 py-4">{rule.conditions.length}</td>
                  <td className="px-5 py-4">
                    <span className={rule.is_active ? "rounded-md bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700" : "rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"}>
                      {rule.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button icon={<Eye size={16} />} onClick={() => setViewRule(rule)} type="button" variant="secondary">
                        Ver
                      </Button>
                      <Button icon={<Edit size={16} />} onClick={() => openEdit(rule)} type="button" variant="secondary">
                        Editar
                      </Button>
                      <Button icon={<Power size={16} />} onClick={() => setStatusRule(rule)} type="button" variant={rule.is_active ? "danger" : "secondary"}>
                        {rule.is_active ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </Card>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingRule ? "Editar regla IF-THEN" : "Crear regla IF-THEN"}>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField disabled={Boolean(editingRule)} label="Codigo" onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required value={form.code} />
            <FormField label="Nombre" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required value={form.name} />
            <FormSelect label="Enfermedad" onChange={(event) => setForm((current) => ({ ...current, disease_id: event.target.value, conditions: [{ ...emptyCondition }] }))} required value={form.disease_id}>
              <option value="">Seleccione enfermedad</option>
              {diseases.map((disease) => (
                <option key={disease.id} value={disease.id}>{disease.name} ({speciesName(disease.species_id)})</option>
              ))}
            </FormSelect>
            <FormSelect label="Nivel de riesgo" onChange={(event) => setForm((current) => ({ ...current, risk_level_id: event.target.value }))} required value={form.risk_level_id}>
              <option value="">Seleccione nivel</option>
              {riskLevels.map((risk) => (
                <option key={risk.id} value={risk.id}>{risk.name}</option>
              ))}
            </FormSelect>
            <FormField label="Peso" min="0.01" onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))} required step="0.01" type="number" value={form.weight} />
            <FormField label="Prioridad" min="1" onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} required type="number" value={form.priority} />
            <FormField label="Version" min="1" onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} required type="number" value={form.version} />
            <label className="flex h-12 items-center gap-3 self-end rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700">
              <input checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" />
              Regla activa
            </label>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-[#172554]">Condiciones IF</h2>
              <Button disabled={!selectedDisease} icon={<Plus size={16} />} onClick={addCondition} type="button" variant="secondary">
                Agregar condicion
              </Button>
            </div>

            {form.conditions.map((condition, index) => {
              const fact = facts.find((item) => item.fact_key === condition.variable_key);
              return (
                <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 lg:grid-cols-[1.5fr_0.7fr_1fr_0.6fr_auto]" key={`${condition.variable_key}-${index}`}>
                  <FormSelect label="fact_key" onChange={(event) => updateCondition(index, { variable_key: event.target.value, expected_value: facts.find((item) => item.fact_key === event.target.value)?.data_type === "boolean" ? true : "" })} required value={condition.variable_key}>
                    <option value="">Seleccione fact</option>
                    {facts.map((item) => (
                      <option key={item.id} value={item.fact_key}>{item.display_name} ({item.fact_key})</option>
                    ))}
                  </FormSelect>
                  <FormSelect label="Operador" onChange={(event) => updateCondition(index, { operator: event.target.value })} required value={condition.operator}>
                    {operators.map((operator) => (
                      <option key={operator} value={operator}>{operator}</option>
                    ))}
                  </FormSelect>
                  {fact?.data_type === "boolean" ? (
                    <FormSelect label="Valor esperado" onChange={(event) => updateCondition(index, { expected_value: event.target.value === "true" })} required value={String(condition.expected_value)}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </FormSelect>
                  ) : fact?.allowed_values?.length ? (
                    <FormSelect label="Valor esperado" onChange={(event) => updateCondition(index, { expected_value: event.target.value })} required value={String(condition.expected_value)}>
                      <option value="">Seleccione valor</option>
                      {fact.allowed_values.map((value) => (
                        <option key={String(value)} value={String(value)}>{String(value)}</option>
                      ))}
                    </FormSelect>
                  ) : (
                    <FormField label="Valor esperado" onChange={(event) => updateCondition(index, { expected_value: event.target.value })} required type={["number", "numeric", "float", "integer"].includes(fact?.data_type ?? "") ? "number" : "text"} value={String(condition.expected_value)} />
                  )}
                  <FormField label="Grupo" min="1" onChange={(event) => updateCondition(index, { logical_group: Number(event.target.value) })} required type="number" value={String(condition.logical_group)} />
                  <Button className="self-end" disabled={form.conditions.length === 1} icon={<Trash2 size={16} />} onClick={() => removeCondition(index)} type="button" variant="ghost">
                    Quitar
                  </Button>
                </div>
              );
            })}
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button icon={<X size={16} />} onClick={() => setIsFormOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={isSaving} icon={<Save size={16} />} type="submit">
              {isSaving ? "Guardando..." : "Guardar regla"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(viewRule)} onClose={() => setViewRule(null)} title="Condiciones de la regla">
        {viewRule ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <IconBadge className="h-14 w-14" icon={Network} iconSize={26} />
              <div>
                <h2 className="text-xl font-extrabold text-[#172554]">{viewRule.code} - {viewRule.name}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">THEN enfermedad ID {viewRule.disease_id}, riesgo {viewRule.risk_level}</p>
              </div>
            </div>
            <DataTable
              columns={["fact_key", "Operador", "Valor esperado", "Grupo logico"]}
              rows={viewRule.conditions}
              renderRow={(condition) => (
                <tr key={condition.id}>
                  <td className="px-5 py-4 font-bold text-slate-700">{condition.variable_key}</td>
                  <td className="px-5 py-4">{condition.operator}</td>
                  <td className="px-5 py-4">{String(condition.expected_value)}</td>
                  <td className="px-5 py-4">{condition.logical_group ?? 1}</td>
                </tr>
              )}
            />
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
              Lectura logica: {viewRule.conditions.map((condition) => conditionText(condition)).join(" AND ")}
            </p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        confirmLabel={statusRule?.is_active ? "Desactivar" : "Activar"}
        isLoading={isSaving}
        isOpen={Boolean(statusRule)}
        message="Esta accion actualiza solo el estado logico de la regla. No elimina registros seed ni historicos de inferencia."
        onCancel={() => setStatusRule(null)}
        onConfirm={confirmStatusChange}
        title={statusRule?.is_active ? "Desactivar regla" : "Activar regla"}
      />
    </div>
  );
}

