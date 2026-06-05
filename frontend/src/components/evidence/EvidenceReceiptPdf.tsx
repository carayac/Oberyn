import {
  Circle,
  Document,
  G,
  Image,
  Link,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

export type EvidenceReceiptPdfProps = {
  generatedAt: string;
  logoSrc?: string | null;
  organization: {
    id: string;
    name: string;
    slug?: string | null;
  };
  project: {
    id: string;
    name: string;
    slug?: string | null;
    environment?: string | null;
  };
  event: {
    id: string;
    eventType: string;
    actionName: string;
    decision: "approved" | "blocked" | "requires_approval" | string;
    riskLevel: "low" | "medium" | "high" | "critical" | string;
    source?: "sdk" | "gateway" | "api" | string | null;
    serviceName?: string | null;
    serviceProvider?: string | null;
    actorLabel?: string | null;
    createdAt: string;
  };
  evidence: {
    eventHash: string;
    merkleRoot?: string | null;
    stellarTxHash?: string | null;
    stellarNetwork?: "testnet" | "mainnet" | string | null;
    ledger?: number | string | null;
    batchId?: string | null;
    batchPosition?: number | string | null;
    anchoredAt?: string | null;
    explorerUrl?: string | null;
    verified: boolean;
    verifiedAt?: string | null;
    sensitiveDataStoredOnChain: boolean;
  };
  verification: {
    statusLabel: string;
    integrityMessage: string;
    publicVerificationUrl?: string | null;
  };
};

const colors = {
  black: "#05070d",
  slate: "#52627a",
  muted: "#7a8aa5",
  border: "#d9e2ec",
  panel: "#f8fafc",
  green: "#008f1f",
  greenDark: "#006b18",
  greenSoft: "#eaf8ee",
  red: "#dc2626",
  redSoft: "#fee2e2",
  amber: "#d97706",
  amberSoft: "#fef3c7",
  white: "#ffffff",
};

export function formatDecisionLabel(decision: string) {
  const labels: Record<string, string> = {
    approved: "Permitida",
    allowed: "Permitida",
    blocked: "Bloqueada",
    denied: "Bloqueada",
    rejected: "Bloqueada",
    requires_approval: "Requiere aprobación",
    approval_required: "Requiere aprobación",
    pending_approval: "Requiere aprobación",
  };
  return labels[decision] ?? decision;
}

export function formatRiskLabel(risk: string) {
  const labels: Record<string, string> = {
    low: "Bajo",
    medium: "Medio",
    high: "Alto",
    critical: "Crítico",
  };
  return labels[risk] ?? risk;
}

export function formatEvidenceDate(value?: string | null) {
  if (!value) return "Pendiente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function shortHash(value?: string | null, chars = 12) {
  if (!value) return "Pendiente";
  if (value.length <= chars * 2 + 3) return value;
  return `${value.slice(0, chars)}...${value.slice(-chars)}`;
}

function wrapHash(value?: string | null, chunkSize = 34) {
  if (!value) return "Pendiente";
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize));
  }
  return chunks.join("\n");
}

