# Motor de Inferencia Híbrido — Reglas IF-THEN + Teorema de Bayes

## Visión General

El motor combina dos mecanismos complementarios que se ejecutan en secuencia sobre los mismos hechos clínicos:

| Mecanismo | Qué aporta | Resultado |
|---|---|---|
| **Reglas IF-THEN** | Trazabilidad clínica explícita: "¿qué condiciones se cumplieron?" | `score` + `reglas activadas` (justificación) |
| **Naive Bayes** | Probabilidad numérica de cada enfermedad dada la evidencia clínica | `probability` (0.0 – 1.0) + `nivel de riesgo` |

El nivel de riesgo final (**Bajo / Moderado / Alto**) proviene **exclusivamente** de la probabilidad Bayesiana. Las reglas IF-THEN aportan la justificación trazable del diagnóstico.

---

## Flujo Completo del Motor (7 pasos)

```
Hechos clínicos ingresados por el veterinario
{temperatura: 40.2, fiebre: true, perdida_peso: true, species_id: 1}
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  PASO 1 — Reglas IF-THEN                                           │
│  Cargar reglas activas de la especie → evaluar condiciones         │
│  Resultado: score por enfermedad + reglas activadas                │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  PASO 2 — Extracción de evidencias                                 │
│  Convertir hechos en lista de evidencias tipadas:                  │
│  [symptom: fiebre=true], [variable: temperatura=40.2]              │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  PASO 3 — Likelihood Bayesiano por enfermedad                      │
│  Iniciar con probabilidad base (prior).                            │
│  Multiplicar por P(evidencia | enfermedad) para cada evidencia.    │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  PASO 4 — Normalización                                            │
│  P(enfermedad | evidencia) = likelihood / Σ todos los likelihoods  │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  PASO 5 — Nivel de riesgo desde probabilidad                       │
│  ≥ 0.70 → Alto   │   0.40–0.69 → Moderado   │   < 0.40 → Bajo    │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  PASO 6 — Combinación híbrida de resultados                        │
│  Unir: probability (Bayes) + score (reglas) + activated_rules      │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  PASO 7 — Ordenar por probabilidad descendente y devolver          │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
Resultado final por enfermedad:
{disease, probability, risk_level, score, activated_rules, explanation}
```

---

## PASO 1 — Reglas IF-THEN

### Estructura de una regla

```
Regla RUL-001: "Fiebre alta con pérdida de peso en canino"
  Condición 1: temperatura  >=  39.5   (grupo 1)
  Condición 2: fiebre       ==  true   (grupo 1)
  Condición 3: perdida_peso ==  true   (grupo 1)
  Peso (weight): 2.5
  Prioridad (priority): 2
  Enfermedad asociada: Parvovirus Canino
```

### Lógica de evaluación

- Condiciones del **mismo grupo**: se evalúan con **AND** (todas deben cumplirse).
- Condiciones de **grupos distintos**: se evalúan con **OR** (basta que un grupo se cumpla).

```
Para cada regla:
  score += weight × max(priority, 1)
  solo si TODAS las condiciones del grupo se cumplen
```

**Ejemplo con los valores anteriores:**
```
score += 2.5 × max(2, 1) = 2.5 × 2 = 5.0
```

### Operadores soportados

| Operador | Significado | Ejemplo |
|---|---|---|
| `eq` | igual | `fiebre == true` |
| `neq` | distinto | `vomito != false` |
| `gt` | mayor que | `temperatura > 39.5` |
| `gte` | mayor o igual | `temperatura >= 39.5` |
| `lt` | menor que | `peso < 3.0` |
| `lte` | menor o igual | `glucosa <= 60` |
| `between` | entre rango | `edad between 1,5` |
| `contains` | contiene | `raza contains labrador` |
| `in` | dentro de lista | `color in negro,café` |

---

## PASO 2 — Extracción de Evidencias

El servicio convierte el diccionario de hechos en una lista de evidencias tipadas:

```
Entrada (facts):
{
  "temperatura": 40.2,
  "fiebre": true,
  "perdida_peso": true,
  "species_id": 1
}

Salida (evidences):
[
  { type: "variable", key: "temperatura",   value: 40.2  },
  { type: "symptom",  key: "fiebre",        value: True  },
  { type: "symptom",  key: "perdida_peso",  value: True  }
]
```

> `species_id`, `patient_id` y `evaluation_id` se excluyen automáticamente porque son metadatos, no evidencia clínica.

