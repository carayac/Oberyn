import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/api/client";
import type { Organization } from "../types/organization";
import type { Project } from "../types/project";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const allProjectsCache = new Map<string, Project[]>();
const allProjectsRequests = new Map<string, Promise<Project[]>>();

function normalizeStatus(status: string): Project["status"] {
  if (status === "pending") return "pending_setup";
  if (status === "manual") return "no_activity";
  return status as Project["status"];
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    status: normalizeStatus(project.status),
    environment: project.environment === "sandbox" ? "development" : project.environment,
    connectionMode: project.connectionMode === "detected" ? "mixed" : project.connectionMode,
  };
}

function getProjectStats(projects: Project[]) {
  const activeProjects = projects.filter((project) => project.status === "active").length;
  const connectedApis = projects.reduce((total, project) => total + (project.integrationsCount ?? 0), 0);
  const activeRules = projects.reduce((total, project) => total + (project.rulesCount ?? 0), 0);
  const allowedFlows = projects.reduce((total, project) => total + (project.flowsCount ?? 0), 0);

  return { activeProjects, connectedApis, activeRules, allowedFlows };
}

export function useAllProjects(organizations: Organization[], isOrganizationsLoading: boolean) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!isLoaded || isOrganizationsLoading) return;

    if (!isSignedIn || organizations.length === 0) {
      setProjects([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `${userId ?? "anonymous"}:${organizations.map((organization) => organization.id).sort().join("|")}`;
    const cached = allProjectsCache.get(cacheKey);
    if (cached) {
      setProjects(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let request = allProjectsRequests.get(cacheKey);
      if (!request) {
        request = (async () => {
          const token = await getToken({ skipCache: true });
          if (!token) throw new Error("No se pudo obtener la sesión activa. Vuelve a iniciar sesión.");
          const response = await apiClient.get<ApiResponse<Project[]>>("/projects/all", token);

          return response.data
            .map(normalizeProject)
            .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime());
        })().finally(() => allProjectsRequests.delete(cacheKey));
        allProjectsRequests.set(cacheKey, request);
      }

      const nextProjects = await request;
      allProjectsCache.set(cacheKey, nextProjects);
      setProjects(nextProjects);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los proyectos.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isOrganizationsLoading, isSignedIn, organizations, userId]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const stats = useMemo(() => getProjectStats(projects), [projects]);

  async function pauseProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    const token = isLoaded && isSignedIn ? await getToken({ skipCache: true }) : null;
    if (!token) throw new Error("No se pudo obtener la sesión activa. Vuelve a iniciar sesión.");
    const nextStatus = project.status === "paused" ? "active" : "paused";
    const response = await apiClient.patch<ApiResponse<Project>>(`/projects/${projectId}`, { status: nextStatus }, token, project.organizationId);
    const updated = normalizeProject(response.data);
    setProjects((current) => {
      const nextProjects = current.map((item) => (item.id === projectId ? updated : item));
      allProjectsCache.clear();
      return nextProjects;
    });
  }

  async function updateProject(projectId: string, input: Partial<Project>) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) throw new Error("No se encontró el proyecto para modificar.");

    const token = isLoaded && isSignedIn ? await getToken({ skipCache: true }) : null;
    if (!token) throw new Error("No se pudo obtener la sesión activa. Vuelve a iniciar sesión.");
    const response = await apiClient.patch<ApiResponse<Project>>(
      `/projects/${projectId}`,
      {
        name: input.name,
        slug: input.slug,
        description: input.description,
        projectType: input.projectType,
        environment: input.environment === "development" ? "sandbox" : input.environment,
        connectionMode: input.connectionMode === "mixed" ? "detected" : input.connectionMode,
        status: input.status,
      },
      token,
      project.organizationId,
    );
    const updated = normalizeProject(response.data);
    setProjects((current) => {
      const nextProjects = current.map((item) => (item.id === projectId ? updated : item));
      allProjectsCache.clear();
      return nextProjects;
    });
    return updated;
  }

  async function archiveProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    const token = isLoaded && isSignedIn ? await getToken({ skipCache: true }) : null;
    if (!token) throw new Error("No se pudo obtener la sesión activa. Vuelve a iniciar sesión.");
    await apiClient.delete<ApiResponse<{ id: string; archived: boolean }>>(`/projects/${projectId}`, token, project.organizationId);
    setProjects((current) => {
      const nextProjects = current.map((item) => (item.id === projectId ? { ...item, status: "archived" as const } : item));
      allProjectsCache.clear();
      return nextProjects;
    });
  }

  return {
    projects,
    stats,
    isLoading,
    error,
    reloadProjects: loadProjects,
    updateProject,
    pauseProject,
    archiveProject,
  };
}
