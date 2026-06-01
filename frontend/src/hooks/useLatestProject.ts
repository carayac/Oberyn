import { useOrganizations } from "./useOrganizations";
import { useProjects } from "./useProjects";

export function useLatestProject() {
  const { activeOrganization, isLoading: isLoadingOrganizations } = useOrganizations();
  const projectsState = useProjects(activeOrganization?.id);
  const project = projectsState.projects[0] ?? null;

  return {
    activeOrganization,
    project,
    isLoading: isLoadingOrganizations || projectsState.isLoading,
    error: projectsState.error,
  };
}
