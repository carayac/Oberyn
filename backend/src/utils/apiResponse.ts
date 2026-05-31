export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return { success: true, data, meta };
}

export function created<T>(data: T) {
  return { success: true, data };
}