---

## PASO 3 — Likelihood Bayesiano (Naive Bayes)

### Fórmula aplicada

El sistema implementa **Naive Bayes** (independencia condicional entre evidencias):

$$L(E_k) = P(D_k) \times \prod_{i=1}^{n} P(e_i \mid D_k)$$

En notación del código:

```
likelihood(enfermedad_k) =
    base_probability(D_k)           ← prior almacenado en BD (default: 0.20)
    × P(evidencia_1 | D_k)          ← de tabla clinical_probabilities
    × P(evidencia_2 | D_k)          ← de tabla clinical_probabilities
    × ...
    × P(evidencia_n | D_k)          ← si no hay registro: usa smoothing=0.50
```

### Fuentes de los valores

| Valor | Origen | Default si no existe |
|---|---|---|
| `P(D_k)` — probabilidad base | Campo `base_probability` en tabla `diseases` | `0.20` (configurable) |
| `P(e_i \| D_k)` — probabilidad de evidencia dada la enfermedad | Campo `probability_given_disease` en tabla `clinical_probabilities` | `0.50` (smoothing, configurable) |

### Ejemplo numérico completo

**Escenario**: 3 enfermedades posibles para un canino. Evidencias registradas: `fiebre=True`, `temperatura=40.2`, `perdida_peso=True`.

**Probabilidades en base de datos (ejemplo)**:

| Enfermedad | P(D_k) base | P(fiebre \| D) | P(temperatura_alta \| D) | P(pérdida_peso \| D) |
|---|---|---|---|---|
| Parvovirus Canino | 0.20 | 0.90 | 0.85 | 0.80 |
| Distemper Canino | 0.20 | 0.75 | 0.70 | 0.65 |
| Leptospirosis | 0.20 | 0.60 | sin registro → 0.50 | 0.55 |

**Cálculo de likelihoods**:

```
L(Parvovirus)   = 0.20 × 0.90 × 0.85 × 0.80  = 0.1224
L(Distemper)    = 0.20 × 0.75 × 0.70 × 0.65  = 0.0683
L(Leptospirosis)= 0.20 × 0.60 × 0.50 × 0.55  = 0.0330
```

---

## PASO 4 — Normalización de Probabilidades

La normalización convierte los likelihoods en probabilidades reales que suman 1.0:

$$P(D_k \mid \text{evidencias}) = \frac{L(D_k)}{\sum_{j=1}^{K} L(D_j)}$$

**Continuando el ejemplo**:

```
Total = 0.1224 + 0.0683 + 0.0330 = 0.2237

P(Parvovirus    | evidencias) = 0.1224 / 0.2237 = 0.5472  →  54.72%
P(Distemper     | evidencias) = 0.0683 / 0.2237 = 0.3053  →  30.53%
P(Leptospirosis | evidencias) = 0.0330 / 0.2237 = 0.1476  →  14.76%

Suma: 0.5472 + 0.3053 + 0.1476 = 1.0000 ✓
```

---

## PASO 5 — Estratificación de Riesgo

El nivel de riesgo se determina **solo** por la probabilidad normalizada:

```
probability >= 0.70  →  ALTO
probability >= 0.40  →  MODERADO
probability  < 0.40  →  BAJO
```

**Resultado del ejemplo**:

| Enfermedad | Probabilidad | Nivel de Riesgo |
|---|---|---|
| Parvovirus Canino | 54.72% | **MODERADO** |
| Distemper Canino | 30.53% | **BAJO** |
| Leptospirosis | 14.76% | **BAJO** |

> El nivel de riesgo proviene **exclusivamente** de la probabilidad Bayesiana. Las reglas IF-THEN **no pueden elevar** el nivel de riesgo; solo aportan justificación trazable.

---

## PASO 6 — Resultado Híbrido Final

Cada resultado combina ambos mecanismos:

```json
{
  "disease": "Parvovirus Canino",
  "probability": 0.5472,
  "risk_level": "Moderado",
  "score": 5.0,
  "inference_method": "reglas_bayes",
  "activated_rules": [
    {
      "rule_code": "RUL-001",
      "rule_name": "Fiebre alta con pérdida de peso en canino",
      "fulfilled_conditions": [
        "temperatura >= 39.5 (observado: 40.2) ✓",
        "fiebre == true (observado: true) ✓",
        "perdida_peso == true (observado: true) ✓"
      ],
      "justification": "La regla RUL-001 se activó porque todas sus condiciones coincidieron con los datos de la evaluación clínica."
    }
  ],
  "explanation": "Análisis probabilístico bayesiano para Parvovirus Canino con una probabilidad calculada de 54.72%. El porcentaje se clasifica como riesgo moderado (40% a menos de 70%). Evidencias clínicas consideradas: síntomas observados: fiebre, perdida_peso; variables clínicas registradas: temperatura (40.2). Las reglas IF-THEN activadas (RUL-001) sustentan la evidencia clínica registrada para esta inferencia."
}
```

