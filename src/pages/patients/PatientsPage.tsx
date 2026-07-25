import { CalendarPlus, Cat, Dog, Edit3, Eye, PawPrint, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Modal } from "../../components/common/Modal";
import { PatientForm } from "../../components/patients/PatientForm";
import { ownerService } from "../../services/owner.service";
import { patientService } from "../../services/patient.service";
import type { Owner } from "../../types/owner";
import type { Breed, Patient, PatientPayload, Species } from "../../types/patient";
import { cn } from "../../utils/cn";
import { getErrorMessage as getResponseErrorMessage } from "../../utils/errors";

type FilterMode = "all" | "dogs" | "cats";

type LocationState = {
  message?: string;
};

const filters: { label: string; value: FilterMode; icon?: typeof Dog }[] = [
  { label: "Todos", value: "all" },
  { label: "Perros", value: "dogs", icon: Dog },
  { label: "Gatos", value: "cats", icon: Cat },
];

function getOwnerName(patient: Patient) {
  return [patient.owner.first_name, patient.owner.last_name].filter(Boolean).join(" ") || "Sin propietario";
}

function getSpeciesName(patient: Patient) {
  return patient.species?.name ?? "Sin especie";
}

function getBreedName(patient: Patient) {
  return patient.breed?.name ?? "Sin raza";
}

function getInitial(patient: Patient) {
  return patient.name.charAt(0).toUpperCase();
}

