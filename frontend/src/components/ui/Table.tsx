import type { TableHTMLAttributes } from "react";
import { cn } from "../../lib/utils/cn";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />;
}

