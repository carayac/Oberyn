import { Card } from "../ui/Card";
export function FlowStepItem({ label = "Paso" }: { label?: string }) { return <Card><p className="text-sm text-slate-600">{label}</p></Card>; }

