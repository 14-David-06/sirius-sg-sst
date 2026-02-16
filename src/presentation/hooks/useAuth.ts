"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "cedula" | "password" | "create-password";

interface UseAuthReturn {
  // State
  step: Step;
  numeroDocumento: string;
  nombreCompleto: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isLoading: boolean;
  error: string;

  // Setters
  setNumeroDocumento: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  toggleShowPassword: () => void;
  toggleShowConfirmPassword: () => void;

  // Actions
  handleVerify: (e: React.FormEvent) => Promise<void>;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  handleRegister: (e: React.FormEvent) => Promise<void>;
  handleBack: () => void;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [step, setStep] = useState<Step>("cedula");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroDocumento }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      setNombreCompleto(data.nombreCompleto || "");
      setStep(data.needsPassword ? "create-password" : "password");
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroDocumento, password }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      // TODO: Guardar sesión/token
      router.push("/dashboard");
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroDocumento, password }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      // TODO: Guardar sesión/token
      router.push("/dashboard");
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setError("");
    if (step === "cedula") {
      router.push("/");
    } else {
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setStep("cedula");
    }
  };

  return {
    step,
    numeroDocumento,
    nombreCompleto,
    password,
    confirmPassword,
    showPassword,
    showConfirmPassword,
    isLoading,
    error,
    setNumeroDocumento,
    setPassword,
    setConfirmPassword,
    toggleShowPassword: () => setShowPassword(!showPassword),
    toggleShowConfirmPassword: () => setShowConfirmPassword(!showConfirmPassword),
    handleVerify,
    handleLogin,
    handleRegister,
    handleBack,
  };
}
