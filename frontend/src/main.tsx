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
  console.warn("Missing VITE_CLERK_PUBLISHABLE_KEY. Running auth views without Clerk in local preview mode.");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {clerkPublishableKey ? <ClerkProvider publishableKey={clerkPublishableKey}>{app}</ClerkProvider> : app}
  </React.StrictMode>,
);
