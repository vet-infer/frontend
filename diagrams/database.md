// =============================================
// Sistema de Inferencia Clínica Veterinaria
// Motor: PostgreSQL 16 | ORM: SQLAlchemy 2.0
// Diagrama normalizado (cumple 1FN/2FN/3FN, PK/FK explícitas)
// =============================================

Table roles {
  id integer [pk, increment]
  name varchar(40) [not null, unique, note: 'INDEX']
  description varchar(255)
}

Table users {
  id integer [pk, increment]
  full_name varchar(120) [not null]
  email varchar(160) [not null, unique, note: 'INDEX']
  password_hash varchar(255) [not null]
  role_id integer [not null, ref: > roles.id]
  is_active boolean [not null, default: true]
}

Table password_reset_tokens {
  id integer [pk, increment]
  user_id integer [not null, ref: > users.id, note: 'INDEX']
  token_hash varchar(64) [not null, unique, note: 'INDEX']
  expires_at timestamptz [not null, note: 'INDEX']
  used_at timestamptz
  created_at timestamptz [not null, default: `now()`]
}

Table species {
  id integer [pk, increment]
  name varchar(40) [not null, unique, note: 'INDEX']
}

Table breeds {
  id integer [pk, increment]
  species_id integer [not null, ref: > species.id, note: 'CASCADE DELETE']
  name varchar(80) [not null]

  indexes {
    (species_id, name) [unique, name: 'uix_species_breed_name']
  }
}

Table ubigeo_locations {
  ubigeo varchar(6) [pk, note: 'código INEI']
  department varchar(80) [not null]
  province varchar(80) [not null]
  district varchar(80) [not null]

  note: 'Catálogo de ubicación. department/province/district dependen funcionalmente de ubigeo (dependencia transitiva) — extraído de owners para cumplir 3FN.'
}

Table owners {
  id integer [pk, increment]
  first_name varchar(120) [not null]
  last_name varchar(120)
  phone varchar(20)
  email varchar(160) [unique, note: 'INDEX']
  address varchar(255)
  ubigeo varchar(6) [ref: > ubigeo_locations.ubigeo, note: 'INDEX']
  is_active boolean [not null, default: true]
  created_at timestamptz [not null, default: `now()`]
}

Table patients {
  id integer [pk, increment]
  owner_id integer [not null, ref: > owners.id]
  name varchar(80) [not null, note: 'INDEX']
  species_id integer [not null, ref: > species.id]
  breed_id integer [ref: > breeds.id]
  sex varchar(20) [not null]
  birth_date date
  weight float
  created_by integer [not null, ref: > users.id]
  is_active boolean [not null, default: true]
  created_at timestamptz [not null, default: `now()`]
}

Table evaluations {
  id integer [pk, increment]
  patient_id integer [not null, ref: > patients.id]
  veterinarian_id integer [not null, ref: > users.id]
  reason varchar(255)
  observations text
  created_at timestamptz [not null, default: `now()`]
}

Table evaluation_facts {
  id integer [pk, increment]
  evaluation_id integer [not null, ref: > evaluations.id, note: 'INDEX']
  fact_key varchar(100) [not null, note: 'INDEX']
  value json [not null]
  source_type varchar(40) [not null, default: 'clinical_input']

  indexes {
    (evaluation_id, fact_key) [unique, name: 'uix_evaluation_fact_key']
  }

  note: 'patient_id eliminado: es derivable vía evaluation_id -> evaluations.patient_id (era redundancia, violaba 3FN).'
}

Table clinical_history {
  id integer [pk, increment]
  patient_id integer [not null, ref: > patients.id]
  evaluation_id integer [ref: > evaluations.id]
  event_type varchar(60) [not null]
  summary text [not null]
  created_at timestamptz [not null, default: `now()`]
}

Table symptoms {
  id integer [pk, increment]
  name varchar(120) [not null, note: 'INDEX']
  description text
  species_id integer [not null, ref: > species.id]
  is_active boolean [not null, default: true]
}

Table clinical_variables {
  id integer [pk, increment]
  key varchar(80) [not null, note: 'INDEX']
  name varchar(120) [not null]
  data_type varchar(30) [not null]
  unit varchar(30)
  normal_min float
  normal_max float
  species_id integer [ref: > species.id]
  is_active boolean [not null, default: true]
}

Table diseases {
  id integer [pk, increment]
  name varchar(120) [not null, note: 'INDEX']
  species_id integer [not null, ref: > species.id]
  description text
  base_probability float [default: 0.20, note: 'P(E) prior bayesiano']
  is_degenerative boolean [not null, default: true]
  is_active boolean [not null, default: true]
}

