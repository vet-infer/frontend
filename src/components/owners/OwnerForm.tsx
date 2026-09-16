import { Save, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertMessage } from "../common/AlertMessage";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { FormField } from "../common/FormField";
import { FormSelect } from "../common/FormSelect";
import { IconBadge } from "../common/IconBadge";
import { PERU_UBIGEO } from "../../data/peruUbigeo";
import type { Owner, OwnerFormValues, OwnerPayload } from "../../types/owner";

type OwnerFormProps = {
  owner?: Owner;
  isSaving: boolean;
  error?: string;
  mode: "create" | "edit";
  onCancel?: () => void;
  onSubmit: (payload: OwnerPayload) => Promise<void>;
};

type FormErrors = Partial<Record<keyof OwnerFormValues, string>>;

const emptyValues: OwnerFormValues = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  address: "",
  department: "",
  province: "",
  district: "",
  ubigeo: "",
};

function normalizePayload(values: OwnerFormValues): OwnerPayload {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim() || null,
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    address: values.address.trim() || null,
    department: values.department.trim() || null,
    province: values.province.trim() || null,
    district: values.district.trim() || null,
    ubigeo: values.ubigeo.trim() || null,
  };
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+\s()-]/g, "");
}

function uniqueOptions(options: string[]) {
  return Array.from(new Set(options.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function validate(values: OwnerFormValues, requireLocation: boolean): FormErrors {
  const errors: FormErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (values.first_name.trim().length < 2) {
    errors.first_name = "Ingresa al menos 2 caracteres.";
  }

  if (!values.last_name.trim()) {
    errors.last_name = "Ingresa los apellidos del propietario.";
  }

  if (!values.phone.trim()) {
    errors.phone = "Ingresa un telefono de contacto.";
  } else if (values.phone.trim().length > 20) {
    errors.phone = "El telefono no debe superar 20 caracteres.";
  }

  if (!values.email.trim()) {
    errors.email = "Ingresa un correo electronico.";
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Ingresa un correo electronico valido.";
  }

  if (!values.address.trim()) {
    errors.address = "Ingresa la direccion completa.";
  }

  if (requireLocation && !values.department.trim()) {
    errors.department = "Selecciona el departamento.";
  }

  if (requireLocation && !values.province.trim()) {
    errors.province = "Selecciona la provincia.";
  }

  if (requireLocation && !values.district.trim()) {
    errors.district = "Selecciona el distrito.";
  }

  if (values.ubigeo.trim() && !/^\d{6}$/.test(values.ubigeo.trim())) {
    errors.ubigeo = "El ubigeo debe tener 6 digitos.";
  }

  return errors;
}

export function OwnerForm({ owner, mode, isSaving, error, onCancel, onSubmit }: OwnerFormProps) {
  const initialValues = useMemo<OwnerFormValues>(
    () =>
      owner
        ? {
            first_name: owner.first_name ?? "",
            last_name: owner.last_name ?? "",
            phone: owner.phone ?? "",
            email: owner.email ?? "",
            address: owner.address ?? "",
            department: owner.department ?? "",
            province: owner.province ?? "",
            district: owner.district ?? "",
            ubigeo: owner.ubigeo ?? "",
          }
        : emptyValues,
    [owner]
  );

  const [values, setValues] = useState<OwnerFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});

  const selectedDepartment = useMemo(
    () => PERU_UBIGEO.find((department) => department.name === values.department),
    [values.department]
  );
  const selectedProvince = useMemo(
    () => selectedDepartment?.provinces.find((province) => province.name === values.province),
    [selectedDepartment, values.province]
  );
  const departmentOptions = useMemo(
    () => uniqueOptions([...PERU_UBIGEO.map((department) => department.name), values.department]),
    [values.department]
  );
  const provinceOptions = useMemo(
    () => uniqueOptions([...(selectedDepartment?.provinces.map((province) => province.name) ?? []), values.province]),
    [selectedDepartment, values.province]
  );
  const districtOptions = useMemo(
    () => uniqueOptions([...(selectedProvince?.districts.map((district) => district.name) ?? []), values.district]),
    [selectedProvince, values.district]
  );

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hasLocationStarted = Boolean(values.department || values.province || values.district || values.ubigeo);
    const nextErrors = validate(values, mode === "create" || hasLocationStarted);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit(normalizePayload(values));
  }

  function updateField(field: keyof OwnerFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: field === "phone" ? normalizePhone(value) : value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateDepartment(department: string) {
    setValues((current) => ({ ...current, department, province: "", district: "", ubigeo: "" }));
    setErrors((current) => ({ ...current, department: undefined, province: undefined, district: undefined, ubigeo: undefined }));
  }

  function updateProvince(province: string) {
    setValues((current) => ({ ...current, province, district: "", ubigeo: "" }));
    setErrors((current) => ({ ...current, province: undefined, district: undefined, ubigeo: undefined }));
  }

  function updateDistrict(districtName: string) {
    const district = selectedProvince?.districts.find((item) => item.name === districtName);
    setValues((current) => ({ ...current, district: districtName, ubigeo: district?.code ?? current.ubigeo }));
    setErrors((current) => ({ ...current, district: undefined, ubigeo: undefined }));
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error ? <AlertMessage message={error} tone="error" /> : null}

      <Card className="p-6 sm:p-8">
        <div className="mb-8 flex items-center gap-4">
          <IconBadge className="h-11 w-11" icon={UserRound} iconSize={24} />
          <h2 className="text-xl font-extrabold text-[#172554]">Informacion del propietario</h2>
        </div>

        <div className="grid gap-7 lg:grid-cols-2">
          <FormField
            error={errors.first_name}
            label="Nombres"
            onChange={(event) => updateField("first_name", event.target.value)}
            placeholder="Ej. Maria Elena"
            required
            value={values.first_name}
          />
          <FormField
            error={errors.last_name}
            label="Apellidos"
            onChange={(event) => updateField("last_name", event.target.value)}
            placeholder="Ej. Garcia Lopez"
            required
            value={values.last_name}
          />
          <FormField
            error={errors.phone}
            helpText="Incluye codigo de pais y/o ciudad."
            inputMode="tel"
            label="Telefono"
            maxLength={20}
            onBeforeInput={(event) => {
              const data = (event.nativeEvent as InputEvent).data;

              if (data && /[a-zA-Z]/.test(data)) {
                event.preventDefault();
              }
            }}
            onChange={(event) => updateField("phone", event.target.value)}
            pattern="[0-9+\s()-]*"
            placeholder="Ej. +51 999 000 111"
            required
            type="tel"
            value={values.phone}
          />
          <FormField
            error={errors.email}
            helpText="Se usara para contacto del propietario."
            label="Correo electronico"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="Ej. maria.garcia@email.com"
            required
            type="email"
            value={values.email}
          />
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="mb-8">
          <h2 className="text-xl font-extrabold text-[#172554]">Ubicacion del propietario</h2>
        </div>

        <div className="grid gap-7 lg:grid-cols-3">
          <FormSelect
            error={errors.department}
            label="Departamento"
            onChange={(event) => updateDepartment(event.target.value)}
            required
            value={values.department}
          >
            <option value="">Seleccionar departamento</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            disabled={!values.department}
            error={errors.province}
            label="Provincia"
            onChange={(event) => updateProvince(event.target.value)}
            required
            value={values.province}
          >
            <option value="">Seleccionar provincia</option>
            {provinceOptions.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            disabled={!values.province}
            error={errors.district}
            helpText={values.ubigeo ? `Ubigeo: ${values.ubigeo}` : undefined}
            label="Distrito"
            onChange={(event) => updateDistrict(event.target.value)}
            required
            value={values.district}
          >
            <option value="">Seleccionar distrito</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </FormSelect>
          <div className="lg:col-span-3">
            <FormField
              error={errors.address}
              helpText="Mantiene compatibilidad con registros historicos y direccion exacta."
              label="Direccion"
              onChange={(event) => updateField("address", event.target.value)}
              placeholder="Ej. Av. Siempreviva 742"
              required
              value={values.address}
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Cancelar
          </Button>
        ) : (
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            to="/owners"
          >
            Cancelar
          </Link>
        )}
        <Button disabled={isSaving} icon={<Save size={19} />} type="submit">
          {isSaving ? "Guardando..." : mode === "create" ? "Guardar propietario" : "Guardar cambios"}
        </Button>
      </div>

      <p className="text-sm font-medium text-slate-500">
        <span className="text-red-500">*</span> Los campos marcados con <span className="text-red-500">*</span> son
        obligatorios.
      </p>
    </form>
  );
}