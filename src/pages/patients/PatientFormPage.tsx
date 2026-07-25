import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { PatientForm } from "../../components/patients/PatientForm";
import { ownerService } from "../../services/owner.service";
import { patientService } from "../../services/patient.service";
import type { Owner } from "../../types/owner";
import type { Breed, Patient, PatientPayload, Species } from "../../types/patient";
import { getErrorMessage as getResponseErrorMessage } from "../../utils/errors";

function getErrorMessage(error: unknown) {
  return getResponseErrorMessage(error, "No fue posible guardar el paciente.");
}

export function PatientFormPage() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(patientId);
  const parsedPatientId = patientId ? Number(patientId) : null;
  const initialOwnerId = searchParams.get("ownerId") ?? "";
  const [patient, setPatient] = useState<Patient | undefined>();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      setError("");

      try {
        const [ownerData, speciesData, patientData] = await Promise.all([
          ownerService.list(),
          patientService.listSpecies(),
          parsedPatientId ? patientService.getById(parsedPatientId) : Promise.resolve(undefined),
        ]);

        const breedData = patientData?.species?.id ? await patientService.listBreeds(patientData.species.id) : [];

        if (isMounted) {
          setOwners(ownerData);
          setSpecies(speciesData);
          setPatient(patientData);
          setBreeds(breedData);
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

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [parsedPatientId]);

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

  if (patientId && Number.isNaN(parsedPatientId)) {
    return <Navigate replace to="/patients" />;
  }

  async function handleSubmit(payload: PatientPayload) {
    setIsSaving(true);
    setError("");

    try {
      if (isEditMode && parsedPatientId) {
        await patientService.update(parsedPatientId, payload);
        navigate("/patients", { state: { message: "Paciente actualizado correctamente." } });
      } else {
        await patientService.create(payload);
        navigate("/patients", { state: { message: "Paciente registrado correctamente." } });
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-5 flex items-center gap-2 text-sm font-extrabold">
            <Link className="text-[#4635D3] hover:text-[#3026A6]" to="/patients">
              Pacientes
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">{isEditMode ? "Editar paciente" : "Nuevo paciente"}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">
            {isEditMode ? "Editar paciente" : "Nuevo paciente"}
          </h1>
          <p className="mt-2 text-base text-slate-500">
            {isEditMode
              ? "Actualiza los datos principales del paciente."
              : "Registra los datos principales del paciente."}
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          to="/patients"
        >
          <ArrowLeft size={18} />
          Volver
        </Link>
      </section>

      {isLoading ? <div className="h-96 animate-pulse rounded-lg bg-slate-100" /> : null}

      {!isLoading && error && isEditMode && !patient ? <AlertMessage message={error} tone="error" /> : null}

      {!isLoading && (!isEditMode || patient) ? (
        <PatientForm
          breeds={breeds}
          error={error}
          initialOwnerId={initialOwnerId}
          isSaving={isSaving}
          mode={isEditMode ? "edit" : "create"}
          onSpeciesChange={handleSpeciesChange}
          onSubmit={handleSubmit}
          owners={owners}
          patient={patient}
          species={species}
        />
      ) : null}
    </div>
  );
}
