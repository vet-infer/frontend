import type { LucideIcon } from "lucide-react";
import { Card } from "../../components/common/Card";

type PlaceholderPageProps = {
  title: string;
  icon: LucideIcon;
};

export function PlaceholderPage({ title, icon: Icon }: PlaceholderPageProps) {
  return (
    <Card className="p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="grid h-16 w-16 place-items-center rounded-lg bg-violet-50 text-brand-500">
          <Icon size={31} strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="text-2xl font-extrabold text-[#172554]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Esta pantalla queda preparada para desarrollarse con la siguiente captura de referencia, manteniendo la misma
            estructura visual del sistema.
          </p>
        </div>
      </div>
    </Card>
  );
}
