import type { ReactNode } from "react";
import { Card } from "./Card";

export function Modal({ open, title, children }: { open: boolean; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <Card className="w-full max-w-lg">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <div className="mt-4">{children}</div>
      </Card>
    </div>
  );
}