function valueOrPending(value?: string | number | null) {
  if (value === null || value === undefined || String(value).trim() === "") return "Pendiente";
  return String(value);
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 38,
    paddingTop: 30,
    paddingBottom: 50,
    fontFamily: "Helvetica",
    color: colors.black,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandText: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 4,
    color: colors.black,
  },
  brandSub: {
    marginTop: 4,
    fontSize: 6.5,
    letterSpacing: 1.3,
    color: colors.slate,
  },
  titleBlock: {
    flex: 1,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  subtitle: {
    marginTop: 4,
    maxWidth: 260,
    fontSize: 8,
    color: colors.slate,
    lineHeight: 1.45,
    textAlign: "right",
  },
  generated: {
    marginTop: 8,
    fontSize: 7,
    color: colors.slate,
    textAlign: "right",
  },
  banner: {
    marginTop: 14,
    marginBottom: 12,
    padding: 12,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
  },
  bannerVerified: {
    backgroundColor: colors.greenSoft,
    borderColor: "#b7e7c2",
  },
  bannerPending: {
    backgroundColor: colors.amberSoft,
    borderColor: "#f6d58c",
  },
  statusIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  statusCheck: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
  },
  statusTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  statusText: {
    marginTop: 3,
    fontSize: 8,
    color: colors.slate,
    lineHeight: 1.45,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 13,
  },
  badge: {
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  badgeLabel: {
    fontSize: 6.4,
    textTransform: "uppercase",
    color: colors.slate,
  },
  badgeValue: {
    marginTop: 2,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  mainColumn: {
    width: "58%",
  },
  sideColumn: {
    width: "42%",
  },
  section: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionAccent: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.green,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  fieldHalf: {
    width: "50%",
    paddingRight: 10,
    marginBottom: 8,
  },
  fieldFull: {
    width: "100%",
    marginBottom: 8,
  },
  fieldLabel: {
    marginBottom: 2,
    fontSize: 6.4,
    color: colors.slate,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  fieldValue: {
    fontSize: 8,
    color: colors.black,
    lineHeight: 1.35,
  },
  mono: {
    fontFamily: "Courier",
    fontSize: 7.2,
    lineHeight: 1.35,
  },
  hashBox: {
    marginBottom: 7,
    padding: 8,
    borderRadius: 5,
    borderLeftWidth: 2,
    borderLeftColor: colors.green,
    backgroundColor: colors.panel,
  },
  privacy: {
    padding: 11,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#b7e7c2",
    backgroundColor: colors.greenSoft,
  },
  privacyTitle: {
    marginBottom: 4,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  privacyText: {
    fontSize: 7.5,
    color: colors.slate,
    lineHeight: 1.5,
  },
  link: {
    fontSize: 7.2,
    color: colors.green,
    fontFamily: "Courier",
    lineHeight: 1.35,
  },
  footer: {
    position: "absolute",
    left: 38,
    right: 38,
    bottom: 20,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 6.6,
    color: colors.slate,
  },
  footerBrand: {
    width: 76,
    height: 22,
    objectFit: "contain",
  },
  footerBrandFallback: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.greenDark,
  },
  logoImage: {
    width: 132,
    height: 38,
    objectFit: "contain",
  },
});

function AtomMark() {
  return (
    <Svg width={30} height={30} viewBox="0 0 48 48">
      <G stroke={colors.black} strokeWidth={2} fill="none">
        <Path d="M5 24c0-6.2 8.5-11.2 19-11.2S43 17.8 43 24 34.5 35.2 24 35.2 5 30.2 5 24Z" />
        <Path d="M14.5 8.3c5.4-3.1 13.6 2.7 18.8 12.8 5.1 10.1 5 20.1-.4 23.2-5.4 3.1-13.6-2.7-18.8-12.8-5.1-10.1-5-20.1.4-23.2Z" />
        <Path d="M32.9 8.3c5.4 3.1 5.5 13.1.4 23.2-5.2 10.1-13.4 15.9-18.8 12.8-5.4-3.1-5.5-13.1-.4-23.2C19.3 11 27.5 5.2 32.9 8.3Z" />
      </G>
      <Circle cx={24} cy={24} r={6} fill={colors.greenSoft} stroke={colors.green} strokeWidth={2} />
      <Circle cx={24} cy={24} r={2.2} fill={colors.green} />
    </Svg>
  );
}

function Brand({ logoSrc }: { logoSrc?: string | null }) {
  return (
    <View>
      {logoSrc ? (
        <Image src={logoSrc} style={styles.logoImage} />
      ) : (
        <View style={styles.brand}>
          <AtomMark />
          <Text style={styles.brandText}>OBERYN</Text>
        </View>
      )}
      <Text style={styles.brandSub}>EVIDENCIA VERIFICABLE</Text>
    </View>
  );
}

function Header({ generatedAt, logoSrc }: { generatedAt: string; logoSrc?: string | null }) {
  return (
    <View style={styles.header}>
      <Brand logoSrc={logoSrc} />
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Comprobante de evidencia verificable</Text>
        <Text style={styles.subtitle}>Registro de auditoría protegido criptográficamente.</Text>
        <Text style={styles.generated}>Generado el {formatEvidenceDate(generatedAt)}</Text>
      </View>
    </View>
  );
}

function StatusBanner({
  verified,
  statusLabel,
  integrityMessage,
}: {
  verified: boolean;
  statusLabel: string;
  integrityMessage: string;
}) {
  const color = verified ? colors.green : colors.amber;
  return (
    <View style={[styles.banner, verified ? styles.bannerVerified : styles.bannerPending]}>
      <View style={[styles.statusIcon, { borderColor: color }]}>
        <Text style={[styles.statusCheck, { color }]}>{verified ? "OK" : "!"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statusTitle, { color }]}>{statusLabel}</Text>
        <Text style={styles.statusText}>{integrityMessage}</Text>
      </View>
    </View>
  );
}