Table risk_levels {
  id integer [pk, increment]
  code varchar(20) [not null, unique, note: 'INDEX — bajo|moderado|alto']
  name varchar(40) [not null]
  description text
  min_probability float
  max_probability float
  sort_order integer [not null, default: 1]
  is_active boolean [not null, default: true]
}

Table inference_rules {
  id integer [pk, increment]
  code varchar(50) [not null, unique, note: 'INDEX']
  name varchar(150) [not null]
  disease_id integer [not null, ref: > diseases.id]
  risk_level_id integer [not null, ref: > risk_levels.id]
  weight float [not null, default: 1.0]
  priority integer [not null, default: 1]
  version integer [not null, default: 1]
  is_active boolean [not null, default: true]

  note: 'columna risk_level (varchar) eliminada: duplicaba risk_level_id, violaba 3FN.'
}

Table rule_conditions {
  id integer [pk, increment]
  rule_id integer [not null, ref: > inference_rules.id]
  variable_key varchar(100) [not null, note: 'INDEX']
  operator varchar(30) [not null]
  expected_value json [not null]
  logical_group integer [not null, default: 1]
}

Table knowledge_sources {
  id integer [pk, increment]
  title varchar(300) [not null]
  citation text [not null]
  url varchar(500)
  doi varchar(200)
  publication_year integer
  is_active boolean [not null, default: true]
}

Table rule_references {
  id integer [pk, increment]
  rule_id integer [not null, ref: > inference_rules.id, note: 'CASCADE DELETE']
  source_id integer [not null, ref: > knowledge_sources.id, note: 'CASCADE DELETE']
  rationale text
  locator varchar(100)

  indexes {
    (rule_id, source_id) [unique, name: 'uix_rule_reference']
  }
}

Table inference_results {
  id integer [pk, increment]
  evaluation_id integer [not null, ref: > evaluations.id]
  disease_id integer [not null, ref: > diseases.id]
  risk_level_id integer [not null, ref: > risk_levels.id]
  suggested_diagnosis varchar(255) [not null, note: 'snapshot histórico de diseases.name al momento de inferencia — denormalización intencional para auditoría, no viola normalización']
  score float [not null]
  probability float [note: 'P(E|síntomas) bayesiano']
  inference_method varchar(50) [note: 'rules|bayesian|hybrid']
  explanation text
  created_at timestamptz [not null, default: `now()`]

  indexes {
    (evaluation_id, disease_id) [unique, name: 'uix_result_evaluation_disease']
  }

  note: 'columna risk_level (varchar) eliminada: duplicaba risk_level_id, violaba 3FN.'
}

Table activated_rules {
  id integer [pk, increment]
  result_id integer [not null, ref: > inference_results.id]
  rule_id integer [not null, ref: > inference_rules.id]
  fulfilled_conditions json [not null]
  justification text [not null]
  rule_code varchar(50) [note: 'snapshot histórico de inference_rules.code — denormalización intencional para auditoría']
  rule_version integer [note: 'snapshot histórico de inference_rules.version — denormalización intencional para auditoría']

  indexes {
    (result_id, rule_id) [unique, name: 'uix_activated_result_rule']
  }
}

Table clinical_probabilities {
  id integer [pk, increment]
  disease_id integer [not null, ref: > diseases.id, note: 'CASCADE DELETE']
  symptom_id integer [ref: > symptoms.id, note: 'CASCADE DELETE — exclusivo con variable_id']
  variable_id integer [ref: > clinical_variables.id, note: 'CASCADE DELETE — exclusivo con symptom_id']
  expected_value varchar(100)
  probability_given_disease float [not null, note: 'P(síntoma|enfermedad)']
  general_probability float [not null, note: 'P(síntoma)']
  is_active boolean [not null, default: true]

  note: 'CHECK (symptom_id IS NULL) <> (variable_id IS NULL) — exclusividad. Recomendado: unique parcial (disease_id, symptom_id) y (disease_id, variable_id) para evitar duplicados.'
}

Table fact_definitions {
  id integer [pk, increment]
  fact_key varchar(100) [not null, note: 'INDEX']
  display_name varchar(150) [not null]
  source_type varchar(30) [not null]
  data_type varchar(30) [not null]
  unit varchar(40)
  allowed_values json
  species_id integer [ref: > species.id]
  symptom_id integer [ref: > symptoms.id]
  clinical_variable_id integer [ref: > clinical_variables.id]
  is_active boolean [not null, default: true]

  indexes {
    (fact_key, species_id) [unique, name: 'uq_fact_definition_key_species']
  }
}
