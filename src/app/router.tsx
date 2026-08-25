import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AppLayout } from "../components/layout/AppLayout";
import { AdminRoute } from "../components/route/AdminRoute";
import { ProtectedRoute } from "../components/route/ProtectedRoute";
import { routes } from "../config/routes";
import { PlaceholderPage } from "../pages/placeholder/PlaceholderPage";

const LoginPage = lazy(() => import("../pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const ResetPasswordPage = lazy(() =>
  import("../pages/auth/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage }))
);
const DashboardPage = lazy(() =>
  import("../pages/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const ClinicalEvaluationPage = lazy(() =>
  import("../pages/evaluations/ClinicalEvaluationPage").then((m) => ({ default: m.ClinicalEvaluationPage }))
);
const HistoryPage = lazy(() => import("../pages/history/HistoryPage").then((m) => ({ default: m.HistoryPage })));
const PatientHistoryPage = lazy(() =>
  import("../pages/history/PatientHistoryPage").then((m) => ({ default: m.PatientHistoryPage }))
);
const KnowledgeBasePage = lazy(() =>
  import("../pages/knowledge/KnowledgeBasePage").then((m) => ({ default: m.KnowledgeBasePage }))
);
const OwnerDetailPage = lazy(() =>
  import("../pages/owners/OwnerDetailPage").then((m) => ({ default: m.OwnerDetailPage }))
);
const OwnerFormPage = lazy(() =>
  import("../pages/owners/OwnerFormPage").then((m) => ({ default: m.OwnerFormPage }))
);
const OwnersPage = lazy(() => import("../pages/owners/OwnersPage").then((m) => ({ default: m.OwnersPage })));
const PatientDetailPage = lazy(() =>
  import("../pages/patients/PatientDetailPage").then((m) => ({ default: m.PatientDetailPage }))
);
const PatientFormPage = lazy(() =>
  import("../pages/patients/PatientFormPage").then((m) => ({ default: m.PatientFormPage }))
);
const PatientsPage = lazy(() =>
  import("../pages/patients/PatientsPage").then((m) => ({ default: m.PatientsPage }))
);
const ResultsPage = lazy(() => import("../pages/results/ResultsPage").then((m) => ({ default: m.ResultsPage })));
const RulesAdminPage = lazy(() =>
  import("../pages/rules/RulesAdminPage").then((m) => ({ default: m.RulesAdminPage }))
);
const SettingsPage = lazy(() =>
  import("../pages/settings/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={null}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: "/login",
        element: withSuspense(<LoginPage />),
      },
      {
        path: "/reset-password",
        element: withSuspense(<ResetPasswordPage />),
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: "/", element: withSuspense(<DashboardPage />) },
              { path: "owners", element: withSuspense(<OwnersPage />) },
              { path: "owners/new", element: withSuspense(<OwnerFormPage />) },
              { path: "owners/:ownerId/edit", element: withSuspense(<OwnerFormPage />) },
              { path: "owners/:ownerId", element: withSuspense(<OwnerDetailPage />) },
              { path: "patients", element: withSuspense(<PatientsPage />) },
              { path: "patients/new", element: withSuspense(<PatientFormPage />) },
              { path: "patients/:patientId", element: withSuspense(<PatientDetailPage />) },
              { path: "patients/:patientId/edit", element: withSuspense(<PatientFormPage />) },
              { path: "patients/:patientId/history", element: withSuspense(<PatientHistoryPage />) },
              { path: "evaluations", element: withSuspense(<ClinicalEvaluationPage />) },
              { path: "results", element: withSuspense(<ResultsPage />) },
              { path: "history", element: withSuspense(<HistoryPage />) },
              { path: "knowledge", element: withSuspense(<KnowledgeBasePage />) },
              {
                element: <AdminRoute />,
                children: [{ path: "rules", element: withSuspense(<RulesAdminPage />) }],
              },
              { path: "settings", element: withSuspense(<SettingsPage />) },
              ...routes
                .filter(
                  (route) =>
                    route.path !== "/" &&
                    route.path !== "/owners" &&
                    route.path !== "/patients" &&
                    route.path !== "/evaluations" &&
                    route.path !== "/results" &&
                    route.path !== "/history" &&
                    route.path !== "/knowledge" &&
                    route.path !== "/rules" &&
                    route.path !== "/settings"
                )
                .map((route) => ({
                  path: route.path.replace("/", ""),
                  element: <PlaceholderPage title={route.label} icon={route.icon} />,
                })),
            ],
          },
        ],
      },
    ],
  },
]);
