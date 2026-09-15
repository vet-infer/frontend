import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { authService } from "../../services/auth.service";
import type { User } from "../../types/user";
import type { WeekRange } from "../../types/dashboard";

function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);

  return date;
}

function buildWeekRange(value: Date): WeekRange {
  const start = startOfWeek(value);
  const end = new Date(start);

  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function shiftWeek(week: WeekRange, amount: number) {
  const next = new Date(week.start);

  next.setDate(next.getDate() + amount * 7);

  return buildWeekRange(next);
}

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeekRange>(() => buildWeekRange(new Date()));
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const user = await authService.getCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FB] lg:flex">
      <Sidebar currentUser={currentUser} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
        {isDashboard ? (
          <Topbar
            currentUser={currentUser}
            onNextWeek={() => setSelectedWeek((current) => shiftWeek(current, 1))}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onPreviousWeek={() => setSelectedWeek((current) => shiftWeek(current, -1))}
            onResetWeek={() => setSelectedWeek(buildWeekRange(new Date()))}
            selectedWeek={selectedWeek}
          />
        ) : (
          <button
            className="mb-5 rounded-lg border border-slate-200 bg-white p-2 text-brand-700 shadow-sm lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
        )}
        <Outlet context={{ selectedWeek }} />
      </main>
    </div>
  );
}
