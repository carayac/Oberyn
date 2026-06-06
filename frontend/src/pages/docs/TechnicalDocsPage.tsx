import { ArrowLeft, BookOpen } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import sdkMarkdown from "../../../../docs/sdk.md?raw";
import { AuthBrandLogo } from "../../components/auth/AuthBrandLogo";
import { Card } from "../../components/ui/Card";

type DocSection = {
  title: string;
  body: string[];
};

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; language: string; code: string }
  | { type: "list"; items: string[] };

const gatewayDoc: { title: string; description: string; sections: DocSection[] } = {
  title: "Oberyn Gateway",
  description: "Módulo en desarrollo para enrutar tráfico hacia modelos y APIs externas con inspección, reglas y auditoría antes de llegar al proveedor.",
  sections: [
    {
      title: "Estado",
      body: ["Gateway estará disponible en futuras versiones. Por ahora la integración recomendada para usuarios es el SDK de Oberyn."],
    },
    {
      title: "Qué permitirá",
      body: ["El Gateway funcionará como un proxy seguro para modelos y APIs externas, con inspección de tráfico, reglas centralizadas y auditoría de solicitudes."],
    },
    {
      title: "Mientras tanto",
      body: ["Usa el SDK de Oberyn para proteger prompts, guardar eventos de auditoría y controlar acciones sensibles dentro de tus aplicaciones."],
    },
  ],
};

function parseInline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={`${part}-${index}`} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em] font-semibold text-slate-800">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-bold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function parseMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  let codeLanguage = "";

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    blocks.push({ type: "list", items: list });
    list = [];
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (code) {
        blocks.push({ type: "code", language: codeLanguage, code: code.join("\n") });
        code = null;
        codeLanguage = "";
      } else {
        flushParagraph();
        flushList();
        code = [];
        codeLanguage = line.replace("```", "").trim();
      }
      continue;
    }

    if (code) {
      code.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function MarkdownDoc({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);

  return (
    <div className="mt-6 space-y-4">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <Card key={`${block.text}-${index}`} className="p-7">
                <h2 className="text-2xl font-bold text-slate-950">{block.text}</h2>
              </Card>
            );
          }

          return (
            <div key={`${block.text}-${index}`} className={block.level === 2 ? "pt-5" : "pt-2"}>
              <h2 className={block.level === 2 ? "text-2xl font-bold text-slate-950" : "text-lg font-bold text-slate-950"}>{block.text}</h2>
            </div>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={`${block.text}-${index}`} className="text-sm leading-7 text-slate-600">
              {parseInline(block.text)}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="space-y-2 rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700">
              {block.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#008f1f]" />
                  <span>{parseInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <pre key={`code-${index}`} className="overflow-x-auto rounded-lg bg-slate-950 p-5 text-sm leading-6 text-slate-100">
            <code>{block.code}</code>
          </pre>
        );
      })}
    </div>
  );
}

function GatewayDoc() {
  return (
    <div className="mt-6 space-y-5">
      {gatewayDoc.sections.map((section) => (
        <Card key={section.title} className="p-6">
          <h2 className="text-xl font-bold text-slate-950">{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-sm leading-6 text-slate-600">
              {paragraph}
            </p>
          ))}
        </Card>
      ))}
    </div>
  );
}

export function TechnicalDocsPage() {
  const { topic = "sdk" } = useParams();
  const isGateway = topic === "gateway";

  return (
    <main className="min-h-[100dvh] bg-[#fbfcfd] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <AuthBrandLogo />
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#008f1f]">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>

        <Card className="p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
              <BookOpen className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">{isGateway ? gatewayDoc.title : "Oberyn SDK"}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isGateway ? gatewayDoc.description : "Guía para integrar Oberyn en tu aplicación, proteger acciones importantes y registrar eventos auditables sin exponer claves privadas."}
              </p>
            </div>
          </div>
        </Card>

        {isGateway ? <GatewayDoc /> : <MarkdownDoc markdown={sdkMarkdown} />}
      </div>
    </main>
  );
}
