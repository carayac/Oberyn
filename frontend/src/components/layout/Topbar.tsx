import { UserButton } from "@clerk/react";

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-medium text-slate-600">Workspace</div>
        <div className="flex items-center gap-3">
          {hasClerkKey ? <UserButton /> : <div className="h-9 rounded-lg bg-[#eaf7ee] px-3 py-2 text-sm font-semibold text-[#008f1f]">Preview local</div>}
        </div>
      </div>
    </header>
  );
}
