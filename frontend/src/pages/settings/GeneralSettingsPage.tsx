import { useUser } from "@clerk/react";
import { CalendarDays, Clock3, Globe2, RotateCcw, Save, UserCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

const SETTINGS_KEY = "oberyn.generalSettings";

type GeneralSettings = {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
};

const defaultSettings: GeneralSettings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Costa_Rica",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24 horas",
  language: "Español",
};

const timezoneOptions = [
  "America/Costa_Rica",
  "America/Guatemala",
  "America/Mexico_City",
  "America/Bogota",
  "America/New_York",
  "Europe/Madrid",
  "UTC",
];

const dateFormatOptions = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
const timeFormatOptions = ["24 horas", "12 horas"];
const languageOptions = ["Español", "English"];

function loadSettings(): GeneralSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    return defaultSettings;
  }
}

function formatTimezone(value: string) {
  const label = value.replace(/_/g, " ");
  if (value === "UTC") return "(UTC+00:00) UTC";

  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: value,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const offset = parts.find((part) => part.type === "timeZoneName")?.value.replace("GMT", "GMT") ?? "GMT";
    return `(${offset}) ${label}`;
  } catch {
    return label;
  }
}

function SummaryRow({ Icon, label, value }: { Icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 py-5 last:border-b-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">{label}</span>
      <span className="max-w-[220px] text-right text-sm font-semibold leading-6 text-slate-500">{value}</span>
    </div>
  );
}

export function GeneralSettingsPage() {
  const { user } = useUser();
  const [settings, setSettings] = useState<GeneralSettings>(() => loadSettings());
  const [message, setMessage] = useState<string | null>(null);

  const displayName = user?.fullName || user?.username || "Usuario";
  const email = user?.primaryEmailAddress?.emailAddress ?? "Sesión iniciada";
  const initials = useMemo(
    () =>
      displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "U",
    [displayName],
  );

  function handleChange(key: keyof GeneralSettings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setMessage("Configuración guardada.");
  }

  function resetSettings() {
    localStorage.removeItem(SETTINGS_KEY);
    setSettings(defaultSettings);
    setMessage("Configuración restablecida.");
  }

  return (
    <div className="min-h-[calc(100dvh-40px)] text-slate-950">
      <section className="flex min-h-[calc(100dvh-40px)] flex-col rounded-lg border border-slate-200 bg-white/70 p-7 shadow-soft 2xl:p-8">
        <header>
          <h1 className="text-[34px] font-bold leading-tight tracking-normal text-slate-950">Configuración general</h1>
          <p className="mt-3 max-w-4xl text-[15px] leading-6 text-slate-600">Define preferencias de perfil, visualización y horario.</p>
          <div className="mt-5 h-1 w-16 rounded-full bg-[#008f1f]" />
        </header>

        <div className="mt-8 grid flex-1 gap-7 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <Card className="p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xl font-bold text-[#008f1f]">
                  {initials}
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-slate-950">{displayName}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{email}</p>
                </div>
              </div>
            </Card>

            <label className="block" htmlFor="settings-timezone">
              <span className="mb-2 block text-sm font-bold text-slate-700">Zona horaria</span>
              <select
                id="settings-timezone"
                value={settings.timezone}
                onChange={(event) => handleChange("timezone", event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-[#008f1f] focus:ring-2 focus:ring-emerald-100"
              >
                {timezoneOptions.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {formatTimezone(timezone)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block" htmlFor="settings-date-format">
              <span className="mb-2 block text-sm font-bold text-slate-700">Formato de fecha</span>
              <select
                id="settings-date-format"
                value={settings.dateFormat}
                onChange={(event) => handleChange("dateFormat", event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-[#008f1f] focus:ring-2 focus:ring-emerald-100"
              >
                {dateFormatOptions.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </label>

            <label className="block" htmlFor="settings-time-format">
              <span className="mb-2 block text-sm font-bold text-slate-700">Formato de hora</span>
              <select
                id="settings-time-format"
                value={settings.timeFormat}
                onChange={(event) => handleChange("timeFormat", event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-[#008f1f] focus:ring-2 focus:ring-emerald-100"
              >
                {timeFormatOptions.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </label>

            <label className="block" htmlFor="settings-language">
              <span className="mb-2 block text-sm font-bold text-slate-700">Idioma</span>
              <select
                id="settings-language"
                value={settings.language}
                onChange={(event) => handleChange("language", event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-[#008f1f] focus:ring-2 focus:ring-emerald-100"
              >
                {languageOptions.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>

            {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p> : null}

            <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={resetSettings} className="h-12 min-w-[150px]">
                <RotateCcw className="mr-2 h-4 w-4" />
                Restablecer
              </Button>
              <Button type="submit" className="h-12 min-w-[180px]">
                <Save className="mr-2 h-4 w-4" />
                Guardar cambios
              </Button>
            </div>
          </form>

          <Card className="h-fit p-6">
            <h2 className="text-xl font-bold text-slate-950">Resumen</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Vista previa de tus preferencias actuales.</p>
            <div className="mt-7">
              <SummaryRow Icon={UserCircle} label="Perfil" value={displayName} />
              <SummaryRow Icon={Clock3} label="Zona horaria" value={formatTimezone(settings.timezone)} />
              <SummaryRow Icon={CalendarDays} label="Formato de fecha" value={settings.dateFormat} />
              <SummaryRow Icon={Clock3} label="Formato de hora" value={settings.timeFormat} />
              <SummaryRow Icon={Globe2} label="Idioma" value={settings.language} />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
