import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function SecurityPageFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-5 pb-8">
      <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-bold text-[#00951d]">
        <ArrowLeft className="h-4 w-4" />
        Mis proyectos
      </Link>
      <header className="max-w-4xl">
        <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-extrabold leading-[1.02] text-[#050505]">{title}</h1>
        <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-[#596783] sm:text-lg">{description}</p>
      </header>
      {children}
    </div>
  );
}