function calculateAge(birthDate?: string | null) {
  if (!birthDate) {
    return "Sin fecha";
  }

  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    years -= 1;
  }

  if (years <= 0) {
    const months = Math.max(
      0,
      (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth()
    );
    return `${months || 1} ${months === 1 ? "mes" : "meses"}`;
  }

  return `${years} ${years === 1 ? "año" : "años"}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Sin registrar";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getErrorMessage(error: unknown) {
  return getResponseErrorMessage(error, "No fue posible cargar los pacientes.");
}

export function PatientsPage() {
  const location = useLocation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState((location.state as LocationState | null)?.message ?? "");

  useEffect(() => {
    let isMounted = true;

    async function loadPatients() {
      setIsLoading(true);
      setError("");

      try {
        const [patientData, ownerData, speciesData] = await Promise.all([
          patientService.list(),
          ownerService.list(),
          patientService.listSpecies(),
        ]);

        if (isMounted) {
          setPatients(patientData);
          setOwners(ownerData);
          setSpecies(speciesData);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPatients();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSpeciesChange = useCallback(async (speciesId: number | null) => {
    if (!speciesId) {
      setBreeds([]);
      return;
    }

    try {
      const data = await patientService.listBreeds(speciesId);
      setBreeds(data);
    } catch {
      setBreeds([]);
    }
  }, []);

  function openCreateModal() {
    setBreeds([]);
    setFormError("");
    setIsCreateOpen(true);
  }

  function openEditModal(patient: Patient) {
    setBreeds([]);
    setFormError("");
    setPatientToEdit(patient);
  }

  async function handleCreate(payload: PatientPayload) {
    setIsSaving(true);
    setFormError("");

    try {
      const patient = await patientService.create(payload);
      setPatients((current) => [patient, ...current]);
      setSuccess("Paciente registrado correctamente.");
      setIsCreateOpen(false);
    } catch (caughtError) {
      setFormError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(payload: PatientPayload) {
    if (!patientToEdit) {
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const patient = await patientService.update(patientToEdit.id, payload);
      setPatients((current) => current.map((item) => (item.id === patient.id ? patient : item)));
      setSuccess("Paciente actualizado correctamente.");
      setPatientToEdit(null);
    } catch (caughtError) {
      setFormError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!patientToDelete) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await patientService.remove(patientToDelete.id);
      setPatients((current) => current.filter((patient) => patient.id !== patientToDelete.id));
      setSuccess(`Paciente ${patientToDelete.name} eliminado correctamente.`);
      setPatientToDelete(null);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return patients.filter((patient) => {
      const speciesName = getSpeciesName(patient).toLowerCase();
      const matchesQuery = normalizedQuery
        ? [patient.name, getOwnerName(patient), getSpeciesName(patient), getBreedName(patient)]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedQuery))
        : true;

      const matchesFilter =
        filter === "all" ||
        (filter === "dogs" && ["perro", "canino"].some((word) => speciesName.includes(word))) ||
        (filter === "cats" && ["gato", "felino"].some((word) => speciesName.includes(word)));

      return matchesQuery && matchesFilter;
    });
  }, [filter, patients, query]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">Gestion de Pacientes</h1>
          <p className="mt-2 text-base text-slate-500">Consulta y administra los pacientes asociados a propietarios.</p>
        </div>
        <Button
          className="sm:min-h-12 sm:px-5"
          icon={<PawPrint size={21} />}
          onClick={openCreateModal}
          type="button"
        >
          Nuevo paciente
        </Button>
      </section>

      {success ? <AlertMessage message={success} onClose={() => setSuccess("")} /> : null}
      {error ? <AlertMessage message={error} tone="error" onClose={() => setError("")} /> : null}

      <Card className="p-5 sm:p-6">
        <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            <input
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#4635D3] focus:ring-4 focus:ring-[#4635D3]/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por paciente, propietario, especie o raza..."
              value={query}
            />
          </label>
          <div className="flex flex-wrap justify-start gap-3 xl:justify-end">
            {filters.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  className={cn(
                    "inline-flex h-12 items-center gap-2 rounded-lg px-7 text-sm font-bold transition",
                    filter === item.value
                      ? "bg-[#4635D3] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-violet-50"
                  )}
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  type="button"
                >
                  {Icon ? <Icon size={19} /> : null}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? <PatientsLoadingState /> : null}

        {!isLoading && filteredPatients.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-violet-50 text-[#4635D3]">
                <PawPrint size={30} />
              </span>
              <h2 className="mt-5 text-xl font-extrabold text-[#172554]">No hay pacientes para mostrar</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Registra un paciente o ajusta los filtros para encontrar resultados.
              </p>
              <Button
                className="mt-5"
                icon={<PawPrint size={18} />}
                onClick={openCreateModal}
                type="button"
              >
                Registrar paciente
              </Button>
            </div>
          </div>
        ) : null}

        {!isLoading && filteredPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] border-collapse text-left text-sm">
              <thead>
                <tr className="border border-slate-100 bg-slate-50 text-sm font-extrabold text-slate-600">
                  <th className="px-5 py-4">Paciente</th>
                  <th className="px-5 py-4">Especie / raza</th>
                  <th className="px-5 py-4">Propietario</th>
                  <th className="px-5 py-4">Edad</th>
                  <th className="px-5 py-4">Sexo</th>
                  <th className="px-5 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 border-x border-b border-slate-100 text-slate-600">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-4">
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#635BFF] bg-violet-50 text-lg font-extrabold text-[#3026A6]">
                          {getInitial(patient)}
                        </span>
                        <span className="font-extrabold text-slate-800">{patient.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        {getSpeciesName(patient).toLowerCase().includes("gat") ||
                        getSpeciesName(patient).toLowerCase().includes("fel") ? (
                          <Cat size={18} />
                        ) : (
                          <Dog size={18} />
                        )}
                        {getSpeciesName(patient)} · {getBreedName(patient)}
                      </span>
                    </td>
                    <td className="px-5 py-5 font-semibold">{getOwnerName(patient)}</td>
                    <td className="px-5 py-5 font-semibold">
                      {calculateAge(patient.birth_date)}
                      <span className="mt-1 block text-xs text-slate-500">({formatDate(patient.birth_date)})</span>
                    </td>
                    <td className="px-5 py-5 font-semibold">{patient.sex || "Sin registrar"}</td>
                    <td className="px-5 py-5">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4635D3]/30"
                          to={`/patients/${patient.id}`}
                        >
                          <Eye size={17} />
                          Ver detalle
                        </Link>
                        <Button
                          className="h-10 px-3"
                          onClick={() => openEditModal(patient)}
                          type="button"
                          variant="secondary"
                        >
                          <Edit3 size={17} />
                          Editar
                        </Button>
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#3026A6] shadow-sm transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-[#4635D3]/30"
                          to={`/evaluations?patientId=${patient.id}`}
                        >
                          <CalendarPlus size={17} />
                          Nueva evaluacion
                        </Link>
                        <Button
                          className="h-10 px-3 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setPatientToDelete(patient)}
                          type="button"
                          variant="secondary"
                        >
                          <Trash2 size={17} />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-4 border-t border-slate-100 px-3 py-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Mostrando 1 a {filteredPatients.length} de {filteredPatients.length} pacientes
              </span>
              <div className="flex items-center gap-2">
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400" type="button">
                  ‹
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-lg bg-[#4635D3] font-extrabold text-white" type="button">
                  1
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400" type="button">
                  ›
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nuevo paciente">
        <PatientForm
          breeds={breeds}
          error={formError}
          isSaving={isSaving}
          mode="create"
          onCancel={() => setIsCreateOpen(false)}
          onSpeciesChange={handleSpeciesChange}
          onSubmit={handleCreate}
          owners={owners}
          species={species}
        />
      </Modal>

      <Modal isOpen={Boolean(patientToEdit)} onClose={() => setPatientToEdit(null)} title="Editar paciente">
        {patientToEdit ? (
          <PatientForm
            breeds={breeds}
            error={formError}
            isSaving={isSaving}
            mode="edit"
            onCancel={() => setPatientToEdit(null)}
            onSpeciesChange={handleSpeciesChange}
            onSubmit={handleUpdate}
            owners={owners}
            patient={patientToEdit}
            species={species}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        confirmLabel="Eliminar"
        isLoading={isDeleting}
        isOpen={Boolean(patientToDelete)}
        message={
          patientToDelete
            ? `Se eliminara a ${patientToDelete.name}. Esta accion no se puede deshacer.`
            : ""
        }
        onCancel={() => setPatientToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar paciente"
      />
    </div>
  );
}

function PatientsLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" key={index} />
      ))}
    </div>
  );
}
