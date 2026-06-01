import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isOnboarding = location.pathname.startsWith("/onboarding/");
  const isWideSystemView =
    location.pathname === "/dashboard" ||
    location.pathname === "/organizations" ||
    /^\/projects\/[^/]+\/(approvals|gateway|rules|sdk)$/.test(location.pathname);

  if (isOnboarding) {
    return <Outlet />;
  }

  return (
    <div className="min-h-[100dvh] min-w-0 overflow-x-hidden bg-[#fbfcfd]">
      <Sidebar collapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed((current) => !current)} />
      <main
        className={
          isSidebarCollapsed
            ? "min-w-0 px-4 py-5 transition-all duration-300 sm:px-6 lg:pl-[112px]"
            : "min-w-0 px-4 py-5 transition-all duration-300 sm:px-6 lg:pl-[324px]"
        }
      >
        <div className={isWideSystemView ? "min-w-0 w-full" : "mx-auto min-w-0 max-w-7xl"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
