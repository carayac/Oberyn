import type { ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

type AuthCardProps = {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
};

export function AuthCard({ id, title, description, children, className }: AuthCardProps) {
  return (
    <section
      id={id}
      className={cn("w-full max-w-[640px] rounded-xl border border-[#dce2ea] bg-white px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8 xl:px-10", className)}
    >
      <header className="mb-6 sm:mb-8">
        <h2 className="text-[clamp(1.65rem,4vw,2rem)] font-extrabold leading-tight text-[#050505]">{title}</h2>
        <p className="mt-3 text-[clamp(1rem,2vw,1.125rem)] leading-7 text-[#506078]">{description}</p>
      </header>
      {children}
    </section>
  );
}
