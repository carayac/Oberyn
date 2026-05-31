type AuthFormMessageProps = {
  id: string;
  tone?: "error" | "info";
  children: string | null;
};

export function AuthFormMessage({ id, tone = "error", children }: AuthFormMessageProps) {
  if (!children) return null;

  return (
    <div
      id={id}
      className={tone === "error" ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
