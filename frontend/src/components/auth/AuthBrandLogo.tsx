import { cn } from "../../lib/utils/cn";

type AuthBrandLogoProps = {
  className?: string;
  markSize?: "sm" | "md";
  collapsed?: boolean;
};

export function AuthBrandLogo({ className, markSize = "md", collapsed = false }: AuthBrandLogoProps) {
  const imageClass = collapsed
    ? markSize === "sm"
      ? "h-10 w-auto"
      : "h-12 w-auto"
    : markSize === "sm"
      ? "h-12 w-auto max-w-[240px]"
      : "h-14 w-auto max-w-[280px]";

  return (
    <div className={cn("flex min-w-0 items-center", className)} aria-label="Oberyn">
      <img
        src={collapsed ? "/assets/oberyn-mark.svg" : "/assets/oberyn-logo.svg"}
        alt="Oberyn"
        className={cn("block shrink-0 object-contain", imageClass)}
        draggable={false}
      />
    </div>
  );
}
