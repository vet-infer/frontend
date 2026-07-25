import {
  CheckCircle2,
  Edit3,
  EyeOff,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Save,
  Settings,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
  Power,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { DataTable } from "../../components/common/DataTable";
import { FormField } from "../../components/common/FormField";
import { FormSelect } from "../../components/common/FormSelect";
import { Modal } from "../../components/common/Modal";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/auth.service";
import { userService } from "../../services/user.service";
import type { User, UserFormValues } from "../../types/user";
import { cn } from "../../utils/cn";
import { getErrorMessage as getResponseErrorMessage } from "../../utils/errors";

type SettingsTab = "general" | "preferences" | "security" | "users";

type FormErrors = Partial<Record<keyof UserFormValues, string>>;

type PasswordFormValues = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

type PasswordFormErrors = Partial<Record<keyof PasswordFormValues, string>>;

const adminRoleId = 1;
const veterinarianRoleId = 2;

const initialUserForm: UserFormValues = {
  full_name: "",
  email: "",
  password: "",
  role_id: String(veterinarianRoleId),
};

const initialPasswordForm: PasswordFormValues = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const tabs: { id: SettingsTab; label: string; adminOnly?: boolean }[] = [
  { id: "general", label: "General" },
  { id: "security", label: "Seguridad" },
  { id: "users", label: "Usuarios", adminOnly: true },
];

function getErrorMessage(error: unknown) {
  return getResponseErrorMessage(error, "No fue posible completar la accion.");
}

function validateUserForm(values: UserFormValues): FormErrors {
  const errors: FormErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (values.full_name.trim().length < 3) {
    errors.full_name = "Ingresa al menos 3 caracteres.";
  }

  if (!emailPattern.test(values.email.trim())) {
    errors.email = "Ingresa un correo valido.";
  }

  if (values.password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  }

  if (!values.role_id) {
    errors.role_id = "Selecciona un rol.";
  }

  return errors;
}

function validateEditUserForm(values: UserFormValues): FormErrors {
  const errors = validateUserForm({ ...values, password: values.password || "password-placeholder" });

  if (!values.password) {
    delete errors.password;
  }

  return errors;
}

function validatePasswordForm(values: PasswordFormValues): PasswordFormErrors {
  const errors: PasswordFormErrors = {};

  if (values.current_password.length < 8) {
    errors.current_password = "La contraseña actual debe tener al menos 8 caracteres.";
  }

  if (values.new_password.length < 8) {
    errors.new_password = "La nueva contraseña debe tener al menos 8 caracteres.";
  } else if (values.new_password === values.current_password) {
    errors.new_password = "La nueva contraseña debe ser diferente de la actual.";
  }

  if (values.confirm_password !== values.new_password) {
    errors.confirm_password = "Las contraseñas no coinciden.";
  }

  return errors;
}

function roleLabel(role?: string | null) {
  if (role === "admin") {
    return "ADMINISTRADOR";
  }

  if (role === "veterinario") {
    return "VETERINARIO";
  }

  if (role === "evaluador") {
    return "EVALUADOR";
  }

  return "SIN ROL";
}

function findUserByEmail(users: User[], email: string, ignoredUserId?: number) {
  const normalizedEmail = email.trim().toLowerCase();
  return users.find((item) => item.email.trim().toLowerCase() === normalizedEmail && item.id !== ignoredUserId);
}

function isDuplicateEmailError(message: string) {
  return message.toLowerCase().includes("ya existe") && message.toLowerCase().includes("correo");
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { logout, role, isAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [theme, setTheme] = useState("light");
  const [density, setDensity] = useState("comfortable");
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState<UserFormValues>(initialUserForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<number | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState<UserFormValues>(initialUserForm);
  const [editFormErrors, setEditFormErrors] = useState<FormErrors>({});
  const [passwordForm, setPasswordForm] = useState<PasswordFormValues>(initialPasswordForm);
  const [passwordFormErrors, setPasswordFormErrors] = useState<PasswordFormErrors>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const currentUser = useMemo(() => profileUser ?? users.find((item) => item.id === user.id) ?? null, [profileUser, user.id, users]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfileUser() {
      try {
        const data = await authService.getCurrentUser();
        if (isMounted) {
          setProfileUser(data);
        }
      } catch {
        if (isMounted) {
          setProfileUser(null);
        }
      }
    }

    loadProfileUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isMounted = true;

    async function loadUsers() {
      setIsLoadingUsers(true);
      setError("");

      try {
        const data = await userService.list();

        if (isMounted) {
          setUsers(data);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function updatePasswordForm(field: keyof PasswordFormValues, value: string) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    setPasswordFormErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validatePasswordForm(passwordForm);
    setPasswordFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsChangingPassword(true);
    setError("");

    try {
      const response = await authService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm(initialPasswordForm);
      setMessage(response.message);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      setError("No tienes permisos para crear usuarios.");
      return;
    }

    const nextErrors = validateUserForm(userForm);
    const duplicatedUser = findUserByEmail(users, userForm.email);

    if (duplicatedUser) {
      nextErrors.email = "Ya existe un usuario con ese correo.";
    }

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsCreatingUser(true);
    setError("");

    try {
      const created = await userService.create({
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        role_id: Number(userForm.role_id),
      });

      setUsers((current) => [...current, created]);
      setUserForm(initialUserForm);
      setMessage("Usuario creado correctamente.");
    } catch (caughtError) {
      const errorMessage = getErrorMessage(caughtError);

      if (isDuplicateEmailError(errorMessage)) {
        setFormErrors((current) => ({ ...current, email: errorMessage }));
      }

      setError(errorMessage);
    } finally {
      setIsCreatingUser(false);
    }
  }

  function updateUserForm(field: keyof UserFormValues, value: string) {
    setUserForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  }

  function openEditUser(userToUpdate: User) {
    setUserToEdit(userToUpdate);
    setEditUserForm({
      full_name: userToUpdate.full_name,
      email: userToUpdate.email,
      password: "",
      role_id: String(userToUpdate.role?.id ?? veterinarianRoleId),
    });
    setEditFormErrors({});
    setError("");
  }

  function updateEditUserForm(field: keyof UserFormValues, value: string) {
    setEditUserForm((current) => ({ ...current, [field]: value }));
    setEditFormErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userToEdit) {
      return;
    }

    const nextErrors = validateEditUserForm(editUserForm);
    const duplicatedUser = findUserByEmail(users, editUserForm.email, userToEdit.id);

    if (duplicatedUser) {
      nextErrors.email = "Ya existe un usuario con ese correo.";
    }

    setEditFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsUpdatingUser(true);
    setError("");

    try {
      const updated = await userService.update(userToEdit.id, {
        full_name: editUserForm.full_name.trim(),
        email: editUserForm.email.trim(),
        role_id: Number(editUserForm.role_id),
        ...(editUserForm.password ? { password: editUserForm.password } : {}),
      });

      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setProfileUser((current) => (current?.id === updated.id ? updated : current));
      setUserToEdit(null);
      setMessage("Usuario actualizado correctamente.");
    } catch (caughtError) {
      const errorMessage = getErrorMessage(caughtError);

      if (isDuplicateEmailError(errorMessage)) {
        setEditFormErrors((current) => ({ ...current, email: errorMessage }));
      }

      setError(errorMessage);
    } finally {
      setIsUpdatingUser(false);
    }
  }

  async function handleToggleUserStatus(item: User) {
    if (item.id === user.id && item.is_active) {
      setError("No puedes desactivar tu propio usuario.");
      return;
    }

    setIsUpdatingStatus(item.id);
    setError("");

    try {
      const updated = await userService.updateStatus(item.id, !item.is_active);
      setUsers((current) => current.map((currentUser) => (currentUser.id === updated.id ? updated : currentUser)));
      setProfileUser((current) => (current?.id === updated.id ? updated : current));
      setMessage(updated.is_active ? "Usuario activado correctamente." : "Usuario desactivado correctamente.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsUpdatingStatus(null);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">Configuracion del sistema</h1>
        <p className="mt-2 text-base text-slate-500">
          Administra preferencias, seguridad de cuenta y parametros basicos de la aplicacion clinica.
        </p>
      </section>

      {message ? <AlertMessage message={message} onClose={() => setMessage("")} /> : null}
      {error ? <AlertMessage message={error} tone="error" onClose={() => setError("")} /> : null}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {tabs
            .filter((tab) => !tab.adminOnly || isAdmin)
            .map((tab) => (
              <button
                className={cn(
                  "min-h-14 border-b-2 px-4 text-sm font-extrabold transition",
                  activeTab === tab.id
                    ? "border-[#4635D3] text-[#4635D3]"
                    : "border-transparent text-slate-500 hover:bg-violet-50 hover:text-[#3026A6]"
                )}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
        </div>
      </Card>

      {activeTab === "general" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
          <Card className="p-6">
            <div className="mb-6 flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-violet-50 text-2xl font-extrabold text-[#4635D3]">
                {(currentUser?.full_name ?? "Usuario").charAt(0)}
              </span>
              <div>
                <h2 className="text-2xl font-extrabold text-[#172554]">{currentUser?.full_name ?? "Usuario autenticado"}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{currentUser?.email ?? "Sesion autenticada"}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <InfoBox label="Rol" value={roleLabel(currentUser?.role?.name ?? role)} />
              <InfoBox label="Estado" value={currentUser?.is_active === false ? "Inactivo" : "Activo"} />
              <InfoBox label="ID de sesion" value={user.id ? `#${user.id}` : "No disponible"} />
            </div>
            <Button className="mt-6" icon={<LogOut size={18} />} onClick={handleLogout} variant="danger">
              Cerrar sesion
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
              <Settings size={24} />
              Informacion del sistema
            </h2>
            <div className="space-y-3">
              <InfoBox label="Aplicacion" value="VetClinic" />
              <InfoBox label="API base" value={import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"} />
              <InfoBox label="Modulo clinico" value="Motor de inferencia IF-THEN + Bayes" />
            </div>
          </Card>
        </section>
      ) : null}

      {activeTab === "preferences" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
              <Monitor size={24} />
              Preferencias de interfaz
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <PreferenceButton active={theme === "light"} icon={Sun} label="Claro" onClick={() => setTheme("light")} />
              <PreferenceButton active={theme === "dark"} icon={Moon} label="Oscuro" onClick={() => setTheme("dark")} disabled />
              <PreferenceButton active={theme === "system"} icon={Monitor} label="Sistema" onClick={() => setTheme("system")} disabled />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">
              El tema claro esta activo. El modo oscuro queda preparado para una siguiente etapa visual.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-5 text-xl font-extrabold text-[#172554]">Densidad visual</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <PreferenceButton active={density === "comfortable"} icon={CheckCircle2} label="Comoda" onClick={() => setDensity("comfortable")} />
              <PreferenceButton active={density === "compact"} icon={EyeOff} label="Compacta" onClick={() => setDensity("compact")} />
            </div>
          </Card>
        </section>
      ) : null}

      {activeTab === "security" ? (
        <section className="grid gap-6 xl:grid-cols-[0.8fr_1fr]">
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
              <ShieldCheck size={24} />
              Sesion activa
            </h2>
            <div className="space-y-3">
              <InfoBox label="Autenticacion" value="Token JWT activo" />
              <InfoBox label="Rol aplicado" value={roleLabel(role)} />
              <InfoBox label="Control de acceso" value={isAdmin ? "Administrador" : "Clinico"} />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
              <Lock size={24} />
              Cambio de contraseña
            </h2>
            <form className="space-y-4" onSubmit={handleChangePassword}>
              <FormField
                error={passwordFormErrors.current_password}
                label="Contraseña actual"
                minLength={8}
                onChange={(event) => updatePasswordForm("current_password", event.target.value)}
                required
                type="password"
                value={passwordForm.current_password}
              />
              <FormField
                error={passwordFormErrors.new_password}
                helpText="Minimo 8 caracteres y diferente de la contraseña actual."
                label="Nueva contraseña"
                minLength={8}
                onChange={(event) => updatePasswordForm("new_password", event.target.value)}
                required
                type="password"
                value={passwordForm.new_password}
              />
              <FormField
                error={passwordFormErrors.confirm_password}
                label="Confirmar nueva contraseña"
                minLength={8}
                onChange={(event) => updatePasswordForm("confirm_password", event.target.value)}
                required
                type="password"
                value={passwordForm.confirm_password}
              />
              <Button disabled={isChangingPassword} icon={<Save size={18} />} type="submit">
                {isChangingPassword ? "Actualizando..." : "Actualizar contraseña"}
              </Button>
            </form>
          </Card>
        </section>
      ) : null}

      {activeTab === "users" && isAdmin ? (
        <section className="grid gap-6 xl:grid-cols-[0.72fr_1fr]">
          <Card className="p-6">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-extrabold text-[#172554]">
              <UserPlus size={24} />
              Crear usuario
            </h2>
            <form className="space-y-4" onSubmit={handleCreateUser}>
              <FormField
                error={formErrors.full_name}
                label="Nombre completo"
                onChange={(event) => updateUserForm("full_name", event.target.value)}
                placeholder="Ej. Dra. Maria Perez"
                required
                value={userForm.full_name}
              />
              <FormField
                error={formErrors.email}
                label="Correo electronico"
                onChange={(event) => updateUserForm("email", event.target.value)}
                placeholder="correo@clinica.com"
                required
                type="email"
                value={userForm.email}
              />
              <FormField
                error={formErrors.password}
                label="Contraseña"
                minLength={8}
                onChange={(event) => updateUserForm("password", event.target.value)}
                placeholder="Minimo 8 caracteres"
                required
                type="password"
                value={userForm.password}
              />
              <FormSelect
                error={formErrors.role_id}
                label="Rol"
                onChange={(event) => updateUserForm("role_id", event.target.value)}
                required
                value={userForm.role_id}
              >
                <option value={adminRoleId}>ADMINISTRADOR</option>
                <option value={veterinarianRoleId}>VETERINARIO</option>
              </FormSelect>
              <Button disabled={isCreatingUser} icon={<Save size={18} />} type="submit">
                {isCreatingUser ? "Creando..." : "Crear usuario"}
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-3 text-xl font-extrabold text-[#172554]">
                <Users size={24} />
                Usuarios registrados
              </h2>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-extrabold text-[#4635D3]">
                {users.length} usuarios
              </span>
            </div>
            {isLoadingUsers ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="h-16 animate-pulse rounded-lg bg-slate-100" key={index} />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="font-extrabold text-[#172554]">No hay usuarios registrados</p>
                <p className="mt-2 text-sm text-slate-500">Crea el primer usuario clinico desde el formulario.</p>
              </div>
            ) : (
              <DataTable
                columns={["Usuario", "Correo", "Rol", "Estado", "Acciones"]}
                rows={users}
                renderRow={(item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 font-extrabold text-slate-700">{item.full_name}</td>
                    <td className="px-5 py-4">{item.email}</td>
                    <td className="px-5 py-4">{roleLabel(item.role?.name)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "rounded-md px-3 py-1 text-xs font-extrabold",
                          item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {item.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => openEditUser(item)} type="button" variant="secondary">
                          <Edit3 size={17} />
                          Editar
                        </Button>
                        <Button
                          className={item.is_active ? "border-amber-200 text-amber-700 hover:bg-amber-50" : ""}
                          disabled={isUpdatingStatus === item.id || (item.id === user.id && item.is_active)}
                          onClick={() => handleToggleUserStatus(item)}
                          title={item.id === user.id && item.is_active ? "No puedes desactivar tu propio usuario" : undefined}
                          type="button"
                          variant="secondary"
                        >
                          <Power size={17} />
                          {item.is_active ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            )}
          </Card>
        </section>
      ) : null}

      <Modal isOpen={Boolean(userToEdit)} onClose={() => setUserToEdit(null)} title="Editar usuario">
        <form className="space-y-4" onSubmit={handleUpdateUser}>
          <FormField
            error={editFormErrors.full_name}
            label="Nombre completo"
            onChange={(event) => updateEditUserForm("full_name", event.target.value)}
            placeholder="Ej. Dra. Maria Perez"
            required
            value={editUserForm.full_name}
          />
          <FormField
            error={editFormErrors.email}
            label="Correo electronico"
            onChange={(event) => updateEditUserForm("email", event.target.value)}
            placeholder="correo@clinica.com"
            required
            type="email"
            value={editUserForm.email}
          />
          <FormField
            error={editFormErrors.password}
            helpText="Dejalo vacio para conservar la contraseña actual."
            label="Nueva contraseña"
            minLength={8}
            onChange={(event) => updateEditUserForm("password", event.target.value)}
            placeholder="Opcional"
            type="password"
            value={editUserForm.password}
          />
          <FormSelect
            error={editFormErrors.role_id}
            label="Rol"
            onChange={(event) => updateEditUserForm("role_id", event.target.value)}
            required
            value={editUserForm.role_id}
          >
            <option value={adminRoleId}>ADMINISTRADOR</option>
            <option value={veterinarianRoleId}>VETERINARIO</option>
          </FormSelect>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => setUserToEdit(null)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={isUpdatingUser} icon={<Save size={18} />} type="submit">
              {isUpdatingUser ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Modal>

      {!isAdmin && activeTab !== "users" ? (
        <Card className="p-5">
          <div className="flex items-start gap-3 text-sm font-semibold text-slate-500">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#4635D3]" size={20} />
            La gestion de usuarios solo esta disponible para cuentas con rol ADMINISTRADOR.
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 break-words font-extrabold text-[#172554]">{value}</p>
    </div>
  );
}

function PreferenceButton({
  active,
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: typeof Sun;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex min-h-24 flex-col items-center justify-center gap-3 rounded-lg border p-4 text-sm font-extrabold transition",
        active ? "border-[#4635D3] bg-violet-50 text-[#4635D3]" : "border-slate-100 bg-white text-slate-500",
        disabled && "opacity-55"
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon size={24} />
      {label}
    </button>
  );
}
