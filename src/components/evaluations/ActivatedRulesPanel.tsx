import type { PersistedActivatedRule } from "../../types/evaluation";
import { DataTable } from "../common/DataTable";

type ActivatedRulesPanelProps = {
  rules: PersistedActivatedRule[];
};

export function ActivatedRulesPanel({ rules }: ActivatedRulesPanelProps) {
  if (!rules.length) {
    return <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">No hay reglas activadas asociadas.</p>;
  }

  return (
    <DataTable
      columns={["Regla", "Condiciones cumplidas", "Justificacion"]}
      rows={rules}
      renderRow={(rule) => (
        <tr key={rule.id}>
          <td className="whitespace-nowrap px-5 py-3 font-bold text-slate-700">{rule.rule_code ?? `#${rule.rule_id}`}</td>
          <td className="px-5 py-3">{Array.isArray(rule.fulfilled_conditions) ? rule.fulfilled_conditions.map(String).join(" · ") : String(rule.fulfilled_conditions ?? "Condiciones registradas")}</td>
          <td className="px-5 py-3">{rule.justification || "Regla activada por condiciones cumplidas."}</td>
        </tr>
      )}
    />
  );
}
