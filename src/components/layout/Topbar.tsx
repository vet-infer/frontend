import { Calendar, ChevronLeft, ChevronRight, Menu, RotateCcw } from "lucide-react";
import type { User } from "../../types/user";
import type { WeekRange } from "../../types/dashboard";

type TopbarProps = {
  currentUser: User | null;
  onOpenSidebar: () => void;
  onNextWeek: () => void;
  onPreviousWeek: () => void;
  onResetWeek: () => void;
  selectedWeek: WeekRange;
};

function formatWeekRange(week: WeekRange) {
  const formatter = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
  });
  const year = new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
  }).format(week.end);

  return `${formatter.format(week.start)} - ${formatter.format(week.end)} ${year}`;
}

function isCurrentWeek(week: WeekRange) {
  const today = new Date();

  return today >= week.start && today <= week.end;
}

function formatToday() {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function getFirstName(fullName?: string) {
  return fullName?.trim().split(/\s+/)[0] ?? "Usuario";
}

export function Topbar({ currentUser, onNextWeek, onOpenSidebar, onPreviousWeek, onResetWeek, selectedWeek }: TopbarProps) {
  const roleName = currentUser?.role?.name?.toLowerCase();
  const title = roleName === "veterinario" ? "Dr." : "";
  const greetingName = [title, getFirstName(currentUser?.full_name)].filter(Boolean).join(" ");
  const isSelectedWeekCurrent = isCurrentWeek(selectedWeek);

  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <button
          className="mt-1 rounded-lg border border-slate-200 bg-white p-2 text-teal-700 shadow-sm lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-normal text-[#172554]">Hola, {greetingName}!</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          aria-label="Semana anterior"
          className="grid h-12 w-12 place-items-center rounded-lg border border-slate-200 bg-white text-teal-700 shadow-sm transition hover:bg-teal-50"
          onClick={onPreviousWeek}
          type="button"
        >
          <ChevronLeft size={19} />
        </button>
        <div className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm">
          <Calendar size={19} />
          <span className="capitalize">{formatWeekRange(selectedWeek)}</span>
        </div>
        <button
          aria-label="Semana siguiente"
          className="grid h-12 w-12 place-items-center rounded-lg border border-slate-200 bg-white text-teal-700 shadow-sm transition hover:bg-teal-50"
          onClick={onNextWeek}
          type="button"
        >
          <ChevronRight size={19} />
        </button>
        <button
          aria-label="Volver a la semana actual"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSelectedWeekCurrent}
          onClick={onResetWeek}
          title={formatToday()}
          type="button"
        >
          <RotateCcw size={17} />
          Hoy
        </button>
      </div>
    </header>
  );
}
