import { Bot, BrainCircuit, Cloud, CreditCard, Database, Flame, Globe2, Hexagon, Mail, Server, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils/cn";

type IntegrationIconProps = {
  provider?: string | null;
  serviceType?: string | null;
  className?: string;
  iconClassName?: string;
};

const providerIcons: Record<string, { Icon: LucideIcon; className: string; label: string }> = {
  deepseek: { Icon: BrainCircuit, className: "bg-indigo-50 text-indigo-700 border-indigo-100", label: "DeepSeek" },
  openai: { Icon: Sparkles, className: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "OpenAI" },
  anthropic: { Icon: Bot, className: "bg-orange-50 text-orange-700 border-orange-100", label: "Anthropic" },
  stripe: { Icon: CreditCard, className: "bg-violet-50 text-violet-700 border-violet-100", label: "Stripe" },
  supabase: { Icon: Database, className: "bg-green-50 text-green-700 border-green-100", label: "Supabase" },
  firebase: { Icon: Flame, className: "bg-amber-50 text-amber-700 border-amber-100", label: "Firebase" },
  aws: { Icon: Cloud, className: "bg-sky-50 text-sky-700 border-sky-100", label: "AWS" },
  jsonplaceholder: { Icon: Hexagon, className: "bg-slate-50 text-slate-700 border-slate-200", label: "JSONPlaceholder" },
};

function fallbackIcon(serviceType?: string | null) {
  if (serviceType === "llm") return { Icon: BrainCircuit, className: "bg-indigo-50 text-indigo-700 border-indigo-100", label: "LLM" };
  if (serviceType === "database") return { Icon: Database, className: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Database" };
  if (serviceType === "payments") return { Icon: CreditCard, className: "bg-violet-50 text-violet-700 border-violet-100", label: "Payments" };
  if (serviceType === "email") return { Icon: Mail, className: "bg-amber-50 text-amber-700 border-amber-100", label: "Email" };
  if (serviceType === "custom_api" || serviceType === "api") return { Icon: Server, className: "bg-sky-50 text-sky-700 border-sky-100", label: "API" };
  return { Icon: Globe2, className: "bg-slate-50 text-slate-700 border-slate-200", label: "Integration" };
}

export function getIntegrationVisual(provider?: string | null, serviceType?: string | null) {
  const key = provider?.toLowerCase().trim() ?? "";
  return providerIcons[key] ?? fallbackIcon(serviceType);
}

export function IntegrationIcon({ provider, serviceType, className, iconClassName }: IntegrationIconProps) {
  const visual = getIntegrationVisual(provider, serviceType);

  return (
    <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", visual.className, className)} title={visual.label}>
      <visual.Icon className={cn("h-5 w-5", iconClassName)} />
    </span>
  );
}
