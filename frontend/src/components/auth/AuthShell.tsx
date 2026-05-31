import type { ReactNode } from "react";
import { AuthBrandLogo } from "./AuthBrandLogo";
import { AuthFeatureList } from "./AuthFeatureList";
import { AuthFooter } from "./AuthFooter";
import { AuthNetworkGraphic } from "./AuthNetworkGraphic";

type AuthShellProps = {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ id, title, description, children }: AuthShellProps) {
  return (
    <main id={id} className="relative min-h-[100dvh] overflow-x-hidden bg-[#fbfcfd] text-[#0b0d13]">
      <AuthNetworkGraphic />
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1510px] grid-cols-1 gap-8 px-4 py-5 sm:px-8 lg:grid-cols-[minmax(320px,500px)_minmax(0,1fr)] lg:gap-10 lg:px-10 xl:grid-cols-[minmax(340px,540px)_minmax(0,1fr)] xl:px-16">
        <section className="relative flex min-w-0 flex-col">
          <AuthBrandLogo className="mb-8 lg:mb-auto" />
          <div className="pb-2 lg:pb-8">
            <div className="mb-7 lg:mb-8">
              <h1 className="text-[clamp(2rem,4vw,2.5rem)] font-extrabold leading-tight tracking-normal text-[#050505]">{title}</h1>
              <p className="mt-4 max-w-[390px] text-[clamp(1rem,2vw,1.375rem)] leading-8 text-[#263348]">{description}</p>
            </div>
            <AuthFeatureList />
          </div>
          <AuthFooter className="mt-auto hidden max-w-[540px] lg:flex" />
        </section>

        <section className="flex min-w-0 items-center justify-center py-2 lg:justify-end">
          {children}
        </section>
      </div>
    </main>
  );
}
