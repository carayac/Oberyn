import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

if (!clerkPublishableKey) {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <main className="flex min-h-dvh items-center justify-center bg-[#fbfcfd] px-6 text-slate-950">
        <section className="max-w-xl rounded-lg border border-red-200 bg-white p-8 shadow-soft">
          <h1 className="text-2xl font-bold">Falta configurar Clerk</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Oberyn requiere autenticación real. Define <code className="rounded bg-slate-100 px-1">VITE_CLERK_PUBLISHABLE_KEY</code> en el frontend para iniciar la app con autenticación real.
          </p>
        </section>
      </main>
    </React.StrictMode>,
  );
} else {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={clerkPublishableKey}>{app}</ClerkProvider>
    </React.StrictMode>,
  );
}
