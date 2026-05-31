export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p> : null}
    </header>
  );
}

