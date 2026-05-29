import { StatusBadge } from "../ui/StatusBadge";
export function ServiceStatusBadge({ status = "no_activity" }: { status?: string }) { return <StatusBadge status={status} />; }

