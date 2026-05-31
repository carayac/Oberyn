export function CodeBlock({ code }: { code: string }) {
  return <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100"><code>{code}</code></pre>;
}

