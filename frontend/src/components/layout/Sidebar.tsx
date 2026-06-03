import { UserButton } from "@clerk/react";
import { Bot, Building2, Code2, FileText, Folder, GitBranch, Home, Menu, Plug, Settings, ShieldCheck, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { AuthBrandLogo } from "../auth/AuthBrandLogo";

const ACTIVE_PROJECT_KEY = "oberyn.activeProjectId";
const ACTIVE_PROJECT_EVENT = "oberyn:active-project-change";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

function isProjectRoot(pathname: string) {
  return pathname === "/projects" || pathname === "/projects/new" || /^\/projects\/[^/]+$/.test(pathname);
}

function isSidebarItemActive(id: string, to: string, pathname: string) {
  if (id === "dashboard") return pathname === "/dashboard";
  if (id === "organizations") return pathname === "/organizations";
  if (id === "projects") return isProjectRoot(pathname);
  if (to === "/projects") return false;
  return pathname === to;
}

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
  const location = useLocation();
  const { activeOrganizationId } = useOrganizations();
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
  const navProjectId = selectedProject?.id ?? null;
  const projectRoute = (section: string) => (navProjectId ? `/projects/${navProjectId}/${section}` : "/projects");

  const navigationGroups = useMemo(
    () => [
      {
        id: "principal",
        label: "Principal",
        items: [
          { id: "dashboard", label: "Dashboard", to: "/dashboard", Icon: Home },
          { id: "organizations", label: "Organizaciones", to: "/organizations", Icon: Building2 },
          { id: "projects", label: "Proyectos", to: "/projects", Icon: Folder },
          { id: "integrations", label: "Integraciones", to: projectRoute("integrations"), Icon: Plug },
        ],
      },
      {
        id: "security",
        label: "Control y seguridad",
        items: [
          { id: "rules", label: "Reglas", to: projectRoute("rules"), Icon: ShieldCheck },
          { id: "approvals", label: "Aprobaciones", to: projectRoute("approvals"), Icon: UserCheck },
          { id: "audit", label: "Auditoría", to: projectRoute("audit"), Icon: FileText },
        ],
      },
      {
        id: "automation",
        label: "Automatización",
        items: [
          { id: "bots", label: "Bots", to: projectRoute("bots"), Icon: Bot },
          { id: "flows", label: "Flujos", to: projectRoute("flows"), Icon: GitBranch },
          { id: "sdk", label: "SDK", to: projectRoute("sdk"), Icon: Code2 },
        ],
      },
      {
        id: "administration",
        label: "Administración",
        items: [{ id: "settings", label: "Configuración", to: projectRoute("settings"), Icon: Settings }],
      },
    ],
    [navProjectId],
  );

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
          aria-label={collapsed ? "Expandir menú" : "Comprimir menú"}
        >
          <Menu className="h-6 w-6" strokeWidth={2.2} />
        </button>
      </div>

      <nav id="app-sidebar-navigation" className="min-h-0 flex-1 overflow-y-auto pr-1">
        {navigationGroups.map((group) => (
          <section key={group.id} className="border-b border-[#e5e9ef] py-5 first:pt-0 last:border-b-0">
            {!collapsed && <h2 className="mb-3 px-3 text-[15px] font-bold text-[#4b5565]">{group.label}</h2>}
            <div className="space-y-1">
              {group.items.map(({ id, label, to, Icon }) => {
                const isActive = isSidebarItemActive(id, to, location.pathname);

                return (
                  <Link
                    id={`sidebar-nav-${id}`}
                    key={id}
                    to={to}
                    title={collapsed ? label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "flex h-12 items-center rounded-lg text-[17px] font-medium transition",
                      collapsed ? "justify-center px-0" : "gap-6 px-3",
                      isActive ? "bg-[#eaf7ee] text-[#008f1f]" : "text-[#111827] hover:bg-[#f8fafc]",
                    ].join(" ")}
                  >
                    <Icon className="h-6 w-6 shrink-0" strokeWidth={2.2} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <SidebarUser collapsed={collapsed} />
    </aside>
  );
}
