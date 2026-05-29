import { UserButton } from "@clerk/react";
import { Bot, Cloud, Code2, FileText, Folder, GitBranch, Home, Menu, Plug, Settings, ShieldCheck, UserCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { AuthBrandLogo } from "../auth/AuthBrandLogo";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const defaultProjectId = "project_1";

const navigationGroups = [
  {
    id: "principal",
    label: "Principal",
    items: [
      { id: "dashboard", label: "Dashboard", to: "/dashboard", Icon: Home },
      { id: "projects", label: "Proyectos", to: "/projects", Icon: Folder },
      { id: "integrations", label: "Integraciones", to: `/projects/${defaultProjectId}/integrations`, Icon: Plug },
    ],
  },
  {
    id: "security",
    label: "Control y seguridad",
    items: [
      { id: "rules", label: "Reglas", to: `/projects/${defaultProjectId}/rules`, Icon: ShieldCheck },
      { id: "approvals", label: "Aprobaciones", to: `/projects/${defaultProjectId}/approvals`, Icon: UserCheck },
      { id: "audit", label: "Auditoria", to: `/projects/${defaultProjectId}/audit`, Icon: FileText },
      { id: "evidence", label: "Evidencia", to: `/projects/${defaultProjectId}/evidence/event_1`, Icon: FileText },
    ],
  },
  {
    id: "automation",
    label: "Automatizacion",
    items: [
      { id: "bots", label: "Bots", to: `/projects/${defaultProjectId}/bots`, Icon: Bot },
      { id: "flows", label: "Flujos", to: `/projects/${defaultProjectId}/flows`, Icon: GitBranch },
      { id: "gateway", label: "Gateway", to: `/projects/${defaultProjectId}/gateway`, Icon: Cloud },
      { id: "sdk", label: "SDK", to: `/projects/${defaultProjectId}/sdk`, Icon: Code2 },
    ],
  },
  {
    id: "administration",
    label: "Administracion",
    items: [{ id: "settings", label: "Configuracion", to: `/projects/${defaultProjectId}/settings`, Icon: Settings }],
  },
];

function SidebarUser({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={collapsed ? "flex justify-center" : "border-t border-[#e5e9ef] pt-4"}>
      <UserButton
        showName={!collapsed}
        userProfileMode="modal"
        signInUrl="/login"
        appearance={{
          elements: {
            userButtonTrigger: collapsed
              ? "h-10 w-10"
              : "w-full justify-start gap-3 rounded-lg px-1 py-2 text-left hover:bg-[#f8fafc]",
            userButtonBox: collapsed ? "h-10 w-10" : "flex-row-reverse justify-end gap-3",
            userButtonOuterIdentifier: "truncate text-[15px] font-semibold text-[#111827]",
            avatarBox: "h-10 w-10",
          },
        }}
      />
    </div>
  );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={
        collapsed
          ? "fixed inset-y-0 left-0 z-40 hidden w-[88px] border-r border-[#dce2ea] bg-white px-4 py-6 shadow-[12px_0_36px_rgba(15,23,42,0.06)] transition-all duration-300 lg:flex lg:flex-col"
          : "fixed inset-y-0 left-0 z-40 hidden w-[300px] border-r border-[#dce2ea] bg-white px-5 py-6 shadow-[12px_0_36px_rgba(15,23,42,0.06)] transition-all duration-300 lg:flex lg:flex-col"
      }
    >
      <div className={collapsed ? "mb-8 flex flex-col items-center gap-5" : "mb-8 flex items-center justify-between gap-4"}>
        <AuthBrandLogo markSize="sm" collapsed={collapsed} className={collapsed ? "justify-center" : "[&_span]:gap-3 [&_span]:text-[24px]"} />
        <button
          id="sidebar-collapse-button"
          type="button"
          onClick={onToggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#dce2ea] bg-white text-[#111827] shadow-sm transition hover:bg-[#f8fafc]"
          aria-label={collapsed ? "Expandir menu" : "Comprimir menu"}
        >
          <Menu className="h-6 w-6" strokeWidth={2.2} />
        </button>
      </div>

      <nav id="app-sidebar-navigation" className="min-h-0 flex-1 overflow-y-auto pr-1">
        {navigationGroups.map((group) => (
          <section key={group.id} className="border-b border-[#e5e9ef] py-5 first:pt-0 last:border-b-0">
            {!collapsed && <h2 className="mb-3 px-3 text-[15px] font-bold text-[#4b5565]">{group.label}</h2>}
            <div className="space-y-1">
              {group.items.map(({ id, label, to, Icon }) => (
                <NavLink
                  id={`sidebar-nav-${id}`}
                  key={id}
                  to={to}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    [
                      "flex h-12 items-center rounded-lg text-[17px] font-medium transition",
                      collapsed ? "justify-center px-0" : "gap-6 px-3",
                      isActive ? "bg-[#eaf7ee] text-[#008f1f]" : "text-[#111827] hover:bg-[#f8fafc]",
                    ].join(" ")
                  }
                >
                  <Icon className="h-6 w-6 shrink-0" strokeWidth={2.2} />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <SidebarUser collapsed={collapsed} />
    </aside>
  );
}
