export const projectTypeLabels: Record<string, string> = {
  support: "Soporte",
  ecommerce: "E-commerce",
  finance: "Finanzas",
  operations: "Operaciones",
  crm: "CRM",
  internal_automation: "Automatización",
  custom: "Personalizado",
};

export const environmentLabels: Record<string, string> = {
  development: "Desarrollo",
  staging: "Pruebas",
  production: "Producción",
};

export const connectionModeLabels: Record<string, string> = {
  sdk: "SDK",
  gateway: "Gateway",
  manual: "Manual",
  mixed: "Mixto",
};

export const statusLabels: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  pending_setup: "Configuración",
  no_activity: "Sin actividad",
  paused: "Pausado",
  requires_configuration: "Requiere config.",
  archived: "Archivado",
};
