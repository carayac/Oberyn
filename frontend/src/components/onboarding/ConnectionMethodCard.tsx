import { Card } from "../ui/Card";
export function ConnectionMethodCard({ title = "SDK / Gateway / Manual" }: { title?: string }) { return <Card><p className="text-sm font-medium text-slate-950">{title}</p></Card>; }

