export const logger = {
  info: (message: string) => console.info(message),
  error: (message: string, error?: unknown) => console.error(message, error),
};

