import { Badge } from "./Badge";
import { formatStatus } from "../../lib/utils/formatStatus";

export function StatusBadge({ status }: { status: string }) {
  return <Badge className="border-brand-100 bg-brand-50 text-brand-700">{formatStatus(status)}</Badge>;
}

