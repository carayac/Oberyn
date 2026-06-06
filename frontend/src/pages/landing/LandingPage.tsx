import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bug,
  CheckCircle,
  ClipboardList,
  Clock,
  Code,
  Cpu,
  CreditCard,
  Database,
  Eye,
  FileCheck,
  Globe,
  Headphones,
  KeyRound,
  Link2,
  Lock,
  Mail,
  Menu,
  Plug,
  Server,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Skull,
  UserX,
  X,
} from "lucide-react";

const navItems = [
  { label: "Producto", href: "#producto" },
  { label: "PayGuard", href: "#payguard" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Seguridad", href: "#seguridad" },
  { label: "Auditoría", href: "#auditoria" },
  { label: "Comienza ahora", href: "#comienza" },
];

const risks = [
  { icon: Database, label: "Bases de datos" },
  { icon: Mail, label: "Correos" },
  { icon: CreditCard, label: "Pagos" },
  { icon: ShoppingCart, label: "E-commerce" },
  { icon: Server, label: "APIs externas" },
];

const pillars = [
  {
    icon: Shield,
    title: "Control de acciones",
    description: "Define reglas granulares y personalizables para cada tipo de operación. Bloquea, permite o escala según el contexto y nivel de riesgo.",
  },
  {
    icon: Lock,
    title: "Protección de datos sensibles",
    description: "Detecta y bloquea información confidencial antes de que salga de tu infraestructura hacia APIs o modelos externos.",
  },
  {
    icon: FileCheck,
    title: "Auditoría verificable",
    description: "Genera registros inmutables con hashes que pueden anclarse en Stellar para demostrar trazabilidad sin exponer datos.",
  },
];

const steps = [
  {
    icon: Plug,
    title: "Conecta Oberyn",
    description: "Integra por SDK en minutos. Gateway estara disponible en futuras versiones.",
  },
  {
    icon: Cpu,
    title: "La IA intenta ejecutar",
    description: "Tu agente o bot intenta realizar una acción sobre una API, base de datos o servicio externo.",
  },
  {
    icon: ShieldCheck,
    title: "Oberyn valida",
    description: "Evaluamos reglas, nivel de riesgo y permisos en tiempo real antes de permitir la ejecución.",
  },
  {
    icon: ClipboardList,
    title: "Acción controlada",
    description: "La acción se permite, bloquea o requiere aprobación humana, y queda registrada para auditoría.",
  },
];

const auditEvents = [
  {
    date: "16 may 2025 14:32:18",
    source: "OpenAI API",
    action: "Generación de respuesta",
    risk: "Bajo",
    decision: "Permitida",
    hash: "a3f4c9d2b1e8...7f2e9c0b",
    stellarTx: "TX7A...1B8C",
  },
  {
    date: "16 may 2025 14:28:05",
    source: "Stripe API",
    action: "Crear reembolso",
    risk: "Medio",
    decision: "Aprobación",
    hash: "b8e1d4a7c5f2...9d3b7a1e",
    stellarTx: "TX3E...7C21",
  },
  {
    date: "16 may 2025 14:03:55",
    source: "Anthropic API",
    action: "Análisis de documento",
    risk: "Alto",
    decision: "Bloqueada",
    hash: "f4e3d2c1b9a8...7d6c5b4a",
    stellarTx: "TX6D...8F3B",
  },
];

const auditStats = [
  { label: "Eventos auditados", value: "9,842", change: "Trazabilidad completa" },
  { label: "Bloqueadas", value: "1,376", change: "Acciones de riesgo" },
  { label: "Aprobadas", value: "8,232", change: "Con reglas aplicadas" },
  { label: "Anclajes en Stellar", value: "9,842", change: "Evidencia verificable" },
];

const useCases = [
  {
    icon: ShoppingCart,
    title: "E-commerce",
    description: "Protege cambios de precios, inventario, procesamiento de pedidos y devoluciones automatizadas.",
    examples: ["Cambios de precio", "Gestión de inventario", "Estados de pedidos"],
  },
  {
    icon: Banknote,
    title: "Fintech",
    description: "Controla pagos, aprobaciones de transacciones y acceso a datos financieros sensibles.",
    examples: ["Transferencias", "Límites de crédito", "Datos bancarios"],
  },
  {
    icon: Headphones,
    title: "Soporte",
    description: "Supervisa acciones sobre tickets, correos automatizados y modificaciones en tu CRM.",
    examples: ["Tickets", "Correos", "Datos de clientes"],
  },
  {
    icon: Settings,
    title: "Operaciones internas",
    description: "Audita reportes automatizados, integraciones y operaciones sobre bases de datos críticas.",
    examples: ["Reportes", "Automatizaciones", "Base de datos"],
  },
];

const payGuardCards = [
  { icon: UserX, title: "Pagos aprobados por personas" },
  { icon: Link2, title: "Ejecución con escrow de Trustless Work" },
  { icon: FileCheck, title: "Registros de pago listos para auditoría" },
  { icon: Shield, title: "Permisos de agentes basados en reglas" },
  { icon: Banknote, title: "Liquidación nativa con stablecoins" },
];

const payGuardFlow = ["Agente de IA", "Solicitud de pago", "Validación de reglas", "Aprobación humana", "Escrow de Trustless Work", "Pago en blockchain"];

const controlQuestions = [
  "¿Qué intentó hacer la IA?",
  "¿Tenía permiso para hacerlo?",
  "¿Debía ejecutarse o requería aprobación?",
  "¿Cómo demostramos qué pasó después?",
];

type ButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline";
  size?: "sm" | "lg";
  to?: string;
};

