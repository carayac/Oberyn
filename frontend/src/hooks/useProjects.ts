import { useAuth } from "@clerk/react";
import { useEffect, useMemo, useState } from "react";
import { mockProjects } from "../data/mockProjects";
import { apiClient } from "../lib/api/client";
import type { CreateProjectInput, Project } from "../types/project";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

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

function useProjectStats(projects: Project[]) {
  return useMemo(() => {
    const activeProjects = projects.filter((project) => project.status === "active").length;
    const connectedApis = projects.reduce((total, project) => total + (project.integrationsCount ?? 0), 0);
    const activeRules = projects.reduce((total, project) => total + (project.rulesCount ?? 0), 0);
    const allowedFlows = projects.reduce((total, project) => total + (project.flowsCount ?? 0), 0);

    return { activeProjects, connectedApis, activeRules, allowedFlows };
  }, [projects]);
}

function usePreviewProjects(organizationId?: string | null) {
  const [projects, setProjects] = useState<Project[]>(() => mockProjects.filter((project) => !organizationId || project.organizationId === organizationId));
  const stats = useProjectStats(projects);

  useEffect(() => {
    setProjects(mockProjects.filter((project) => !organizationId || project.organizationId === organizationId));
  }, [organizationId]);

  async function createProject(input: CreateProjectInput) {
    if (!organizationId) throw new Error("Crea una organizacion antes de crear proyectos.");

    const project: Project = {
      id: `project_preview_${Date.now()}`,
      organizationId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      projectType: input.projectType,
      environment: input.environment,
      connectionMode: input.connectionMode,
      status: "active",
      riskProfile: input.riskProfile,
      defaultPolicyMode: input.defaultPolicyMode,
      auditEnabled: true,
      stellarAnchorEnabled: false,
      protectedServicesCount: 0,
      integrationsCount: 0,
      rulesCount: 0,
      botsCount: 0,
      flowsCount: 0,
      pendingApprovalsCount: 0,
      allowedActionsCount: 0,
      blockedActionsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects((current) => [project, ...current]);
    return project;
  }

  async function pauseProject(projectId: string) {
    setProjects((current) =>
      current.map((project) => (project.id === projectId ? { ...project, status: project.status === "paused" ? "active" : "paused", updatedAt: new Date().toISOString() } : project)),
    );
  }

  async function archiveProject(projectId: string) {
    setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, status: "archived", updatedAt: new Date().toISOString() } : project)));
  }

  return {
    projects,
    stats,
    isLoading: false,
    error: null,
    reloadProjects: async () => undefined,
    createProject,
    pauseProject,
    archiveProject,
  };
}

function useClerkProjects(organizationId?: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function getAuthToken() {
    if (!isLoaded || !isSignedIn) return null;
    return getToken();
  }

  async function loadProjects() {
    if (!organizationId) {
      setProjects([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const response = await apiClient.get<ApiResponse<Project[]>>("/projects", token, organizationId);
      setProjects(response.data.map(normalizeProject));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los proyectos.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    void loadProjects();
  }, [isLoaded, isSignedIn, organizationId]);

  const stats = useProjectStats(projects);

  async function createProject(input: CreateProjectInput) {
    if (!organizationId) throw new Error("Crea una organizacion antes de crear proyectos.");

    const token = await getAuthToken();
    const response = await apiClient.post<ApiResponse<Project>>(
      "/projects",
      {
        name: input.name,
        slug: input.slug,
        description: input.description,
        projectType: input.projectType,
        environment: input.environment === "development" ? "sandbox" : input.environment,
        connectionMode: input.connectionMode === "mixed" ? "detected" : input.connectionMode,
      },
      token,
      organizationId,
    );
    const project = normalizeProject(response.data);
    setProjects((current) => [project, ...current]);
    return project;
  }

  async function pauseProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    const token = await getAuthToken();
    const nextStatus = project.status === "paused" ? "active" : "paused";
    const response = await apiClient.patch<ApiResponse<Project>>(`/projects/${projectId}`, { status: nextStatus }, token, organizationId);
    const updated = normalizeProject(response.data);
    setProjects((current) => current.map((item) => (item.id === projectId ? updated : item)));
  }

  async function archiveProject(projectId: string) {
    const token = await getAuthToken();
    await apiClient.delete<ApiResponse<{ id: string; archived: boolean }>>(`/projects/${projectId}`, token, organizationId);
    setProjects((current) => current.map((item) => (item.id === projectId ? { ...item, status: "archived" } : item)));
  }

  return {
    projects,
    stats,
    isLoading,
    error,
    reloadProjects: loadProjects,
    createProject,
    pauseProject,
    archiveProject,
  };
}

export const useProjects = hasClerkKey ? useClerkProjects : usePreviewProjects;
