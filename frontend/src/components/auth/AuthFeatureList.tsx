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
    <div className="space-y-8">
      {authFeatures.map(({ id, title, description, Icon }) => (
        <article key={id} id={`auth-feature-${id}`} className="flex items-start gap-5">
          <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-2xl bg-[#eaf7ee] text-[#00951d]">
            <Icon className="h-8 w-8" strokeWidth={2.4} />
          </div>
          <div className="pt-2">
            <h3 className="text-[21px] font-extrabold leading-tight text-[#00951d]">{title}</h3>
            <p className="mt-3 max-w-[360px] text-[17px] leading-7 text-[#4e5b71]">{description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
