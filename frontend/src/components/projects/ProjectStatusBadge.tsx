import { StatusBadge } from "../ui/StatusBadge";
export function ProjectStatusBadge({ status = "active" }: { status?: string }) { return <StatusBadge status={status} />; }

