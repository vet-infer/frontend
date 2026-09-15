import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Info, PawPrint, Save } from "lucide-react";
import { AlertMessage } from "../common/AlertMessage";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { FormField } from "../common/FormField";
import { FormSelect } from "../common/FormSelect";
import { IconBadge } from "../common/IconBadge";
import type { Owner } from "../../types/owner";
import type { Breed, Patient, PatientFormValues, PatientPayload, Species } from "../../types/patient";

type PatientFormProps = {
  patient?: Patient;
  owners: Owner[];
  species: Species[];
  breeds: Breed[];
  initialOwnerId?: string;
  isSaving: boolean;
  error?: string;
  mode: "create" | "edit";
  onCancel?: () => void;
  onSpeciesChange: (speciesId: number | null) => void;
  onSubmit: (payload: PatientPayload) => Promise<void>;
};

type FormErrors = Partial<Record<keyof PatientFormValues, string>>;

const emptyValues: PatientFormValues = {
  owner_id: "",
  name: "",
  species_id: "",
  breed_id: "",
  sex: "",
  birth_date: "",
  weight: "",
};

function normalizePayload(values: PatientFormValues): PatientPayload {
  return {
    owner_id: Number(values.owner_id),
    name: values.name.trim(),
    species_id: Number(values.species_id),
    breed_id: values.breed_id ? Number(values.breed_id) : null,
    sex: values.sex,
    birth_date: values.birth_date || null,
    weight: values.weight ? Number(values.weight) : null,
  };
}

function validate(values: PatientFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.owner_id) {
    errors.owner_id = "Selecciona un propietario existente.";
  }

  if (!values.name.trim()) {
    errors.name = "Ingresa el nombre del paciente.";
  }

  if (!values.species_id) {
    errors.species_id = "Selecciona una especie.";
  }

  if (!values.breed_id) {
    errors.breed_id = "Selecciona una raza.";
  }

  if (!values.sex) {
    errors.sex = "Selecciona el sexo.";
  }

  if (!values.birth_date) {
    errors.birth_date = "Ingresa la fecha de nacimiento.";
  }

  if (!values.weight) {
    errors.weight = "Ingresa el peso.";
  } else if (Number(values.weight) <= 0) {
    errors.weight = "El peso debe ser mayor que cero.";
  }

  return errors;
}

function getOwnerName(owner: Owner) {
  return [owner.first_name, owner.last_name].filter(Boolean).join(" ");
}

