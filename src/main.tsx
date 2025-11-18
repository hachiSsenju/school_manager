import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SessionServices } from "./services/sessionServices.ts";
import { AuthService } from "./services/authService.ts";
import { AuthForms } from "./auth/auth.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{AuthService.isLoggedIn() ? <App /> : <AuthForms />}</StrictMode>
);
