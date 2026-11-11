import { useState, FormEvent } from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import { LoginRole } from "../model/login.types";
import { API_BASE } from "../../../infrastructure/api/api";

const INTRO_SEEN_KEY = "parlisense_login_intro_seen";

export function useLoginViewModel() {
  const { members, login, telemetry } = useParliament();

  const [role, setRole] = useState<LoginRole>("speaker");
  const [usernameOrId, setUsernameOrId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      return localStorage.getItem(INTRO_SEEN_KEY) !== "true";
    } catch {
      return true;
    }
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const isSessionLive = !!telemetry?.is_active;

  const handleRoleChange = (newRole: LoginRole) => {
    setRole(newRole);
    setErrorMessage(null);
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const dismissIntro = () => {
    setShowIntro(false);
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "true");
    } catch {
      // Continue without persistence when browser storage is unavailable.
    }
  };

  const replayIntro = () => {
    setShowIntro(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: usernameOrId, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign in failed");
      if (result.user.role !== role) throw new Error("Select the role assigned to your account.");
      sessionStorage.setItem("parlisense_token", result.token);
      login(result.user.role, result.user.id, result.user.name);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    role,
    usernameOrId,
    fullName: usernameOrId, // alias for backwards compatibility
    username: usernameOrId, // alias for backwards compatibility
    password,
    showPassword,
    errorMessage,
    isSessionLive,
    showIntro,
    isAuthenticating,
    dismissIntro,
    replayIntro,
    setUsernameOrId,
    setFullName: setUsernameOrId, // alias for backwards compatibility
    setUsername: setUsernameOrId, // alias for backwards compatibility
    setPassword,
    handleRoleChange,
    togglePasswordVisibility,
    handleSubmit
  };
}

export type LoginViewModel = ReturnType<typeof useLoginViewModel>;
