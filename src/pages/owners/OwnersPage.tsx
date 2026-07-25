import { Edit3, Eye, Mail, Phone, Search, Trash2, UserPlus, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Modal } from "../../components/common/Modal";
import { OwnerForm } from "../../components/owners/OwnerForm";
import { PatientForm } from "../../components/patients/PatientForm";
import { ownerService } from "../../services/owner.service";
import { patientService } from "../../services/patient.service";
import type { Owner, OwnerPayload } from "../../types/owner";
import type { Breed, Patient, PatientPayload, Species } from "../../types/patient";
import { cn } from "../../utils/cn";
import { getErrorMessage as getResponseErrorMessage } from "../../utils/errors";

type FilterMode = "all" | "with-pets" | "without-pets";

type LocationState = {
  message?: string;
};

type OwnerRow = Owner & {
  petCount: number;
};

const filters: { label: string; value: FilterMode }[] = [
  { label: "Todos", value: "all" },
  { label: "Con pacientes", value: "with-pets" },
  { label: "Sin pacientes", value: "without-pets" },
];

function getFullName(owner: Owner) {
  return [owner.first_name, owner.last_name].filter(Boolean).join(" ");
}

function getInitials(owner: Owner) {
  const parts = [owner.first_name, owner.last_name].filter((part): part is string => Boolean(part));
  return parts
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getOwnerLocation(owner: Owner) {
  return [owner.department, owner.province, owner.district].filter(Boolean).join(" / ") || owner.address || "Sin ubicacion";
}

function getOwnerIdFromPatient(patient: Patient) {
  return patient.owner?.id;
}

function getErrorMessage(error: unknown) {
  return getResponseErrorMessage(error, "No fue posible completar la accion.");
}

export function OwnersPage() {
  const location = useLocation();
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState((location.state as LocationState | null)?.message ?? "");
  const [ownerToDelete, setOwnerToDelete] = useState<OwnerRow | null>(null);
  const [ownerToEdit, setOwnerToEdit] = useState<OwnerRow | null>(null);
  const [ownerForPatient, setOwnerForPatient] = useState<OwnerRow | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPatientSaving, setIsPatientSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [patientFormError, setPatientFormError] = useState("");

  async function loadOwners() {
    setIsLoading(true);
    setError("");

    try {
      const [ownerData, patientData, speciesData] = await Promise.all([
        ownerService.list(),
        patientService.list().catch(() => [] as Patient[]),
        patientService.listSpecies(),
      ]);

      const petCounts = patientData.reduce<Record<number, number>>((accumulator, patient) => {
        const ownerId = getOwnerIdFromPatient(patient);

        if (ownerId) {
          accumulator[ownerId] = (accumulator[ownerId] ?? 0) + 1;
        }

        return accumulator;
      }, {});

      setOwners(ownerData.map((owner) => ({ ...owner, petCount: petCounts[owner.id] ?? 0 })));
      setSpecies(speciesData);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOwners();
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

  const filteredOwners = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return owners.filter((owner) => {
      const matchesQuery = normalizedQuery
        ? [getFullName(owner), owner.phone, owner.email, owner.address, getOwnerLocation(owner), owner.ubigeo]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery))
        : true;

      const matchesFilter =
        filter === "all" ||
        (filter === "with-pets" && owner.petCount > 0) ||
        (filter === "without-pets" && owner.petCount === 0);

      return matchesQuery && matchesFilter;
    });
  }, [filter, owners, query]);

  async function handleDelete() {
    if (!ownerToDelete) {
      return;
    }

    if (ownerToDelete.petCount > 0) {
      setError("No puedes eliminar un propietario con pacientes relacionados.");
      setOwnerToDelete(null);
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await ownerService.remove(ownerToDelete.id);
      setOwners((current) => current.filter((owner) => owner.id !== ownerToDelete.id));
      setSuccess(`Propietario ${getFullName(ownerToDelete)} eliminado correctamente.`);
      setOwnerToDelete(null);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCreate(payload: OwnerPayload) {
    setIsSaving(true);
    setFormError("");

    try {
      const owner = await ownerService.create(payload);
      setOwners((current) => [{ ...owner, petCount: 0 }, ...current]);
      setSuccess("Propietario registrado correctamente.");
      setIsCreateOpen(false);
    } catch (caughtError) {
      setFormError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(payload: OwnerPayload) {
    if (!ownerToEdit) {
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const owner = await ownerService.update(ownerToEdit.id, payload);
      setOwners((current) =>
        current.map((item) => (item.id === owner.id ? { ...owner, petCount: item.petCount } : item))
      );
      setSuccess("Propietario actualizado correctamente.");
      setOwnerToEdit(null);
    } catch (caughtError) {
      setFormError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  function openPatientModal(owner: OwnerRow) {
    setBreeds([]);
    setPatientFormError("");
    setOwnerForPatient(owner);
  }

  async function handleCreatePatient(payload: PatientPayload) {
    setIsPatientSaving(true);
    setPatientFormError("");

    try {
      const patient = await patientService.create(payload);
      setOwners((current) =>
        current.map((owner) =>
          owner.id === patient.owner.id ? { ...owner, petCount: owner.petCount + 1 } : owner
        )
      );
      setSuccess(`Paciente ${patient.name} registrado correctamente.`);
      setOwnerForPatient(null);
    } catch (caughtError) {
      setPatientFormError(getErrorMessage(caughtError));
    } finally {
      setIsPatientSaving(false);
    }
  }
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">Gestion de Propietarios</h1>
          <p className="mt-2 text-base text-slate-500">Administra los propietarios y sus pacientes asociados.</p>
        </div>
        <Button
          className="sm:min-h-12 sm:px-5"
          icon={<UserPlus size={21} />}
          onClick={() => {
            setFormError("");
            setIsCreateOpen(true);
          }}
          type="button"
        >
          Nuevo propietario
        </Button>
      </section>

      {success ? <AlertMessage message={success} onClose={() => setSuccess("")} /> : null}
      {error ? <AlertMessage message={error} tone="error" onClose={() => setError("")} /> : null}

      <Card className="p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            <input
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#4635D3] focus:ring-4 focus:ring-[#4635D3]/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, apellido, telefono o correo..."
              value={query}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            {filters.map((item) => (
              <button
                className={cn(
                  "h-12 rounded-full px-7 text-sm font-bold transition",
                  filter === item.value
                    ? "bg-[#4635D3] text-white shadow-sm"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-violet-50"
                )}
                key={item.value}
                onClick={() => setFilter(item.value)}
                type="button"
        >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? <OwnersLoadingState /> : null}

        {!isLoading && filteredOwners.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-violet-50 text-[#4635D3]">
                <UsersRound size={30} />
              </span>
              <h2 className="mt-5 text-xl font-extrabold text-[#172554]">No hay propietarios para mostrar</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Registra el primer propietario o ajusta los filtros de busqueda para ver resultados.
              </p>
              <Button
                className="mt-5"
                icon={<UserPlus size={18} />}
                onClick={() => {
                  setFormError("");
                  setIsCreateOpen(true);
                }}
                type="button"
        >
                Registrar propietario
              </Button>
            </div>
          </div>
        ) : null}

        {!isLoading && filteredOwners.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-sm font-extrabold text-slate-600">
                  <th className="px-3 py-4">Propietario</th>
                  <th className="px-3 py-4">Contacto</th>
                  <th className="px-3 py-4">Ubicacion</th>
                  <th className="px-3 py-4">Pacientes asociados</th>
                  <th className="px-3 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredOwners.map((owner) => (
                  <tr key={owner.id}>
                    <td className="px-3 py-5">
                      <div className="flex items-center gap-4">
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-violet-50 text-lg font-extrabold text-[#3026A6]">
                          {getInitials(owner)}
                        </span>
                        <span className="font-extrabold text-slate-700">{getFullName(owner)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-5">
                      <div className="space-y-2">
                        <span className="flex items-center gap-2 font-semibold">
                          <Phone size={17} />
                          {owner.phone || "Sin telefono"}
                        </span>
                        <span className="flex items-center gap-2 font-semibold">
                          <Mail size={17} />
                          {owner.email || "Sin correo"}
                        </span>
                      </div>
                    </td>
                    <td className="min-w-64 px-3 py-5 font-semibold"><div>{getOwnerLocation(owner)}</div><div className="mt-1 text-xs font-medium text-slate-400">{owner.address || "Sin direccion exacta"}</div></td>
                    <td className="px-3 py-5">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-4 py-2 text-xs font-extrabold",
                          owner.petCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}
        >
                        {owner.petCount === 0
                          ? "Sin pacientes"
                          : `${owner.petCount} ${owner.petCount === 1 ? "paciente" : "pacientes"}`}
                      </span>
                    </td>
                    <td className="px-3 py-5">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4635D3]/30"
                          to={`/owners/${owner.id}`}
        >
                          <Eye size={17} />
                          Ver detalle
                        </Link>
                        <Button
                          className="h-10 px-3"
                          onClick={() => openPatientModal(owner)}
                          type="button"
                          variant="secondary"
        >
                          <UserPlus size={17} />
                          Crear paciente
                        </Button>
                        <Button
                          className="h-10 px-3"
                          onClick={() => {
                            setFormError("");
                            setOwnerToEdit(owner);
                          }}
                          type="button"
                          variant="secondary"
        >
                          <Edit3 size={17} />
                          Editar
                        </Button>
                        <Button
                          className="h-10 px-3 border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          disabled={owner.petCount > 0}
                          onClick={() => setOwnerToDelete(owner)}
                          title={
                            owner.petCount > 0
                              ? "No se puede eliminar porque tiene pacientes relacionados."
                              : "Eliminar propietario"
                          }
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
                Mostrando 1 a {filteredOwners.length} de {filteredOwners.length} propietarios
              </span>
              <div className="flex items-center gap-2">
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400" type="button">
                  &lt;
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-lg bg-[#4635D3] font-extrabold text-white" type="button">
                  1
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400" type="button">
                  {">"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <ConfirmDialog
        confirmLabel="Eliminar"
        isLoading={isDeleting}
        isOpen={Boolean(ownerToDelete)}
        message={
          ownerToDelete
            ? `Se eliminara a ${getFullName(ownerToDelete)}. Esta accion no se puede deshacer.`
            : ""
        }
        onCancel={() => setOwnerToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar propietario"
      />

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Nuevo propietario"
        >
        <OwnerForm
          error={formError}
          isSaving={isSaving}
          mode="create"
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal
        isOpen={Boolean(ownerToEdit)}
        onClose={() => setOwnerToEdit(null)}
        title="Editar propietario"
        >
        {ownerToEdit ? (
          <OwnerForm
            error={formError}
            isSaving={isSaving}
            mode="edit"
            onCancel={() => setOwnerToEdit(null)}
            onSubmit={handleUpdate}
            owner={ownerToEdit}
          />
        ) : null}
      </Modal>
      <Modal
        isOpen={Boolean(ownerForPatient)}
        onClose={() => setOwnerForPatient(null)}
        title="Nuevo paciente"
        >
        {ownerForPatient ? (
          <PatientForm
            breeds={breeds}
            error={patientFormError}
            initialOwnerId={String(ownerForPatient.id)}
            isSaving={isPatientSaving}
            mode="create"
            onCancel={() => setOwnerForPatient(null)}
            onSpeciesChange={handleSpeciesChange}
            onSubmit={handleCreatePatient}
            owners={owners}
            species={species}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function OwnersLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" key={index} />
      ))}
    </div>
  );
}
