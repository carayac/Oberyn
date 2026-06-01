import { Select } from "../ui/Select";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";

export function ProjectSwitcher() {
  const { activeOrganizationId } = useOrganizations();
  const { projects } = useProjects(activeOrganizationId);

  return (
    <Select aria-label="Selector de proyecto" disabled={!projects.length}>
      {projects.length ? projects.map((project) => <option key={project.id}>{project.name}</option>) : <option>Sin proyectos</option>}
    </Select>
  );
}
