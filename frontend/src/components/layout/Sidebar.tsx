import { UserButton } from "@clerk/react";
import { Bot, Building2, Cloud, Code2, FileText, Folder, GitBranch, Home, Menu, Plug, Settings, ShieldCheck, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { AuthBrandLogo } from "../auth/AuthBrandLogo";

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const ACTIVE_PROJECT_KEY = "oberyn.activeProjectId";
const ACTIVE_PROJECT_EVENT = "oberyn:active-project-change";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

function SidebarUser({ collapsed }: { collapsed: boolean }) {
  if (!hasClerkKey) {
    return (
      <div className={collapsed ? "flex justify-center" : "border-t border-[#e5e9ef] pt-4"}>
        <div className={collapsed ? "flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf7ee] text-sm font-bold text-[#008f1f]" : "rounded-lg bg-[#eaf7ee] px-3 py-2 text-[15px] font-semibold text-[#008f1f]"}>
          {collapsed ? "PL" : "Preview local"}
        </div>
      </div>
    );
  }

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
  const location = useLocation();
  const { organizations, activeOrganization, activeOrganizationId, setActiveOrganizationId } = useOrganizations();
  const { projects } = useProjects(activeOrganizationId);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => localStorage.getItem(ACTIVE_PROJECT_KEY));

  useEffect(() => {
    const routeProjectId = location.pathname.match(/\/projects\/([^/]+)/)?.[1];
    const nextProjectId = routeProjectId ?? activeProjectId ?? projects[0]?.id ?? null;
    if (!nextProjectId || nextProjectId === activeProjectId) return;
    setActiveProjectId(nextProjectId);
    localStorage.setItem(ACTIVE_PROJECT_KEY, nextProjectId);
  }, [activeProjectId, location.pathname, projects]);

  useEffect(() => {
    function handleActiveProjectChange(event: Event) {
      const projectId = (event as CustomEvent<{ projectId?: string }>).detail?.projectId;
      if (!projectId) return;
      setActiveProjectId(projectId);
    }

    window.addEventListener(ACTIVE_PROJECT_EVENT, handleActiveProjectChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_EVENT, handleActiveProjectChange);
  }, []);

  const selectedProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
  const navProjectId = selectedProject?.id ?? "project_1";

  const navigationGroups = useMemo(
    () => [
      {
        id: "principal",
        label: "Principal",
        items: [
          { id: "dashboard", label: "Dashboard", to: "/dashboard", Icon: Home },
          { id: "projects", label: "Proyectos", to: "/projects", Icon: Folder },
          { id: "integrations", label: "Integraciones", to: `/projects/${navProjectId}/integrations`, Icon: Plug },
        ],
      },
      {
        id: "security",
        label: "Control y seguridad",
        items: [
          { id: "rules", label: "Reglas", to: `/projects/${navProjectId}/rules`, Icon: ShieldCheck },
          { id: "approvals", label: "Aprobaciones", to: `/projects/${navProjectId}/approvals`, Icon: UserCheck },
          { id: "audit", label: "Auditoria", to: `/projects/${navProjectId}/audit`, Icon: FileText },
          { id: "evidence", label: "Evidencia", to: `/projects/${navProjectId}/evidence/event_1`, Icon: FileText },
        ],
      },
      {
        id: "automation",
        label: "Automatizacion",
        items: [
          { id: "bots", label: "Bots", to: `/projects/${navProjectId}/bots`, Icon: Bot },
          { id: "flows", label: "Flujos", to: `/projects/${navProjectId}/flows`, Icon: GitBranch },
          { id: "gateway", label: "Gateway", to: `/projects/${navProjectId}/gateway`, Icon: Cloud },
          { id: "sdk", label: "SDK", to: `/projects/${navProjectId}/sdk`, Icon: Code2 },
        ],
      },
      {
        id: "administration",
        label: "Administracion",
        items: [{ id: "settings", label: "Configuracion", to: `/projects/${navProjectId}/settings`, Icon: Settings }],
      },
    ],
    [navProjectId],
  );

  function handleProjectChange(projectId: string) {
    setActiveProjectId(projectId);
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    window.dispatchEvent(new CustomEvent(ACTIVE_PROJECT_EVENT, { detail: { projectId } }));
  }

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

      {!collapsed && (
        <div className="space-y-0 rounded-lg border border-[#dce2ea] bg-white">
          <label className="flex items-center gap-3 border-b border-[#e5e9ef] px-3 py-3">
            <Building2 className="h-6 w-6 text-[#111827]" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-[#697386]">Organizacion actual</span>
              <select
                value={activeOrganization?.id ?? ""}
                onChange={(event) => setActiveOrganizationId(event.target.value || null)}
                className="mt-0.5 w-full bg-transparent text-[15px] font-semibold text-[#111827] outline-none"
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="flex items-center gap-3 px-3 py-3">
            <Folder className="h-6 w-6 text-[#111827]" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-[#697386]">Proyecto actual</span>
              <select
                value={selectedProject?.id ?? ""}
                onChange={(event) => handleProjectChange(event.target.value)}
                className="mt-0.5 w-full bg-transparent text-[15px] font-semibold text-[#111827] outline-none"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
      )}

      <SidebarUser collapsed={collapsed} />
    </aside>
  );
}
