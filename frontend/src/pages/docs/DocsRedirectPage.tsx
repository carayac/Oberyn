import { Navigate, useParams } from "react-router-dom";

export function DocsRedirectPage() {
  const { topic = "sdk" } = useParams();
  return <Navigate to={`/docs/${topic}`} replace />;
}
