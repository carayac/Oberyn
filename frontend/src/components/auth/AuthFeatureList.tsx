import { ClipboardCheck, Settings, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";

type AuthFeature = {
  id: string;
  title: string;
  description: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const authFeatures: AuthFeature[] = [
  {
    id: "control-total",
    title: "Control total",
    description: "Define reglas y políticas sin fricción.",
    Icon: Settings,
  },
  {
    id: "ia-segura",
    title: "IA segura",
    description: "Supervisa y permite solo lo que realmente debe ejecutarse.",
    Icon: ShieldCheck,
  },
  {
    id: "auditoria-inteligente",
    title: "Auditoría inteligente",
    description: "Trazabilidad completa con el mínimo esfuerzo.",
    Icon: ClipboardCheck,
  },
];

export function AuthFeatureList() {
  return (
    <div className="grid gap-5 sm:grid-cols-3 lg:block lg:space-y-8">
      {authFeatures.map(({ id, title, description, Icon }) => (
        <article key={id} id={`auth-feature-${id}`} className="flex min-w-0 items-start gap-4 lg:gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf7ee] text-[#00951d] lg:h-[64px] lg:w-[64px]">
            <Icon className="h-6 w-6 lg:h-8 lg:w-8" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 pt-1 lg:pt-2">
            <h3 className="text-[17px] font-extrabold leading-tight text-[#00951d] lg:text-[21px]">{title}</h3>
            <p className="mt-2 max-w-[360px] text-[14px] leading-6 text-[#4e5b71] lg:mt-3 lg:text-[17px] lg:leading-7">{description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
