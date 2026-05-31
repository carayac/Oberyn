import { UserButton } from "@clerk/react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-medium text-slate-600">Workspace</div>
        <div className="flex items-center gap-3">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
