import type { ReactNode } from "react";
import { AuthBrandLogo } from "./AuthBrandLogo";
import { AuthFooter } from "./AuthFooter";

type AuthSuccessShellProps = {
  id: string;
  children: ReactNode;
};

export function AuthSuccessShell({ id, children }: AuthSuccessShellProps) {
  return (
    <main id={id} className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#fbfcfd] px-5 py-6 text-[#0b0d13] sm:px-10 lg:px-16">
      <AuthBrandLogo className="mx-auto" markSize="sm" />
      <div className="flex flex-1 items-center justify-center py-6">{children}</div>
      <AuthFooter className="mt-auto shrink-0 pt-2" compact />
    </main>
  );
}
