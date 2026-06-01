import { Card } from "../ui/Card";
export function BotCard({ name = "Sin bot seleccionado" }: { name?: string }) { return <Card><p className="font-medium text-slate-950">{name}</p></Card>; }
