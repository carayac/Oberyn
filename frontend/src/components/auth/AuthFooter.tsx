import { ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils/cn";

type AuthFooterProps = {
  className?: string;
  compact?: boolean;
};

export function AuthFooter({ className, compact = false }: AuthFooterProps) {
  return (
    <footer
      className={cn(
        "flex w-full flex-wrap items-center justify-center gap-x-10 gap-y-3 text-center text-sm font-medium text-[#5d6b83] sm:justify-between sm:text-left",
        compact && "text-[15px]",
        className,
      )}
    >
      <span className="min-w-0">© 2026 Oberyn. Todos los derechos reservados.</span>
      <span className="flex min-w-0 items-center justify-center gap-3 whitespace-nowrap">
        <ShieldCheck className="h-6 w-6 text-[#00951d]" strokeWidth={2.2} />
        Confiable por diseño.
      </span>
    </footer>
  );
}
