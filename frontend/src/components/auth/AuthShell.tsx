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
    <main id={id} className="relative min-h-screen overflow-x-hidden bg-[#fbfcfd] text-[#0b0d13] lg:h-screen lg:overflow-hidden">
      <AuthNetworkGraphic />
      <div className="mx-auto grid min-h-screen w-full max-w-[1510px] grid-cols-1 px-8 py-8 lg:h-screen lg:grid-cols-[520px_minmax(520px,1fr)] lg:gap-16 lg:px-16 lg:py-10 xl:grid-cols-[560px_minmax(520px,1fr)]">
        <section className="relative flex min-h-[660px] flex-col lg:min-h-0">
          <AuthBrandLogo className="mb-auto" />
          <div className="pb-10 lg:pb-0">
            <div className="mb-10">
              <h1 className="text-[40px] font-extrabold leading-tight tracking-normal text-[#050505]">{title}</h1>
              <p className="mt-5 max-w-[390px] text-[22px] leading-8 text-[#263348]">{description}</p>
            </div>
            <AuthFeatureList />
          </div>
          <AuthFooter className="mt-auto hidden max-w-[540px] lg:flex" />
        </section>

        <section className="flex items-center justify-center py-6 lg:justify-end lg:py-0">
          {children}
        </section>
      </div>
    </main>
  );
}
