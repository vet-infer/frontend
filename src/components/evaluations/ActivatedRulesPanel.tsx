import type { PersistedActivatedRule } from "../../types/evaluation";
import { DataTable } from "../common/DataTable";
import { formatCondition, type FactCatalog } from "../../utils/factLabel";

type ActivatedRulesPanelProps = {
  rules: PersistedActivatedRule[];
  catalog?: FactCatalog;
};

function conditionsLabel(rule: PersistedActivatedRule, catalog: FactCatalog) {
  if (!Array.isArray(rule.fulfilled_conditions)) {
    return String(rule.fulfilled_conditions ?? "Condiciones registradas");
  }

  return rule.fulfilled_conditions.map((condition) => formatCondition(String(condition), catalog)).join(" · ");
}

export function ActivatedRulesPanel({ rules, catalog = [] }: ActivatedRulesPanelProps) {
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
          <td className="px-5 py-3">{conditionsLabel(rule, catalog)}</td>
          <td className="px-5 py-3">{rule.justification || "Regla activada por condiciones cumplidas."}</td>
        </tr>
      )}
    />
  );
}
