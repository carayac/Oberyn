import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#fbfcfd]">
      <Sidebar collapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed((current) => !current)} />
      <main className={isSidebarCollapsed ? "min-h-screen px-5 py-6 transition-all duration-300 lg:pl-[112px]" : "min-h-screen px-5 py-6 transition-all duration-300 lg:pl-[324px]"}>
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
