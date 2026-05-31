import { Card } from "../ui/Card";
export function RuleCard({ name = "Regla base" }: { name?: string }) { return <Card><p className="font-medium text-slate-950">{name}</p></Card>; }

