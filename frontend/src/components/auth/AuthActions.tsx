import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils/cn";

type AuthPrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
};

export function AuthPrimaryButton({ className, icon, children, ...props }: AuthPrimaryButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-[56px] w-full items-center justify-center gap-4 rounded-lg bg-[#00951d] px-6 text-[19px] font-extrabold text-white shadow-[0_8px_16px_rgba(0,149,29,0.18)] transition hover:bg-[#007f18] focus:outline-none focus:ring-4 focus:ring-[#00951d]/20",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

type AuthInlineLinkProps = {
  id: string;
  to: string;
  children: ReactNode;
  className?: string;
};

export function AuthInlineLink({ id, to, children, className }: AuthInlineLinkProps) {
  return (
    <Link id={id} to={to} className={cn("font-extrabold text-[#00951d] transition hover:text-[#007f18]", className)}>
      {children}
    </Link>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-5 text-center text-[17px] font-medium text-[#62708a]">
      <span className="h-px flex-1 bg-[#dfe4eb]" />
      <span>o continúa con</span>
      <span className="h-px flex-1 bg-[#dfe4eb]" />
    </div>
  );
}
