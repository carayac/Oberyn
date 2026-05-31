import { ChevronDown } from "lucide-react";

export function OrganizationSwitcher() {
  return (
    <button type="button" className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
      ACME Corp
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}
