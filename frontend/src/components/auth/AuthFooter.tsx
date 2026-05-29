import { ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils/cn";

type AuthFooterProps = {
  className?: string;
  compact?: boolean;
};

export function AuthFooter({ className, compact = false }: AuthFooterProps) {
  return (
    <footer className={cn("flex w-full items-center justify-between text-sm font-medium text-[#5d6b83]", compact && "text-base", className)}>
      <span>© 2025 Oberyn. Todos los derechos reservados.</span>
      <span className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-[#00951d]" strokeWidth={2.2} />
        Confiable por diseño.
      </span>
    </footer>
  );
}
