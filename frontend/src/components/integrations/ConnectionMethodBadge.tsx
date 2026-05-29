import { Badge } from "../ui/Badge";
export function ConnectionMethodBadge({ method = "manual" }: { method?: string }) { return <Badge>{method}</Badge>; }

