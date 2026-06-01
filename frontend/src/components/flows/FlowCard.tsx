import { Card } from "../ui/Card";
export function FlowCard({ name = "Sin flujo seleccionado" }: { name?: string }) { return <Card><p className="font-medium text-slate-950">{name}</p></Card>; }
