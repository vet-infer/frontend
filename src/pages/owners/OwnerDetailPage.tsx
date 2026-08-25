import { ArrowLeft, Edit3, Mail, PawPrint, Phone, Plus, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { DataTable } from "../../components/common/DataTable";
import { Modal } from "../../components/common/Modal";
import { OwnerForm } from "../../components/owners/OwnerForm";
import { PatientForm } from "../../components/patients/PatientForm";
import { ownerService } from "../../services/owner.service";
import { patientService } from "../../services/patient.service";
import type { Owner, OwnerPayload } from "../../types/owner";
import type { Breed, Patient, PatientPayload, Species } from "../../types/patient";
import { getErrorMessage as getResponseErrorMessage } from "../../utils/errors";

function getFullName(owner: Owner) {
  return [owner.first_name, owner.last_name].filter(Boolean).join(" ") || "Sin nombre";
}

function getInitials(owner: Owner) {
  return [owner.first_name, owner.last_name]
    .filter(Boolean)
    .map((part) => part!.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getOwnerLocation(owner: Owner) {
  return [owner.department, owner.province, owner.district].filter(Boolean).join(" / ") || "Sin ubicacion";
}

function getSpeciesBreed(patient: Patient) {
  return `${patient.species?.name ?? "Sin especie"} / ${patient.breed?.name ?? "Sin raza"}`;
}

function getErrorMessage(error: unknown) {
  return getResponseErrorMessage(error, "No fue posible completar la accion.");
}

export function OwnerDetailPage() {
  const { ownerId } = useParams();
  const [searchParams] = useSearchParams();
  const parsedOwnerId = ownerId ? Number(ownerId) : null;
  const [owner, setOwner] = useState<Owner | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPatientCreateOpen, setIsPatientCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPatientSaving, setIsPatientSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [patientFormError, setPatientFormError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOwner() {
      if (!parsedOwnerId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [ownerData, patientData, speciesData] = await Promise.all([
          ownerService.getById(parsedOwnerId),
          patientService.list().catch(() => [] as Patient[]),
          patientService.listSpecies(),
        ]);

        if (isMounted) {
          setOwner(ownerData);
          setPatients(patientData.filter((patient) => patient.owner?.id === parsedOwnerId));
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

    loadOwner();

    return () => {
      isMounted = false;
    };
  }, [parsedOwnerId]);

  const shouldFocusPatients = useMemo(() => searchParams.get("section") === "patients", [searchParams]);

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

  if (!parsedOwnerId || Number.isNaN(parsedOwnerId)) {
    return <Navigate replace to="/owners" />;
  }

  async function handleUpdate(payload: OwnerPayload) {
    if (!owner) {
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const updatedOwner = await ownerService.update(owner.id, payload);
      setOwner(updatedOwner);
      setSuccess("Propietario actualizado correctamente.");
      setIsEditOpen(false);
    } catch (caughtError) {
      setFormError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  function openPatientCreateModal() {
    setBreeds([]);
    setPatientFormError("");
    setIsPatientCreateOpen(true);
  }

  async function handleCreatePatient(payload: PatientPayload) {
    setIsPatientSaving(true);
    setPatientFormError("");

    try {
      const patient = await patientService.create(payload);
      setPatients((current) => [patient, ...current]);
      setSuccess(`Paciente ${patient.name} registrado correctamente.`);
      setIsPatientCreateOpen(false);
    } catch (caughtError) {
      setPatientFormError(getErrorMessage(caughtError));
    } finally {
      setIsPatientSaving(false);
    }
  }
  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-lg bg-slate-100" />;
  }

  if (error || !owner) {
    return <AlertMessage message={error || "Propietario no encontrado."} tone="error" />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link className="mb-6 inline-flex items-center gap-2 text-sm font-extrabold text-slate-500 hover:text-[#3026A6]" to="/owners">
            <ArrowLeft size={18} />
            Volver a Propietarios
          </Link>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">{getFullName(owner)}</h1>
          <p className="mt-2 text-base text-slate-500">Informacion general del propietario y pacientes asociados.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            icon={<Edit3 size={19} />}
            onClick={() => {
              setFormError("");
              setIsEditOpen(true);
            }}
            type="button"
            variant="secondary"
          >
            Editar
          </Button>
        </div>
      </section>

      {success ? <AlertMessage message={success} onClose={() => setSuccess("")} /> : null}

      <Card className="p-6 sm:p-8">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-violet-50 text-4xl font-extrabold text-[#3026A6]">
            {getInitials(owner)}
          </span>
          <div>
            <h2 className="text-3xl font-extrabold text-[#172554]">{getFullName(owner)}</h2>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-500">
              <PawPrint size={20} />
              {patients.length === 0 ? "Sin pacientes" : `${patients.length} ${patients.length === 1 ? "paciente" : "pacientes"}`}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard icon={Phone} label="Telefono" value={owner.phone || "Sin telefono"} />
          <InfoCard icon={Mail} label="Correo" value={owner.email || "Sin correo"} />
          <InfoCard icon={UserRound} label="Ubicacion" value={getOwnerLocation(owner)} />
          <InfoCard icon={UserRound} label="Direccion" value={owner.address || "Sin direccion"} />
        </div>
      </Card>

      <Card className={shouldFocusPatients ? "ring-2 ring-[#4635D3]/30" : undefined}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-xl font-extrabold text-[#172554]">
              <PawPrint size={24} />
              Pacientes asociados
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Pacientes registrados para este propietario.</p>
          </div>
          <Button
            icon={<Plus size={18} />}
            onClick={openPatientCreateModal}
            type="button"
          >
            Crear paciente
          </Button>
        </div>

        {patients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-extrabold text-[#172554]">No hay paciente registrado aun.</p>
            <p className="mt-2 text-sm text-slate-500">Crea un paciente para asociarlo a este propietario.</p>
          </div>
        ) : (
          <DataTable
            columns={["Paciente", "Especie / Raza", "Sexo", "Accion"]}
            rows={patients}
            renderRow={(patient) => (
              <tr key={patient.id}>
                <td className="px-5 py-4 font-extrabold text-slate-700">{patient.name}</td>
                <td className="px-5 py-4 font-semibold">{getSpeciesBreed(patient)}</td>
                <td className="px-5 py-4 font-semibold">{patient.sex || "Sin registrar"}</td>
                <td className="px-5 py-4">
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4635D3]/30"
                    to={`/patients/${patient.id}`}
                  >
                    Ver detalle
                  </Link>
                </td>
              </tr>
            )}
          />
        )}
      </Card>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar propietario">
        <OwnerForm
          error={formError}
          isSaving={isSaving}
          mode="edit"
          onCancel={() => setIsEditOpen(false)}
          onSubmit={handleUpdate}
          owner={owner}
        />
      </Modal>
      <Modal isOpen={isPatientCreateOpen} onClose={() => setIsPatientCreateOpen(false)} title="Nuevo paciente">
        <PatientForm
          breeds={breeds}
          error={patientFormError}
          initialOwnerId={String(owner.id)}
          isSaving={isPatientSaving}
          mode="create"
          onCancel={() => setIsPatientCreateOpen(false)}
          onSpeciesChange={handleSpeciesChange}
          onSubmit={handleCreatePatient}
          owners={[owner]}
          species={species}
        />
      </Modal>
    </div>
  );
}

type InfoCardProps = {
  icon: typeof Phone;
  label: string;
  value: string;
};

function InfoCard({ icon: Icon, label, value }: InfoCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
      <Icon className="shrink-0 text-[#4635D3]" size={25} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-1 break-words font-extrabold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
