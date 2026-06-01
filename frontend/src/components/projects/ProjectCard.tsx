import { Card } from "../ui/Card";
export function ProjectCard({ name = "Sin proyecto seleccionado" }: { name?: string }) { return <Card><p className="font-medium text-slate-950">{name}</p></Card>; }
