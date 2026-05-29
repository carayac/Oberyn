import type { ReactNode } from "react";

export function Tabs({ items }: { items: Array<{ label: string; active?: boolean; content?: ReactNode }> }) {
  return (
    <div>
      <div className="flex gap-2 border-b border-slate-200">
        {items.map((item) => (
          <button key={item.label} className={item.active ? "border-b-2 border-brand-600 px-3 py-2 text-sm font-medium text-brand-700" : "px-3 py-2 text-sm text-slate-600"}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{items.find((item) => item.active)?.content}</div>
    </div>
  );
}

