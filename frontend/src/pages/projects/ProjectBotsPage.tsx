import { Bot, Plus } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { SecurityPageFrame } from "../../components/projects/SecurityPageFrame";
import { useProjectData } from "../../hooks/useProjectData";

export function ProjectBotsPage() {
  const { projectId } = useParams();
  const { bots, createBot, error } = useProjectData(projectId);
  const [name, setName] = useState("");

  async function addBot() {
    await createBot({ name: name || "Bot de operaciones", role: "automation_agent", description: "Bot autorizado para acciones controladas por Oberyn.", status: "active" });
    setName("");
  }

  return (
    <SecurityPageFrame title="Bots" description="Registra bots y agentes de automatizacion que ejecutaran acciones protegidas por SDK o Gateway.">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-xl border border-[#dce2ea] bg-white p-5">
          <h2 className="text-xl font-extrabold text-[#050505]">Bots registrados</h2>
          <div className="mt-5 grid gap-3">
            {bots.map((bot) => (
              <article key={bot.id} className="flex gap-4 rounded-lg border border-[#edf1f5] p-4">
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#eaf7ee] text-[#00951d]"><Bot className="h-6 w-6" /></span>
                <div>
                  <h3 className="font-extrabold text-[#111827]">{bot.name}</h3>
                  <p className="text-sm font-semibold text-[#596783]">{bot.role} · {bot.identifier}</p>
                </div>
              </article>
            ))}
            {!bots.length && <p className="rounded-lg bg-slate-50 p-6 text-center text-sm font-bold text-[#596783]">No hay bots registrados.</p>}
          </div>
        </div>
        <aside className="rounded-xl border border-[#dce2ea] bg-white p-5">
          <h2 className="text-xl font-extrabold text-[#050505]">Nuevo bot</h2>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. bot-soporte" className="mt-4 h-11 w-full rounded-lg border border-[#dce2ea] px-4 text-sm outline-none focus:border-[#00951d]" />
          <button type="button" onClick={() => void addBot()} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00951d] text-sm font-extrabold text-white"><Plus className="h-4 w-4" />Crear bot</button>
        </aside>
      </section>
    </SecurityPageFrame>
  );
}
