import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { supabaseAdmin } from "../config/supabase.js";
import type { Integration } from "../types/integration.types.js";

const execFileAsync = promisify(execFile);

type DetectionFile = {
  name: string;
  content: string;
};

export type IntegrationFinding = {
  id: string;
  name: string;
  provider: string;
  serviceType: string;
  suggestedMethod: "sdk" | "gateway" | "manual" | "detected";
  confidence: number;
  evidence: string[];
  riskSignals: string[];
};

type ProviderRule = {
  name: string;
  provider: string;
  serviceType: string;
  suggestedMethod: IntegrationFinding["suggestedMethod"];
  packagePatterns: RegExp[];
  envPatterns: RegExp[];
  codePatterns: RegExp[];
  endpointPatterns: RegExp[];
  riskSignals: string[];
};

const MAX_REPO_FILES = 80;
const MAX_REPO_FILE_BYTES = 180_000;
const MAX_REPO_TOTAL_BYTES = 1_600_000;
const allowedRepoExtensions = new Set([
  ".env",
  ".example",
  ".json",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rb",
  ".go",
  ".java",
  ".kt",
  ".cs",
  ".php",
  ".yml",
  ".yaml",
  ".toml",
  ".xml",
  ".gradle",
  ".properties",
  ".txt",
]);
const allowedRepoFileNames = new Set([
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "requirements.txt",
  "pyproject.toml",
  "poetry.lock",
  "Pipfile",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  "go.mod",
  ".env.example",
  ".env.sample",
  ".env.local.example",
]);
const ignoredRepoSegments = new Set([".git", "node_modules", "dist", "build", ".next", "coverage", ".cache", "vendor", "__pycache__"]);