function decisionColor(decision: string) {
  if (["blocked", "denied", "rejected"].includes(decision)) return { bg: colors.redSoft, text: colors.red };
  if (["requires_approval", "approval_required", "pending_approval"].includes(decision)) return { bg: colors.amberSoft, text: colors.amber };
  return { bg: colors.greenSoft, text: colors.greenDark };
}

function riskColor(risk: string) {
  if (risk === "critical" || risk === "high") return { bg: colors.redSoft, text: colors.red };
  if (risk === "medium") return { bg: colors.amberSoft, text: colors.amber };
  return { bg: colors.greenSoft, text: colors.greenDark };
}

function Badge({ label, value, tone }: { label: string; value: string; tone: { bg: string; text: string } }) {
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={styles.badgeLabel}>{label}</Text>
      <Text style={[styles.badgeValue, { color: tone.text }]}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Field({ label, value, full, mono }: { label: string; value?: string | number | null; full?: boolean; mono?: boolean }) {
  return (
    <View style={full ? styles.fieldFull : styles.fieldHalf}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={mono ? [styles.fieldValue, styles.mono] : styles.fieldValue}>{valueOrPending(value)}</Text>
    </View>
  );
}

function FieldRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <View style={styles.fieldFull}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={mono ? [styles.fieldValue, styles.mono] : styles.fieldValue}>
        {mono ? wrapHash(valueOrPending(value), 24) : valueOrPending(value)}
      </Text>
    </View>
  );
}

function HashField({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.hashBox}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, styles.mono]}>{wrapHash(value)}</Text>
    </View>
  );
}

function EventSection({ event }: { event: EvidenceReceiptPdfProps["event"] }) {
  return (
    <View style={styles.section}>
      <SectionTitle title="Datos del evento" />
      <View style={styles.grid}>
        <Field label="ID del evento" value={event.id} mono full />
        <Field label="Tipo" value={event.eventType} />
        <Field label="Acción" value={event.actionName} />
        <Field label="Decisión" value={formatDecisionLabel(event.decision)} />
        <Field label="Riesgo" value={formatRiskLabel(event.riskLevel)} />
        <Field label="Fuente" value={event.source} />
        <Field label="Servicio" value={event.serviceName} />
        <Field label="Proveedor" value={event.serviceProvider} />
        <Field label="Actor / bot / agente" value={event.actorLabel} />
        <Field label="Fecha del evento" value={formatEvidenceDate(event.createdAt)} />
      </View>
    </View>
  );
}

function ContextSection({
  organization,
  project,
}: {
  organization: EvidenceReceiptPdfProps["organization"];
  project: EvidenceReceiptPdfProps["project"];
}) {
  return (
    <View style={styles.section}>
      <SectionTitle title="Organización y proyecto" />
      <View>
        <FieldRow label="Organización" value={organization.name} />
        <FieldRow label="ID de organización" value={organization.id} mono />
        <FieldRow label="Proyecto" value={project.name} />
        <FieldRow label="ID de proyecto" value={project.id} mono />
        <FieldRow label="Ambiente" value={project.environment} />
      </View>
    </View>
  );
}

