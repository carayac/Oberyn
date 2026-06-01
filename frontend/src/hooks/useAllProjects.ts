import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/api/client";
import type { Organization } from "../types/organization";
import type { Project } from "../types/project";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

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
  const { getToken, isLoaded, isSignedIn } = useAuth();
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

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const responses = await Promise.all(
        organizations.map((organization) => apiClient.get<ApiResponse<Project[]>>("/projects", token, organization.id)),
      );

      const nextProjects = responses
        .flatMap((response) => response.data.map(normalizeProject))
        .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime());

      setProjects(nextProjects);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los proyectos.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isOrganizationsLoading, isSignedIn, organizations]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const stats = useMemo(() => getProjectStats(projects), [projects]);

  async function pauseProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    const token = isLoaded && isSignedIn ? await getToken() : null;
    const nextStatus = project.status === "paused" ? "active" : "paused";
    const response = await apiClient.patch<ApiResponse<Project>>(`/projects/${projectId}`, { status: nextStatus }, token, project.organizationId);
    const updated = normalizeProject(response.data);
    setProjects((current) => current.map((item) => (item.id === projectId ? updated : item)));
  }

  async function archiveProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    const token = isLoaded && isSignedIn ? await getToken() : null;
    await apiClient.delete<ApiResponse<{ id: string; archived: boolean }>>(`/projects/${projectId}`, token, project.organizationId);
    setProjects((current) => current.map((item) => (item.id === projectId ? { ...item, status: "archived" } : item)));
  }

  return {
    projects,
    stats,
    isLoading,
    error,
    reloadProjects: loadProjects,
    pauseProject,
    archiveProject,
  };
}