function toIntegration(row: Record<string, unknown>): Integration {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    provider: String(row.provider),
    serviceType: String(row.service_type),
    connectionMethod: String(row.connection_method),
    status: String(row.status),
    coverage: Number(row.coverage ?? 0),
    lastActivityAt: row.last_activity_at ? new Date(String(row.last_activity_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeRepositoryUrl(rawUrl: unknown) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;

  const value = rawUrl.trim();
  const shorthandMatch = value.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  const normalizedValue = shorthandMatch ? `https://github.com/${shorthandMatch[1]}/${shorthandMatch[2]}` : value;
  let url: URL;

  try {
    url = new URL(normalizedValue);
  } catch {
    throw new Error("La URL del repositorio no es valida.");
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error("Por seguridad, la detección por repositorio acepta URLs publicas de GitHub en HTTPS.");
  }

  const [owner, repo] = url.pathname.replace(/^\/|\/$/g, "").split("/");
  if (!owner || !repo || !/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
    throw new Error("Usa una URL con formato https://github.com/owner/repo.");
  }

  return {
    cloneUrl: `https://github.com/${owner}/${repo.replace(/\.git$/, "")}.git`,
    label: `${owner}/${repo.replace(/\.git$/, "")}`,
  };
}

async function findIntegration(projectId: string, provider: string, serviceType: string) {
  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("project_id", projectId)
    .eq("provider", provider)
    .eq("service_type", serviceType)
    .maybeSingle();

  if (error) throw error;
  return data ? toIntegration(data) : null;
}

const providerRules: ProviderRule[] = [
  {
    name: "OpenAI",
    provider: "openai",
    serviceType: "llm",
    suggestedMethod: "gateway",
    packagePatterns: [/"openai"\s*:/i, /@langchain\/openai/i],
    envPatterns: [/OPENAI_API_KEY/i, /AZURE_OPENAI_/i],
    codePatterns: [/from\s+["']openai["']/i, /new\s+OpenAI\s*\(/i, /chat\.completions/i, /responses\.create/i],
    endpointPatterns: [/api\.openai\.com/i],
    riskSignals: ["Modelo generativo", "Salida externa", "Prompt y datos sensibles"],
  },
  {
    name: "Anthropic",
    provider: "anthropic",
    serviceType: "llm",
    suggestedMethod: "gateway",
    packagePatterns: [/"@anthropic-ai\/sdk"\s*:/i, /@langchain\/anthropic/i],
    envPatterns: [/ANTHROPIC_API_KEY/i],
    codePatterns: [/from\s+["']@anthropic-ai\/sdk["']/i, /new\s+Anthropic\s*\(/i, /messages\.create/i],
    endpointPatterns: [/api\.anthropic\.com/i],
    riskSignals: ["Modelo generativo", "Salida externa", "Prompt y datos sensibles"],
  },
  {
    name: "DeepSeek",
    provider: "deepseek",
    serviceType: "llm",
    suggestedMethod: "sdk",
    packagePatterns: [/"deepseek"\s*:/i, /@langchain\/deepseek/i],
    envPatterns: [/DEEPSEEK_API_KEY/i, /DEEPSEEK_MODEL/i],
    codePatterns: [/api\.deepseek\.com/i, /deepseek-chat/i, /deepseek-reasoner/i, /provider:\s*["']deepseek["']/i],
    endpointPatterns: [/api\.deepseek\.com/i],
    riskSignals: ["Modelo generativo", "Prompt externo", "Riesgo de prompt injection"],
  },
  {
    name: "Supabase",
    provider: "supabase",
    serviceType: "database",
    suggestedMethod: "sdk",
    packagePatterns: [/"@supabase\/supabase-js"\s*:/i],
    envPatterns: [/SUPABASE_URL/i, /SUPABASE_ANON_KEY/i, /SUPABASE_SERVICE_ROLE_KEY/i],
    codePatterns: [/createClient\s*\([^)]*supabase/i, /from\s*\(["'][a-z0-9_]+["']\)/i],
    endpointPatterns: [/supabase\.co/i],
    riskSignals: ["Base de datos", "Datos de usuarios", "Operaciones persistentes"],
  },
  {
    name: "Stripe",
    provider: "stripe",
    serviceType: "payments",
    suggestedMethod: "sdk",
    packagePatterns: [/"stripe"\s*:/i],
    envPatterns: [/STRIPE_SECRET_KEY/i, /STRIPE_WEBHOOK_SECRET/i],
    codePatterns: [/new\s+Stripe\s*\(/i, /stripe\.(checkout|paymentIntents|customers)/i],
    endpointPatterns: [/api\.stripe\.com/i],
    riskSignals: ["Pagos", "Acciones irreversibles", "Datos financieros"],
  },
  {
    name: "Firebase",
    provider: "firebase",
    serviceType: "database",
    suggestedMethod: "sdk",
    packagePatterns: [/"firebase"\s*:/i, /"firebase-admin"\s*:/i],
    envPatterns: [/FIREBASE_/i, /GOOGLE_APPLICATION_CREDENTIALS/i],
    codePatterns: [/initializeApp\s*\(/i, /getFirestore\s*\(/i],
    endpointPatterns: [/firebaseio\.com/i, /firestore\.googleapis\.com/i],
    riskSignals: ["Base de datos", "Autenticación", "Datos de usuarios"],
  },
  {
    name: "AWS",
    provider: "aws",
    serviceType: "custom_api",
    suggestedMethod: "manual",
    packagePatterns: [/"aws-sdk"\s*:/i, /"@aws-sdk\//i],
    envPatterns: [/AWS_ACCESS_KEY_ID/i, /AWS_SECRET_ACCESS_KEY/i, /AWS_REGION/i],
    codePatterns: [/from\s+["']@aws-sdk\//i, /new\s+[A-Za-z]+Client\s*\(/i],
    endpointPatterns: [/amazonaws\.com/i],
    riskSignals: ["Infraestructura cloud", "Credenciales privilegiadas", "Servicios externos"],
  },
];

function normalizeFiles(rawFiles: unknown): DetectionFile[] {
  if (!Array.isArray(rawFiles)) return [];
  return rawFiles
    .map((file) => {
      const item = file as Partial<DetectionFile>;
      return {
        name: cleanText(item.name, "snippet.txt").slice(0, 180),
        content: cleanText(item.content, "").slice(0, 160_000),
      };
    })
    .filter((file) => file.content.length > 0);
}

function shouldScanRepoFile(filePath: string) {
  const segments = filePath.split(path.sep);
  if (segments.some((segment) => ignoredRepoSegments.has(segment))) return false;

  const baseName = path.basename(filePath);
  if (allowedRepoFileNames.has(baseName)) return true;
  if (baseName.startsWith(".env.")) return true;

  const extension = path.extname(baseName);
  return allowedRepoExtensions.has(extension);
}

async function collectRepoFiles(root: string, current = root, files: string[] = []) {
  if (files.length >= MAX_REPO_FILES) return files;

  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (files.length >= MAX_REPO_FILES) break;
    const fullPath = path.join(current, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredRepoSegments.has(entry.name)) await collectRepoFiles(root, fullPath, files);
      continue;
    }

    if (entry.isFile() && shouldScanRepoFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function readRepoFiles(repositoryUrl: unknown): Promise<{ files: DetectionFile[]; sourceLabel?: string }> {
  const repo = normalizeRepositoryUrl(repositoryUrl);
  if (!repo) return { files: [] };

  const tempDir = await mkdtemp(path.join(tmpdir(), "oberyn-repo-"));
  const cloneDir = path.join(tempDir, "repo");

  try {
    await execFileAsync("git", ["clone", "--depth", "1", "--filter=blob:none", repo.cloneUrl, cloneDir], { timeout: 45_000, maxBuffer: 1024 * 1024 });
    const repoFiles = await collectRepoFiles(cloneDir);
    const files: DetectionFile[] = [];
    let totalBytes = 0;

    for (const filePath of repoFiles) {
      if (totalBytes >= MAX_REPO_TOTAL_BYTES) break;
      const content = await readFile(filePath, "utf8").catch(() => "");
      if (!content) continue;

      const clippedContent = content.slice(0, MAX_REPO_FILE_BYTES);
      totalBytes += clippedContent.length;
      files.push({
        name: `${repo.label}/${path.relative(cloneDir, filePath).replace(/\\/g, "/")}`,
        content: clippedContent,
      });
    }

    return { files, sourceLabel: repo.label };
  } catch (error) {
    throw new Error(`No se pudo analizar el repositorio de GitHub. ${error instanceof Error ? error.message : ""}`.trim());
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function classifyFile(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes(".env")) return "env";
  if (lowerName.endsWith("package.json") || lowerName.includes("requirements") || lowerName.includes("pyproject") || lowerName.includes("pom.xml")) return "package";
  if (lowerName.includes("docker") || lowerName.endsWith(".yml") || lowerName.endsWith(".yaml") || lowerName.endsWith(".json")) return "config";
  return "code";
}

function hasMatch(patterns: RegExp[], content: string) {
  return patterns.some((pattern) => pattern.test(content));
}

function addEvidence(evidence: string[], fileName: string, label: string) {
  const item = `${fileName}: ${label}`;
  if (!evidence.includes(item)) evidence.push(item);
}

function detectFromFiles(files: DetectionFile[]): IntegrationFinding[] {
  const findings = new Map<string, IntegrationFinding>();

  for (const file of files) {
    const fileType = classifyFile(file.name);

    for (const rule of providerRules) {
      const key = `${rule.provider}:${rule.serviceType}`;
      const evidence: string[] = [];
      let score = 0;

      if (hasMatch(rule.envPatterns, file.content)) {
        score += 35;
        addEvidence(evidence, file.name, "variable de entorno detectada");
      }

      if (hasMatch(rule.packagePatterns, file.content)) {
        score += fileType === "package" ? 35 : 22;
        addEvidence(evidence, file.name, "dependencia detectada");
      }

      if (hasMatch(rule.codePatterns, file.content)) {
        score += fileType === "code" ? 25 : 18;
        addEvidence(evidence, file.name, "uso en código detectado");
      }

      if (hasMatch(rule.endpointPatterns, file.content)) {
        score += 20;
        addEvidence(evidence, file.name, "endpoint externo detectado");
      }

      if (score === 0) continue;

      const current = findings.get(key);
      if (current) {
        current.confidence = Math.min(0.99, current.confidence + score / 100);
        current.evidence = [...new Set([...current.evidence, ...evidence])].slice(0, 6);
      } else {
        findings.set(key, {
          id: key,
          name: rule.name,
          provider: rule.provider,
          serviceType: rule.serviceType,
          suggestedMethod: rule.suggestedMethod,
          confidence: Math.min(0.98, Math.max(0.52, score / 100)),
          evidence,
          riskSignals: rule.riskSignals,
        });
      }
    }
  }

  return [...findings.values()].sort((a, b) => b.confidence - a.confidence);
}

async function createDetectedIntegrations(projectId: string, findings: IntegrationFinding[]) {
  const results: Integration[] = [];

  for (const finding of findings) {
    const existing = await findIntegration(projectId, finding.provider, finding.serviceType);
    if (existing) {
      results.push(existing);
      continue;
    }

    results.push(
      await integrationsService.create(projectId, {
        name: finding.name,
        provider: finding.provider,
        serviceType: finding.serviceType,
        connectionMethod: finding.suggestedMethod === "manual" ? "manual" : "detected",
        status: "detected",
        coverage: Math.round(finding.confidence * 100),
      }),
    );
  }

  return results;
}

export const integrationsService = {
  list: async (projectId: string) => {
    const { data, error } = await supabaseAdmin.from("integrations").select("*").eq("project_id", projectId).order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toIntegration);
  },

  create: async (projectId: string, payload: Record<string, unknown>) => {
    const name = cleanText(payload.name, "Integración manual");
    const provider = cleanText(payload.provider, "custom");
    const serviceType = cleanText(payload.serviceType ?? payload.service_type, "custom_api");
    const connectionMethod = cleanText(payload.connectionMethod ?? payload.connection_method, "manual");
    const status = cleanText(payload.status, connectionMethod === "detected" ? "detected" : "manual");
    const coverage = typeof payload.coverage === "number" ? payload.coverage : 0;

    const { data, error } = await supabaseAdmin
      .from("integrations")
      .insert({
        project_id: projectId,
        name,
        provider,
        service_type: serviceType,
        connection_method: connectionMethod,
        status,
        coverage,
        last_activity_at: null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return toIntegration(data);
  },

  detect: async (projectId: string, payload: Record<string, unknown> = {}) => {
    const uploadedFiles = normalizeFiles(payload.files);
    const repoScan = await readRepoFiles(payload.repositoryUrl);
    const files = [...uploadedFiles, ...repoScan.files].slice(0, MAX_REPO_FILES);
    const selectedFindingIds = Array.isArray(payload.selectedFindingIds) ? payload.selectedFindingIds.map(String) : null;
    const commit = payload.commit !== false;
    const analyzedFindings = files.length > 0 ? detectFromFiles(files) : [];
    const findings = selectedFindingIds ? analyzedFindings.filter((finding) => selectedFindingIds.includes(finding.id)) : analyzedFindings;
    const integrations = commit ? await createDetectedIntegrations(projectId, findings) : [];

    return {
      findings: analyzedFindings,
      integrations,
      scannedFiles: files.map((file) => ({ name: file.name, type: classifyFile(file.name), bytes: file.content.length })),
      repository: repoScan.sourceLabel ? { source: repoScan.sourceLabel, scannedFiles: repoScan.files.length } : null,
    };
  },

  getById: async (projectId: string, integrationId: string) => {
    const { data, error } = await supabaseAdmin.from("integrations").select("*").eq("project_id", projectId).eq("id", integrationId).maybeSingle();
    if (error) throw error;
    return data ? toIntegration(data) : null;
  },

  update: async (projectId: string, integrationId: string, payload: Record<string, unknown>) => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof payload.name === "string") updates.name = payload.name.trim();
    if (typeof payload.provider === "string") updates.provider = payload.provider.trim();
    if (typeof payload.serviceType === "string") updates.service_type = payload.serviceType;
    if (typeof payload.connectionMethod === "string") updates.connection_method = payload.connectionMethod;
    if (typeof payload.status === "string") updates.status = payload.status;
    if (typeof payload.coverage === "number") updates.coverage = payload.coverage;

    const { data, error } = await supabaseAdmin.from("integrations").update(updates).eq("project_id", projectId).eq("id", integrationId).select("*").single();
    if (error) throw error;
    return toIntegration(data);
  },
};
