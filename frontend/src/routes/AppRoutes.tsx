import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { AuthLayout } from "../components/layout/AuthLayout";
import { appRoutes } from "./routes";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { AccountSuccessPage } from "../pages/onboarding/AccountSuccessPage";
import { OrganizationPage } from "../pages/onboarding/OrganizationPage";
import { ProjectPage } from "../pages/onboarding/ProjectPage";
import { ConnectionPage } from "../pages/onboarding/ConnectionPage";
import { RulesPage } from "../pages/onboarding/RulesPage";
import { SummaryPage } from "../pages/onboarding/SummaryPage";
import { CompletedPage } from "../pages/onboarding/CompletedPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { OrganizationsPage } from "../pages/organizations/OrganizationsPage";
import { ProjectsPage } from "../pages/projects/ProjectsPage";
import { ProjectDetailPage } from "../pages/projects/ProjectDetailPage";
import { ProjectSettingsPage } from "../pages/projects/ProjectSettingsPage";
import { ProjectIntegrationsPage } from "../pages/projects/ProjectIntegrationsPage";
import { ProjectRulesPage } from "../pages/projects/ProjectRulesPage";
import { ProjectApprovalsPage } from "../pages/projects/ProjectApprovalsPage";
import { ProjectAuditPage } from "../pages/projects/ProjectAuditPage";
import { ProjectEvidencePage } from "../pages/projects/ProjectEvidencePage";
import { ProjectExceptionsPage } from "../pages/projects/ProjectExceptionsPage";
import { ProjectBotsPage } from "../pages/projects/ProjectBotsPage";
import { ProjectFlowsPage } from "../pages/projects/ProjectFlowsPage";
import { ProjectGatewayPage } from "../pages/projects/ProjectGatewayPage";
import { ProjectSDKPage } from "../pages/projects/ProjectSDKPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={appRoutes.dashboard} replace />} />
      <Route element={<AuthLayout />}>
        <Route path={appRoutes.login} element={<LoginPage />} />
        <Route path={appRoutes.register} element={<RegisterPage />} />
        <Route path={appRoutes.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={appRoutes.onboardingSuccess} element={<AccountSuccessPage />} />
      </Route>
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path={appRoutes.onboardingOrganization} element={<OrganizationPage />} />
        <Route path={appRoutes.onboardingProject} element={<ProjectPage />} />
        <Route path={appRoutes.onboardingConnection} element={<ConnectionPage />} />
        <Route path={appRoutes.onboardingRules} element={<RulesPage />} />
        <Route path={appRoutes.onboardingSummary} element={<SummaryPage />} />
        <Route path={appRoutes.onboardingCompleted} element={<CompletedPage />} />
        <Route path={appRoutes.dashboard} element={<DashboardPage />} />
        <Route path={appRoutes.organizations} element={<OrganizationsPage />} />
        <Route path={appRoutes.projects} element={<ProjectsPage />} />
        <Route path={appRoutes.projectDetail} element={<ProjectDetailPage />} />
        <Route path={appRoutes.projectSettings} element={<ProjectSettingsPage />} />
        <Route path={appRoutes.projectIntegrations} element={<ProjectIntegrationsPage />} />
        <Route path={appRoutes.projectRules} element={<ProjectRulesPage />} />
        <Route path={appRoutes.projectApprovals} element={<ProjectApprovalsPage />} />
        <Route path={appRoutes.projectAudit} element={<ProjectAuditPage />} />
        <Route path={appRoutes.projectEvidence} element={<ProjectEvidencePage />} />
        <Route path={appRoutes.projectExceptions} element={<ProjectExceptionsPage />} />
        <Route path={appRoutes.projectBots} element={<ProjectBotsPage />} />
        <Route path={appRoutes.projectFlows} element={<ProjectFlowsPage />} />
        <Route path={appRoutes.projectGateway} element={<ProjectGatewayPage />} />
        <Route path={appRoutes.projectSDK} element={<ProjectSDKPage />} />
      </Route>
    </Routes>
  );
}
