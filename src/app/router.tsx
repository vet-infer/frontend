/* eslint-disable react-refresh/only-export-components -- this file only exports `router` (route config, not a component); the `lazy()` consts below are route-splitting definitions, not exported components, so Fast Refresh boundaries are unaffected */
import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AppLayout } from "../components/layout/AppLayout";
import { AdminRoute } from "../components/route/AdminRoute";
import { ProtectedRoute } from "../components/route/ProtectedRoute";
import { routes } from "../config/routes";

const LoginPage = lazy(() => import("../pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ClinicalEvaluationPage = lazy(() => import("../pages/evaluations/ClinicalEvaluationPage").then((m) => ({ default: m.ClinicalEvaluationPage })));
const HistoryPage = lazy(() => import("../pages/history/HistoryPage").then((m) => ({ default: m.HistoryPage })));
const PatientHistoryPage = lazy(() => import("../pages/history/PatientHistoryPage").then((m) => ({ default: m.PatientHistoryPage })));
const KnowledgeBasePage = lazy(() => import("../pages/knowledge/KnowledgeBasePage").then((m) => ({ default: m.KnowledgeBasePage })));
const OwnerDetailPage = lazy(() => import("../pages/owners/OwnerDetailPage").then((m) => ({ default: m.OwnerDetailPage })));
const OwnerFormPage = lazy(() => import("../pages/owners/OwnerFormPage").then((m) => ({ default: m.OwnerFormPage })));
const OwnersPage = lazy(() => import("../pages/owners/OwnersPage").then((m) => ({ default: m.OwnersPage })));
const PatientDetailPage = lazy(() => import("../pages/patients/PatientDetailPage").then((m) => ({ default: m.PatientDetailPage })));
const PatientFormPage = lazy(() => import("../pages/patients/PatientFormPage").then((m) => ({ default: m.PatientFormPage })));
const PatientsPage = lazy(() => import("../pages/patients/PatientsPage").then((m) => ({ default: m.PatientsPage })));
const PlaceholderPage = lazy(() => import("../pages/placeholder/PlaceholderPage").then((m) => ({ default: m.PlaceholderPage })));
const ResultsPage = lazy(() => import("../pages/results/ResultsPage").then((m) => ({ default: m.ResultsPage })));
const RulesAdminPage = lazy(() => import("../pages/rules/RulesAdminPage").then((m) => ({ default: m.RulesAdminPage })));
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/reset-password",
        element: <ResetPasswordPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: "/", element: <DashboardPage /> },
              { path: "owners", element: <OwnersPage /> },
              { path: "owners/new", element: <OwnerFormPage /> },
              { path: "owners/:ownerId/edit", element: <OwnerFormPage /> },
              { path: "owners/:ownerId", element: <OwnerDetailPage /> },
              { path: "patients", element: <PatientsPage /> },
              { path: "patients/new", element: <PatientFormPage /> },
              { path: "patients/:patientId", element: <PatientDetailPage /> },
              { path: "patients/:patientId/edit", element: <PatientFormPage /> },
              { path: "patients/:patientId/history", element: <PatientHistoryPage /> },
              { path: "evaluations", element: <ClinicalEvaluationPage /> },
              { path: "results", element: <ResultsPage /> },
              { path: "history", element: <HistoryPage /> },
              { path: "knowledge", element: <KnowledgeBasePage /> },
              {
                element: <AdminRoute />,
                children: [{ path: "rules", element: <RulesAdminPage /> }],
              },
              { path: "settings", element: <SettingsPage /> },
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
