import { cn } from "../../lib/utils/cn";

type AuthBrandLogoProps = {
  className?: string;
  markSize?: "sm" | "md";
  collapsed?: boolean;
};

export function AuthBrandLogo({ className, markSize = "md", collapsed = false }: AuthBrandLogoProps) {
  const sizeClass = markSize === "sm" ? "h-10 w-10" : "h-12 w-12";

  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="Oberyn">
      <svg className={sizeClass} viewBox="0 0 64 64" role="img" aria-hidden="true">
        <ellipse cx="32" cy="32" rx="10" ry="28" fill="none" stroke="#050505" strokeWidth="2.5" transform="rotate(60 32 32)" />
        <ellipse cx="32" cy="32" rx="10" ry="28" fill="none" stroke="#050505" strokeWidth="2.5" transform="rotate(-60 32 32)" />
        <circle cx="32" cy="32" r="12" fill="#f7fff9" stroke="#16a338" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="5" fill="none" stroke="#16a338" strokeWidth="2.5" />
      </svg>
      {!collapsed && (
        <span className="flex gap-4 text-[34px] font-extrabold uppercase leading-none text-[#050505]" aria-hidden="true">
          {"OBERYN".split("").map((letter) => (
            <span key={letter}>{letter}</span>
          ))}
        </span>
      )}
    </div>
  );
}
