import { Card } from "../ui/Card";
export function IntegrationCard({ name = "Servicio conectado" }: { name?: string }) { return <Card><p className="font-medium text-slate-950">{name}</p></Card>; }

