import { Show } from "@clerk/react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { appRoutes } from "./routes";

type ProtectedRouteProps = {
  children: ReactNode;
};

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!hasClerkKey) {
    return <>{children}</>;
  }

  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Navigate to={appRoutes.login} replace state={{ from: location }} />
      </Show>
    </>
  );
}
