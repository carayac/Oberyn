import type { ReactNode } from "react";
import { AuthBrandLogo } from "./AuthBrandLogo";
import { AuthFooter } from "./AuthFooter";

type AuthSuccessShellProps = {
  id: string;
  children: ReactNode;
};

export function AuthSuccessShell({ id, children }: AuthSuccessShellProps) {
  return (
    <main id={id} className="flex min-h-screen flex-col overflow-hidden bg-[#fbfcfd] px-10 py-8 text-[#0b0d13] lg:h-screen lg:px-16">
      <AuthBrandLogo className="mx-auto" markSize="sm" />
      <div className="flex flex-1 items-center justify-center py-6">{children}</div>
      <AuthFooter className="mt-auto" compact />
    </main>
  );
}
