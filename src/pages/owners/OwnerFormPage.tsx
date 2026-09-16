import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Skeleton } from "../../components/common/Skeleton";
import { OwnerForm } from "../../components/owners/OwnerForm";
import { ownerService } from "../../services/owner.service";
import type { Owner, OwnerPayload } from "../../types/owner";
import { getErrorMessage } from "../../utils/errors";

export function OwnerFormPage() {
  const navigate = useNavigate();
  const { ownerId } = useParams();
  const isEditMode = Boolean(ownerId);
  const parsedOwnerId = ownerId ? Number(ownerId) : null;
  const [owner, setOwner] = useState<Owner | undefined>();
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOwner() {
      if (!parsedOwnerId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const data = await ownerService.getById(parsedOwnerId);

        if (isMounted) {
          setOwner(data);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, "No fue posible guardar el propietario."));
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

  if (ownerId && Number.isNaN(parsedOwnerId)) {
    return <Navigate replace to="/owners" />;
  }

  async function handleSubmit(payload: OwnerPayload) {
    setIsSaving(true);
    setError("");

    try {
      if (isEditMode && parsedOwnerId) {
        await ownerService.update(parsedOwnerId, payload);
        navigate("/owners", { state: { message: "Propietario actualizado correctamente." } });
      } else {
        await ownerService.create(payload);
        navigate("/owners", { state: { message: "Propietario registrado correctamente." } });
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "No fue posible guardar el propietario."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-5 flex items-center gap-2 text-sm font-bold">
            <Link className="text-teal-500 hover:text-teal-700" to="/owners">
              Propietarios
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">{isEditMode ? "Editar propietario" : "Nuevo propietario"}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">
            {isEditMode ? "Editar propietario" : "Nuevo propietario"}
          </h1>
          <p className="mt-2 text-base text-slate-500">
            {isEditMode
              ? "Actualiza los datos del propietario para mantener su informacion al dia."
              : "Registra los datos del propietario para asociarle uno o mas pacientes."}
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          to="/owners"
        >
          <ArrowLeft size={18} />
          Volver
        </Link>
      </section>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-80" />
        </div>
      ) : null}

      {!isLoading && error && isEditMode && !owner ? <AlertMessage message={error} tone="error" /> : null}

      {!isLoading && (!isEditMode || owner) ? (
        <OwnerForm error={error} isSaving={isSaving} mode={isEditMode ? "edit" : "create"} onSubmit={handleSubmit} owner={owner} />
      ) : null}
    </div>
  );
}
