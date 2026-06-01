import { Show } from "@clerk/react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { appRoutes } from "./routes";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Navigate to={appRoutes.login} replace state={{ from: location }} />
      </Show>
    </>
  );
}
