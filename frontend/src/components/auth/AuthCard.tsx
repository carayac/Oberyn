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
      className={cn("w-full max-w-[640px] rounded-xl border border-[#dce2ea] bg-white px-10 py-10 shadow-[0_18px_50px_rgba(15,23,42,0.08)] xl:px-12", className)}
    >
      <header className="mb-8">
        <h2 className="text-[32px] font-extrabold leading-tight text-[#050505]">{title}</h2>
        <p className="mt-3 text-[18px] leading-7 text-[#506078]">{description}</p>
      </header>
      {children}
    </section>
  );
}
