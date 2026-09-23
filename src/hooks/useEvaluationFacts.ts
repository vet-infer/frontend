import { useEffect, useState } from "react";
import { evaluationService } from "../services/evaluation.service";
import type { FactDefinition } from "../types/evaluation";
import { getErrorMessage } from "../utils/errors";

type EvaluationFactGroups = {
  symptoms: FactDefinition[];
  clinicalVariables: FactDefinition[];
};

const emptyGroups: EvaluationFactGroups = {
  symptoms: [],
  clinicalVariables: [],
};

export function useEvaluationFacts(speciesId?: number) {
  const [groups, setGroups] = useState<EvaluationFactGroups>(emptyGroups);
  const [error, setError] = useState("");
  const [loadedSpeciesId, setLoadedSpeciesId] = useState<number>();
  const [failedSpeciesId, setFailedSpeciesId] = useState<number>();

  useEffect(() => {
    if (!speciesId) {
      return;
    }

    let active = true;
    Promise.all([
      evaluationService.getEvaluationSymptoms(speciesId),
      evaluationService.getEvaluationClinicalVariables(speciesId),
    ])
      .then(([symptoms, clinicalVariables]) => {
        if (!active) return;
        setGroups({
          symptoms: symptoms.filter((fact) => fact.is_active && fact.source_type === "symptom"),
          clinicalVariables: clinicalVariables.filter(
            (fact) => fact.is_active && fact.source_type === "clinical_variable"
          ),
        });
        setLoadedSpeciesId(speciesId);
        setFailedSpeciesId(undefined);
        setError("");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setGroups(emptyGroups);
        setError(getErrorMessage(cause, "No fue posible cargar los sintomas y variables clinicas."));
        setFailedSpeciesId(speciesId);
      });

    return () => {
      active = false;
    };
  }, [speciesId]);

  const isCurrent = Boolean(speciesId) && speciesId === loadedSpeciesId;
  const currentGroups = isCurrent ? groups : emptyGroups;

  return {
    data: [...currentGroups.symptoms, ...currentGroups.clinicalVariables],
    symptoms: currentGroups.symptoms,
    clinicalVariables: currentGroups.clinicalVariables,
    error: speciesId && speciesId === failedSpeciesId ? error : "",
    isLoading: Boolean(speciesId) && !isCurrent && speciesId !== failedSpeciesId,
  };
}
