import { Badge } from "../ui/Badge";
export function RiskBadge({ risk = "medium" }: { risk?: string }) { return <Badge>{risk}</Badge>; }