export function PatientForm({
  patient,
  owners,
  species,
  breeds,
  initialOwnerId = "",
  mode,
  isSaving,
  error,
  onCancel,
  onSpeciesChange,
  onSubmit,
}: PatientFormProps) {
  const initialValues = useMemo<PatientFormValues>(
    () =>
      patient
        ? {
            owner_id: String(patient.owner.id),
            name: patient.name,
            species_id: String(patient.species.id),
            breed_id: patient.breed ? String(patient.breed.id) : "",
            sex: patient.sex,
            birth_date: patient.birth_date ?? "",
            weight: patient.weight ? String(patient.weight) : "",
          }
        : emptyValues,
    [patient]
  );

  const [values, setValues] = useState<PatientFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [breedQuery, setBreedQuery] = useState(patient?.breed?.name ?? "");
  const [isBreedListOpen, setIsBreedListOpen] = useState(false);
  const matchingBreeds = useMemo(() => {
    const query = breedQuery.trim().toLocaleLowerCase();
    return breeds.filter((breed) => breed.name.toLocaleLowerCase().includes(query));
  }, [breedQuery, breeds]);

  useEffect(() => {
    setValues(!patient && initialOwnerId ? { ...initialValues, owner_id: initialOwnerId } : initialValues);
    setErrors({});
    setBreedQuery(patient?.breed?.name ?? "");
    setIsBreedListOpen(false);
  }, [initialOwnerId, initialValues, patient]);

  useEffect(() => {
    if (values.species_id) {
      onSpeciesChange(Number(values.species_id));
    }
  }, [onSpeciesChange, values.species_id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit(normalizePayload(values));
  }

  function updateField(field: keyof PatientFormValues, value: string) {
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "species_id" ? { breed_id: "" } : {}),
    }));
    if (field === "species_id") {
      setBreedQuery("");
      setIsBreedListOpen(false);
    }
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateBreedQuery(query: string) {
    const selectedBreed = breeds.find((breed) => breed.name.toLocaleLowerCase() === query.trim().toLocaleLowerCase());
    setBreedQuery(query);
    setValues((current) => ({ ...current, breed_id: selectedBreed ? String(selectedBreed.id) : "" }));
    setErrors((current) => ({ ...current, breed_id: undefined }));
    setIsBreedListOpen(true);
  }

  function selectBreed(breed: Breed) {
    setBreedQuery(breed.name);
    setValues((current) => ({ ...current, breed_id: String(breed.id) }));
    setErrors((current) => ({ ...current, breed_id: undefined }));
    setIsBreedListOpen(false);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error ? <AlertMessage message={error} tone="error" /> : null}

      <Card className="p-6 sm:p-8">
        <div className="mb-7 flex items-center gap-4">
          <IconBadge className="h-11 w-11" icon={PawPrint} iconSize={24} />
          <h2 className="text-xl font-extrabold text-[#172554]">Informacion del paciente</h2>
        </div>

        <div className="mb-7 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-700">
          <Info className="mt-0.5 shrink-0" size={18} />
          <span>Para registrar un paciente, primero debes seleccionar un propietario existente.</span>
        </div>

        <div className="grid gap-7 lg:grid-cols-2">
          <FormSelect
            error={errors.owner_id}
            label="Propietario"
            onChange={(event) => updateField("owner_id", event.target.value)}
            required
            value={values.owner_id}
          >
            <option value="">Buscar y seleccionar propietario</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {getOwnerName(owner)}
              </option>
            ))}
          </FormSelect>

          <FormField
            error={errors.name}
            label="Nombre del paciente"
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Ej. Max, Luna, Rocky"
            required
            value={values.name}
          />

          <FormSelect
            error={errors.species_id}
            label="Especie"
            onChange={(event) => updateField("species_id", event.target.value)}
            required
            value={values.species_id}
          >
            <option value="">Selecciona una especie</option>
            {species.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </FormSelect>

          <label className="relative block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Raza <span className="text-red-500">*</span></span>
            <input
              className={`h-12 w-full rounded-lg border bg-white px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:bg-slate-50 disabled:text-slate-400 ${errors.breed_id ? "border-red-300" : "border-slate-200"}`}
              disabled={!values.species_id}
              onChange={(event) => updateBreedQuery(event.target.value)}
              onFocus={() => setIsBreedListOpen(true)}
              placeholder="Escribe o selecciona una raza"
              required
              value={breedQuery}
            />
            {isBreedListOpen && values.species_id ? (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg" role="listbox">
                {matchingBreeds.length ? matchingBreeds.map((breed) => (
                  <button
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-violet-50 hover:text-brand-700"
                    key={breed.id}
                    onMouseDown={(event) => { event.preventDefault(); selectBreed(breed); }}
                    role="option"
                    type="button"
                  >
                    {breed.name}
                  </button>
                )) : <p className="px-4 py-2 text-sm text-slate-500">No se encontraron razas.</p>}
              </div>
            ) : null}
            {errors.breed_id ? <span className="mt-2 block text-xs font-semibold text-red-600">{errors.breed_id}</span> : null}
            {!errors.breed_id ? <span className="mt-2 block text-xs font-medium text-slate-500">Escribe para filtrar y selecciona una raza de la lista.</span> : null}
          </label>

          <FormSelect
            error={errors.sex}
            label="Sexo"
            onChange={(event) => updateField("sex", event.target.value)}
            required
            value={values.sex}
          >
            <option value="">Selecciona el sexo</option>
            <option value="Macho">Macho</option>
            <option value="Hembra">Hembra</option>
          </FormSelect>

          <FormField
            error={errors.birth_date}
            label="Fecha de nacimiento"
            onChange={(event) => updateField("birth_date", event.target.value)}
            required
            type="date"
            value={values.birth_date}
          />

          <FormField
            error={errors.weight}
            label="Peso (kg)"
            min="0"
            onChange={(event) => updateField("weight", event.target.value)}
            placeholder="Ej. 12.5"
            required
            step="0.1"
            type="number"
            value={values.weight}
          />
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Cancelar
          </Button>
        ) : (
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            to="/patients"
          >
            Cancelar
          </Link>
        )}
        <Button disabled={isSaving} icon={<Save size={19} />} type="submit">
          {isSaving ? "Guardando..." : mode === "create" ? "Guardar paciente" : "Guardar cambios"}
        </Button>
      </div>

      <p className="text-sm font-medium text-slate-500">
        <span className="text-red-500">*</span> Los campos marcados con <span className="text-red-500">*</span> son
        obligatorios.
      </p>
    </form>
  );
}