---

## Diagrama de Relación entre Componentes del Motor

```
                  ┌─────────────────────────────────────┐
                  │         InferenceService             │
                  │  (orquestador del flujo híbrido)     │
                  └─────────────────────────────────────┘
                         │                   │
            carga reglas │                   │ carga enfermedades + probs
                         ▼                   ▼
               ┌──────────────┐     ┌──────────────────────┐
               │ RuleRepository│     │ ClinicalProbability   │
               │ (reglas BD)   │     │ Repository (priors BD)│
               └──────────────┘     └──────────────────────┘
                         │                   │
                         ▼                   ▼
               ┌──────────────────────────────────────────┐
               │           InferenceEngine                │
               │  (evaluación de reglas IF-THEN)          │
               │  ├── FactNormalizer (normaliza hechos)   │
               │  ├── ConditionEvaluator (10 operadores)  │
               │  ├── ConditionTrace (justificación)      │
               │  └── risk_from_score() ← score umbrales │
               └──────────────────────────────────────────┘
                         │ score + activated_rules
                         ▼
               ┌──────────────────────────────────────────┐
               │            BayesService                  │
               │  (cálculo probabilístico Naive Bayes)    │
               │  ├── calcular_probabilidad_bayes()       │
               │  ├── normalizar_probabilidades()         │
               │  ├── determinar_nivel_riesgo()           │
               │  └── generar_explicacion_bayes()         │
               └──────────────────────────────────────────┘
                         │ probability + risk_level + explanation
                         ▼
               ┌──────────────────────────────────────────┐
               │         Resultado híbrido final          │
               │  probability (Bayes) + score (reglas)    │
               │  + risk_level + activated_rules          │
               │  Ordenado por probabilidad descendente   │
               └──────────────────────────────────────────┘
```

---

## Resumen de Parámetros Configurables

Todos los umbrales se configuran vía variables de entorno (`.env`):

| Parámetro | Variable de entorno | Valor por defecto | Efecto |
|---|---|---|---|
| Probabilidad base | `BAYES_DEFAULT_PRIOR` | `0.20` | Prior cuando `disease.base_probability` es nulo |
| Factor de suavizado | `BAYES_SMOOTHING_FACTOR` | `0.50` | Reemplaza `P(e\|D)` cuando no hay registro en BD |
| Precisión decimal | `PROBABILITY_PRECISION` | `4` | Decimales en probabilidad final |
| Umbral riesgo alto | `INFERENCE_HIGH_SCORE_THRESHOLD` | `7.0` | Solo para score de reglas (no afecta riesgo final) |
| Umbral riesgo moderado | `INFERENCE_MODERATE_SCORE_THRESHOLD` | `4.0` | Solo para score de reglas (no afecta riesgo final) |

> **Nota**: Los umbrales de score (`INFERENCE_*_THRESHOLD`) afectan el campo `score` calculado por reglas, pero el campo `risk_level` del resultado final usa **exclusivamente** la probabilidad Bayesiana con umbrales fijos (`0.70` / `0.40`).

---

## Por Qué Naive Bayes y No Bayes Exacto

El sistema aplica **Naive Bayes** (independencia condicional), no Bayes exacto. Esto significa que asume:

$$P(e_1, e_2, ..., e_n \mid D_k) \approx \prod_{i=1}^{n} P(e_i \mid D_k)$$

**Ventajas en este contexto**:
- Requiere mucho menos datos de entrenamiento que Bayes exacto.
- Funciona bien con pocos registros clínicos.
- Los `clinical_probabilities` de la BD pueden mantenerse y ajustarse por expertos veterinarios.
- Computacionalmente eficiente para el número de enfermedades del sistema.

**Limitación conocida**:
- Si dos síntomas están correlacionados (ej. fiebre y temperatura alta), el modelo los trata como independientes y puede sobreponderar esa evidencia. En el dominio veterinario esto se mitiga con el `smoothing_factor`.
