import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100", className)}
      {...props}
    />
  );
}