function CryptoSection({
  evidence,
  verification,
}: {
  evidence: EvidenceReceiptPdfProps["evidence"];
  verification: EvidenceReceiptPdfProps["verification"];
}) {
  return (
    <View style={styles.section}>
      <SectionTitle title="Pruebas criptográficas" />
      <HashField label="Hash del evento" value={evidence.eventHash} />
      <HashField label="Hash raíz / Merkle Root" value={evidence.merkleRoot} />
      <View style={styles.grid}>
        <Field label="Batch ID" value={evidence.batchId} mono />
        <Field label="Posición en batch" value={evidence.batchPosition} />
        <Field label="Estado" value={evidence.verified ? "Verificado" : "Pendiente"} />
        <Field label="Verificado el" value={formatEvidenceDate(evidence.verifiedAt)} />
      </View>
      {verification.publicVerificationUrl ? (
        <Link src={verification.publicVerificationUrl} style={styles.link}>
          {verification.publicVerificationUrl}
        </Link>
      ) : null}
    </View>
  );
}

function StellarSection({ evidence }: { evidence: EvidenceReceiptPdfProps["evidence"] }) {
  return (
    <View style={styles.section}>
      <SectionTitle title="Anclaje en Stellar" />
      <View>
        <FieldRow label="Red" value={evidence.stellarNetwork ?? "testnet"} />
        <FieldRow label="Ledger" value={evidence.ledger} />
        <FieldRow label="Fecha de anclaje" value={formatEvidenceDate(evidence.anchoredAt)} />
        <FieldRow label="Datos sensibles on-chain" value={evidence.sensitiveDataStoredOnChain ? "Sí" : "No"} />
      </View>
      <HashField label="Transaction hash" value={evidence.stellarTxHash} />
      {evidence.explorerUrl ? (
        <Link src={evidence.explorerUrl} style={styles.link}>
          {wrapHash(evidence.explorerUrl, 36)}
        </Link>
      ) : null}
    </View>
  );
}

function PrivacyNotice() {
  return (
    <View style={styles.privacy}>
      <Text style={styles.privacyTitle}>Privacidad del comprobante</Text>
      <Text style={styles.privacyText}>
        No se incluyen prompts, respuestas completas, API keys ni datos sensibles en este comprobante. La blockchain solo contiene evidencia criptográfica, no el contenido privado de la solicitud.
      </Text>
    </View>
  );
}

function Footer({ logoSrc }: { logoSrc?: string | null }) {
  return (
    <View style={styles.footer} fixed>
      {logoSrc ? <Image src={logoSrc} style={styles.footerBrand} /> : <Text style={styles.footerBrandFallback}>OBERYN</Text>}
      <Text style={styles.footerText}>Integridad, trazabilidad e inmutabilidad del evento registrado.</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function EvidenceReceiptPdf({
  generatedAt,
  logoSrc,
  organization,
  project,
  event,
  evidence,
  verification,
}: EvidenceReceiptPdfProps) {
  return (
    <Document title="Comprobante de evidencia verificable - Oberyn" author="Oberyn" creator="Oberyn">
      <Page size="A4" style={styles.page}>
        <Header generatedAt={generatedAt} logoSrc={logoSrc} />
        <StatusBanner verified={evidence.verified} statusLabel={verification.statusLabel} integrityMessage={verification.integrityMessage} />
        <View style={styles.badges}>
          <Badge label="Decisión" value={formatDecisionLabel(event.decision)} tone={decisionColor(event.decision)} />
          <Badge label="Riesgo" value={formatRiskLabel(event.riskLevel)} tone={riskColor(event.riskLevel)} />
          <Badge label="Red" value={evidence.stellarNetwork ?? "testnet"} tone={{ bg: colors.panel, text: colors.slate }} />
        </View>
        <View style={styles.row}>
          <View style={styles.mainColumn}>
            <EventSection event={event} />
            <CryptoSection evidence={evidence} verification={verification} />
          </View>
          <View style={styles.sideColumn}>
            <ContextSection organization={organization} project={project} />
            <StellarSection evidence={evidence} />
            <PrivacyNotice />
          </View>
        </View>
        <Footer logoSrc={logoSrc} />
      </Page>
    </Document>
  );
}

export default EvidenceReceiptPdf;