function Button({ children, className = "", variant = "default", size, to }: ButtonProps) {
  const sizeClass = size === "sm" ? "h-8 rounded-md px-3 text-sm" : size === "lg" ? "h-10 rounded-md px-6 text-sm" : "h-9 rounded-md px-4 text-sm";
  const variantClass =
    variant === "outline"
      ? "border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground"
      : "bg-primary text-primary-foreground hover:bg-primary/90";
  const classes = `inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${sizeClass} ${variantClass} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes}>
      {children}
    </button>
  );
}

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <img src="/assets/oberyn-logo.svg" alt="Oberyn" className="h-9 w-auto" />
            </a>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center md:flex">
            <Button size="sm" to="/login">
              Iniciar sesión
            </Button>
          </div>

          <button className="p-2 text-muted-foreground hover:text-foreground md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} type="button">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border py-4 md:hidden">
            <nav className="flex flex-col gap-4">
              {navItems.map((item) => (
                <a key={item.label} href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <Button size="sm" to="/login">
                  Iniciar sesión
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pb-12 pt-6 lg:pb-20 lg:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {[
            { icon: Skull, label: "Hackeo del agente" },
            { icon: UserX, label: "Acceso no autorizado" },
            { icon: Bug, label: "Errores catastróficos" },
            { icon: AlertTriangle, label: "Inyección de prompts" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 px-4 py-2">
              <item.icon className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-2xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              La IA ya no solo responde. <span className="text-primary">Ahora opera.</span>
            </h1>
            <p className="text-pretty mt-6 text-lg leading-relaxed text-muted-foreground">
              Los agentes de IA ya pueden llamar APIs, modificar datos, ejecutar procesos internos y proponer pagos. Oberyn es la capa de confianza que gobierna esas acciones antes de que ocurran.
            </p>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Cuando una IA pasa de hablar a actuar, la pregunta no es solo qué puede hacer: es quién la gobierna, qué límites tiene y cómo lo demostramos.
            </p>

            <div className="mt-8 rounded-xl border border-border bg-muted/50 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">Sin Oberyn, un atacante podría:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-destructive">•</span>
                  Inyectar prompts maliciosos para manipular decisiones del agente
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-destructive">•</span>
                  Ejecutar transferencias bancarias a cuentas externas
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-destructive">•</span>
                  Acceder y exfiltrar información confidencial de clientes
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-destructive">•</span>
                  Borrar registros críticos sin dejar rastro auditable
                </li>
              </ul>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2" to="/login">
                Proteger mi agente
                <ArrowRight className="h-4 w-4" />
              </Button>
              <a href="#como-funciona" className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground">
                Ver cómo funciona
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-chart-4/60" />
                  <div className="h-3 w-3 rounded-full bg-primary/60" />
                </div>
                <span className="ml-2 text-xs text-muted-foreground">Panel — Oberyn</span>
              </div>

              <div className="space-y-4 p-6">
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-destructive/10 p-2">
                      <Skull className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">Ataque detectado y bloqueado</span>
                        <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">Bloqueado</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Inyección de prompts detectada — intento de evadir reglas de seguridad</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-destructive/10 p-2">
                      <Shield className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">Acción de alto riesgo</span>
                        <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">Bloqueada</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">DELETE /api/database/users — Eliminación masiva sin autorización</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-chart-4/30 bg-chart-4/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-chart-4/10 p-2">
                      <Clock className="h-5 w-5 text-chart-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">Requiere aprobación humana</span>
                        <span className="rounded-full bg-chart-4/10 px-2 py-1 text-xs font-medium text-chart-4">Pendiente</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">POST /api/stripe/transfer — $12,500 a cuenta externa</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">Todo auditado en Stellar</span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Verificado</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">42 acciones registradas hoy — evidencia inmutable en blockchain</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 -top-4 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-4 -left-4 -z-10 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section id="producto" className="bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">El problema</span>
          </div>

          <h2 className="text-balance text-3xl font-bold text-foreground sm:text-4xl">La IA ya no solo responde texto. Ahora ejecuta acciones.</h2>

          <p className="text-pretty mt-6 text-lg leading-relaxed text-muted-foreground">
            Los agentes de IA, bots y asistentes conectados a APIs pueden modificar datos, enviar información sensible o ejecutar acciones críticas sobre tus sistemas — sin suficiente control humano.
          </p>

          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
            {controlQuestions.map((question) => (
              <div key={question} className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-left text-sm font-semibold text-destructive">
                {question}
              </div>
            ))}
          </div>

          <p className="text-pretty mx-auto mt-8 max-w-3xl text-base leading-7 text-muted-foreground">
            Muchas herramientas se enfocan en proteger el chat o analizar el prompt. El riesgo real aparece cuando la IA pasa de hablar a actuar: una respuesta incorrecta puede corregirse; una acción crítica mal ejecutada puede tener consecuencias reales.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {risks.map((risk) => (
              <div key={risk.label} className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
                <risk.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{risk.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">La solución</span>
          </div>

          <h2 className="text-balance text-3xl font-bold text-foreground sm:text-4xl">Control antes de ejecutar, evidencia después de cada acción</h2>

          <p className="text-pretty mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">Oberyn evalúa prompts, acciones, permisos y riesgo en tiempo real para decidir si una operación se permite, se bloquea o requiere aprobación humana.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {pillars.map((pillar, index) => (
            <div key={pillar.title} className="relative rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="absolute -top-4 left-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
                  <pillar.icon className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>

              <div className="pt-6">
                <div className="mb-2 text-xs font-medium text-primary">0{index + 1}</div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">{pillar.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{pillar.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <h3 className="text-xl font-semibold text-foreground">Personalizable con reglas por proyecto</h3>
          <p className="mx-auto mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            Cada proyecto puede tener sus propias reglas de riesgo, aprobación, datos sensibles, servicios permitidos y acciones bloqueadas. Oberyn no obliga un comportamiento único: se adapta al contexto de tu agente, bot o integración.
          </p>
        </div>
      </div>
    </section>
  );
}

function PayGuardLanding() {
  return (
    <section id="payguard" className="bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
              <Banknote className="h-4 w-4" />
              <span className="text-sm font-medium">PayGuard</span>
            </div>

            <h2 className="text-balance text-3xl font-bold text-foreground sm:text-4xl">El agente propone el pago. La persona lo aprueba. Oberyn lo ejecuta con control verificable.</h2>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
              Oberyn PayGuard permite que los agentes de IA preparen solicitudes de pago sin darles control directo sobre los fondos. Cada pago se valida contra reglas, queda registrado en auditoría, requiere aprobación humana y luego se ejecuta mediante la infraestructura de escrow de Trustless Work.
            </p>
            <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground">
              Usamos blockchain donde sí aporta valor: custodiar fondos, trazar cada paso y demostrar cuándo se solicitó, aprobó, fondeó y liberó un pago.
            </p>
            <p className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-lg font-semibold text-primary">
              El agente propone. La persona aprueba. Oberyn ejecuta el pago en blockchain.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {payGuardCards.map((card) => (
                <div key={card.title} className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <card.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">{card.title}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
              <h3 className="text-sm font-semibold text-foreground">Flujo de control del pago</h3>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {payGuardFlow.map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground">{step}</span>
                    {index < payGuardFlow.length - 1 ? <ArrowRight className="h-4 w-4 text-primary" /> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-balance text-3xl font-bold text-foreground sm:text-4xl">Cómo funciona</h2>
          <p className="text-pretty mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Un flujo simple de 4 pasos para proteger todas las acciones de tu IA.</p>
        </div>

        <div className="relative">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative z-10 mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</div>
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SdkGateway() {
  return (
    <section id="seguridad" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-secondary-foreground">
            <KeyRound className="h-4 w-4" />
            <span className="text-sm font-medium">Seguridad primero</span>
          </div>

          <h2 className="text-balance text-3xl font-bold text-foreground sm:text-4xl">Tus credenciales nunca salen de tu infraestructura</h2>

          <p className="text-pretty mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Oberyn no necesita almacenar API keys privadas. Las credenciales permanecen en tu infraestructura mientras nosotros validamos las acciones.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          <div className="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:border-primary/30 hover:shadow-lg">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <Code className="h-7 w-7 text-primary" />
            </div>

            <h3 className="mb-3 text-xl font-semibold text-foreground">SDK</h3>
            <p className="mb-6 leading-relaxed text-muted-foreground">Protege acciones críticas directamente desde tu código. Integra en minutos con soporte para Node.js, Python y más.</p>

            <div className="rounded-xl border border-border bg-muted/50 p-4 font-mono text-sm">
              <div className="text-muted-foreground">
                <span className="text-primary">import</span> {"{"} createOberyn {"}"} <span className="text-primary">from</span> <span className="text-chart-2">"oberyn"</span>
              </div>
              <div className="mt-2 text-muted-foreground">
                <span className="text-primary">await</span> oberyn.<span className="text-chart-1">protect</span>(action)
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:border-primary/30 hover:shadow-lg">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <Globe className="h-7 w-7 text-primary" />
            </div>

            <h3 className="mb-3 text-xl font-semibold text-foreground">Gateway en desarrollo</h3>
            <p className="mb-6 leading-relaxed text-muted-foreground">El Gateway sera una implementacion de futuras versiones. Por ahora, Oberyn se integra mediante SDK para proteger prompts, acciones y auditoria.</p>

            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Disponible proximamente</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StellarAudit() {
  return (
    <section id="auditoria" className="bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
            <Link2 className="h-4 w-4" />
            <span className="text-sm font-medium">Auditoría en blockchain</span>
          </div>

          <h2 className="text-balance text-3xl font-bold text-foreground sm:text-4xl">Cada acción, verificable en Stellar</h2>

          <p className="text-pretty mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Consulta eventos, decisiones, hashes y evidencia verificable de cada operación.</p>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {auditStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-1 text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="mt-1 text-xs text-primary">{stat.change}</div>
            </div>
          ))}
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Registro de auditoría</div>
                <div className="text-xs text-muted-foreground">Verificado en Stellar Network</div>
              </div>
            </div>
          </div>

          <div className="hidden grid-cols-7 gap-4 border-b border-border bg-muted/20 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <div>Fecha</div>
            <div>Fuente</div>
            <div>Acción</div>
            <div>Riesgo</div>
            <div>Decisión</div>
            <div>Hash</div>
            <div>Stellar TX</div>
          </div>

          <div className="divide-y divide-border">
            {auditEvents.map((event) => (
              <div key={`${event.date}-${event.action}`} className="grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-muted/30 md:grid-cols-7 md:gap-4">
                <div className="text-sm text-muted-foreground md:text-foreground">
                  <span className="mr-2 text-xs text-muted-foreground md:hidden">Fecha:</span>
                  {event.date}
                </div>
                <div className="text-sm font-medium text-foreground">
                  <span className="mr-2 text-xs text-muted-foreground md:hidden">Fuente:</span>
                  {event.source}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="mr-2 text-xs text-muted-foreground md:hidden">Acción:</span>
                  {event.action}
                </div>
                <div>
                  <span className="mr-2 text-xs text-muted-foreground md:hidden">Riesgo:</span>
                  <span className={`inline-flex items-center gap-1.5 text-sm ${event.risk === "Bajo" ? "text-primary" : event.risk === "Medio" ? "text-amber-600" : "text-red-600"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${event.risk === "Bajo" ? "bg-primary" : event.risk === "Medio" ? "bg-amber-500" : "bg-red-500"}`} />
                    {event.risk}
                  </span>
                </div>
                <div>
                  <span className="mr-2 text-xs text-muted-foreground md:hidden">Decisión:</span>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${event.decision === "Permitida" ? "bg-primary/10 text-primary" : event.decision === "Aprobación" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                    {event.decision}
                  </span>
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  <span className="mr-2 font-sans text-xs text-muted-foreground md:hidden">Hash:</span>
                  {event.hash}
                </div>
                <div className="font-mono text-sm text-muted-foreground">
                  <span className="mr-2 font-sans text-xs text-muted-foreground md:hidden">Stellar TX:</span>
                  {event.stellarTx}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Evidencia verificable</h3>
            <div className="flex items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-primary">Auditoría verificada</div>
                <div className="mt-1 text-xs text-muted-foreground">La integridad de los registros está garantizada mediante hashes, Merkle Tree y anclaje en Stellar.</div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                Verificar integridad
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Acciones rápidas</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Share2 className="h-4 w-4" />
                Compartir comprobante de auditoría
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <ShieldCheck className="h-4 w-4" />
                Descargar paquete de evidencia
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-balance text-3xl font-bold text-foreground sm:text-4xl">Casos de uso</h2>
          <p className="text-pretty mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Oberyn protege acciones de IA en múltiples industrias y escenarios.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((useCase) => (
            <div key={useCase.title} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <useCase.icon className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
              </div>

              <h3 className="mb-2 text-lg font-semibold text-foreground">{useCase.title}</h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{useCase.description}</p>

              <div className="flex flex-wrap gap-2">
                {useCase.examples.map((example) => (
                  <span key={example} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {example}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section id="comienza" className="bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

          <div className="relative px-8 py-16 sm:px-16 sm:py-20 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Comienza ahora</span>
              </div>

              <h2 className="text-balance text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">Dale permisos a tu IA sin perder el control</h2>

              <p className="text-pretty mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">Empieza con SDK y reglas por proyecto. Controla acciones, protege datos y demuestra trazabilidad.</p>

              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
                <Button size="lg" className="gap-2" to="/login">
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  <span>SDK integrable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Gateway en desarrollo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Reglas por proyecto</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 py-12 lg:flex-row lg:items-center lg:justify-between lg:py-14">
          <div>
            <a href="/" className="flex items-center">
              <img src="/assets/oberyn-logo.svg" alt="Oberyn" className="h-8 w-auto" />
            </a>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">Capa de control, reglas y auditoría para agentes de IA que ejecutan acciones importantes.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/docs/sdk" className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground">
              Documentación
            </Link>
            <Button to="/login">Iniciar sesión</Button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Oberyn. Todos los derechos reservados.</p>
          <Link to="/docs/sdk" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Documentación
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="landing-page min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <UseCases />
        <Problem />
        <Solution />
        <PayGuardLanding />
        <HowItWorks />
        <SdkGateway />
        <StellarAudit />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}


