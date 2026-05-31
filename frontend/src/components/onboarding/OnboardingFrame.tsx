import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AuthBrandLogo } from "../auth/AuthBrandLogo";
import { AuthFooter } from "../auth/AuthFooter";
import { cn } from "../../lib/utils/cn";

const steps = ["Organizacion", "Proyecto", "Integraciones", "Reglas", "Finalizar"];

type OnboardingFrameProps = {
  activeStep: number;
  backTo?: string;
  children: ReactNode;
};

export function OnboardingFrame({ activeStep, backTo, children }: OnboardingFrameProps) {
  return (
    <main className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#fbfcfd] px-4 py-3 text-[#0b0d13] sm:px-8 lg:h-[100dvh] lg:px-16">
      <div className="relative shrink-0">
        {backTo && (
          <Link to={backTo} className="absolute left-0 top-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111827] hover:bg-slate-100" aria-label="Volver">
            <ArrowLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.4} />
          </Link>
        )}
        <AuthBrandLogo className="justify-center" markSize="sm" />
      </div>

      <nav className="mx-auto mt-4 flex w-full max-w-[1240px] shrink-0 items-center justify-center gap-2 sm:mt-5 lg:mt-6 lg:gap-3" aria-label="Progreso de onboarding">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === activeStep;
          const isCompleted = stepNumber < activeStep;

          return (
            <div key={label} className="flex min-w-0 items-center gap-2 lg:gap-3">
              <div className="flex min-w-0 items-center gap-2 lg:gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[14px] font-extrabold sm:h-9 sm:w-9 sm:text-[15px] lg:h-10 lg:w-10 lg:text-[16px]",
                    isActive || isCompleted ? "border-[#00951d] bg-[#00951d] text-white" : "border-[#d7dee8] bg-white text-[#42516a]",
                  )}
                >
                  {stepNumber}
                </span>
                <span className={cn("hidden truncate text-[15px] font-bold sm:block lg:text-[17px]", isActive || isCompleted ? "text-[#00951d]" : "text-[#52617b]")}>{label}</span>
              </div>
              {stepNumber < steps.length && <span className={cn("h-[2px] w-8 shrink-0 sm:w-10 lg:w-12 xl:w-14", isCompleted ? "bg-[#00951d]" : "bg-[#dce2ea]")} />}
            </div>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1 items-start justify-center py-3 sm:py-4 lg:items-center">{children}</div>
      <AuthFooter className="shrink-0 pt-1" compact />
    </main>
  );
}
