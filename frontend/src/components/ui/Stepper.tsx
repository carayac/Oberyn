export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((step, index) => (
        <li key={step} className={index === current ? "rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white" : "rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"}>
          {step}
        </li>
      ))}
    </ol>
  );
}

