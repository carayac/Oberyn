type ClerkErrorLike = {
  errors?: Array<{ longMessage?: string; message?: string }>;
  message?: string;
};

export function getClerkErrorMessage(error: unknown, fallback: string) {
  const clerkError = error as ClerkErrorLike;
  return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? clerkError.message ?? fallback;
}
