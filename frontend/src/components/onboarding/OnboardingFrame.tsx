import { ArrowLeft, Check } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AuthBrandLogo } from "../auth/AuthBrandLogo";
import { AuthFooter } from "../auth/AuthFooter";
import { cn } from "../../lib/utils/cn";

const steps = ["Organización", "Proyecto", "Integraciones", "Reglas", "Finalizar"];

type OnboardingFrameProps = {
  activeStep: number;
  backTo?: string;
  children: ReactNode;
};

export function OnboardingFrame({ activeStep, backTo, children }: OnboardingFrameProps) {
  return (
    <main className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#fbfcfd] px-4 py-5 text-[#0b0d13] sm:px-8 lg:px-10 xl:px-14">
      <div className="relative shrink-0">
        {backTo && (
          <Link to={backTo} className="absolute left-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#dce2ea] bg-white text-[#111827] shadow-sm hover:bg-slate-50" aria-label="Volver">
            <ArrowLeft className="h-6 w-6" strokeWidth={2.4} />
          </Link>
        )}
        <AuthBrandLogo className="justify-center" markSize="sm" />
      </div>

      <nav className="mx-auto mt-5 flex w-full max-w-[1040px] shrink-0 items-center justify-center gap-2 sm:mt-6 lg:gap-3" aria-label="Progreso de onboarding">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === activeStep;
          const isCompleted = stepNumber < activeStep;

          return (
            <div key={label} className="flex min-w-0 items-center gap-2 lg:gap-3">
              <div className="flex min-w-0 items-center gap-2 lg:gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[14px] font-extrabold sm:h-9 sm:w-9 sm:text-[15px]",
                    isActive || isCompleted ? "border-[#00951d] bg-[#00951d] text-white" : "border-[#d7dee8] bg-white text-[#42516a]",
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" strokeWidth={2.6} /> : stepNumber}
                </span>
                <span className={cn("hidden truncate text-[14px] font-bold sm:block lg:text-[15px]", isActive || isCompleted ? "text-[#00951d]" : "text-[#52617b]")}>{label}</span>
              </div>
              {stepNumber < steps.length && <span className={cn("h-[2px] w-8 shrink-0 sm:w-12 lg:w-16 xl:w-20", isCompleted ? "bg-[#00951d]" : "bg-[#dce2ea]")} />}
            </div>
          );
        })}
      </nav>

      <div className="flex w-full flex-1 items-start justify-center py-6 sm:py-8">{children}</div>
      <AuthFooter className="shrink-0 pt-1" compact />
    </main>
  );
}
