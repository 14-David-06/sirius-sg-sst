"use client";

import Image from "next/image";
import { useAuth } from "@/presentation/hooks/useAuth";

export default function LoginPage() {
  const {
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
    toggleShowPassword,
    toggleShowConfirmPassword,
    handleVerify,
    handleLogin,
    handleRegister,
    handleBack,
  } = useAuth();

  // --- Shared UI pieces ---

  const backButton = (
    <button
      type="button"
      onClick={handleBack}
      className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-6 cursor-pointer"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      Volver
    </button>
  );

  const logoSection = (
    <div className="flex justify-center mb-8">
      <Image src="/logo.png" alt="Sirius SG-SST" width={200} height={50} className="h-14 w-auto" priority />
    </div>
  );

  const errorMessage = error && (
    <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
      <svg className="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      {error}
    </div>
  );

  const spinner = (
    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  const passwordInput = (
    id: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    toggleShow: () => void,
    label: string,
    placeholder: string
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-white/80 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={id === "password" ? "current-password" : "new-password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full rounded-lg border border-white/20 bg-white/10 py-2.5 pl-10 pr-10 text-white placeholder:text-white/40 focus:border-sirius-cielo focus:ring-2 focus:ring-sirius-cielo/30 focus:outline-none transition-colors text-sm"
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white/70 cursor-pointer"
        >
          {show ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  // --- Step: Cédula ---
  if (step === "cedula") {
    return (
      <div className="w-full max-w-md px-4">
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl p-8 shadow-2xl shadow-black/20 border border-white/20">
          {backButton}
          {logoSection}

          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-white">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-white/60">
              Ingrese su número de cédula para continuar
            </p>
          </div>

          {errorMessage}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label htmlFor="numeroDocumento" className="block text-sm font-medium text-white/80 mb-1.5">
                Número de cédula
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                  </svg>
                </div>
                <input
                  id="numeroDocumento"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  required
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  placeholder="Ingrese su cédula"
                  className="block w-full rounded-lg border border-white/20 bg-white/10 py-2.5 pl-10 pr-4 text-white placeholder:text-white/40 focus:border-sirius-cielo focus:ring-2 focus:ring-sirius-cielo/30 focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg bg-sirius-azul px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sirius-azul/30 hover:bg-sirius-azul/90 focus:outline-none focus:ring-2 focus:ring-sirius-cielo focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isLoading ? spinner : "Continuar"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Sirius. Uso interno exclusivo.
        </p>
      </div>
    );
  }

  // --- Step: Password (existing) ---
  if (step === "password") {
    return (
      <div className="w-full max-w-md px-4">
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl p-8 shadow-2xl shadow-black/20 border border-white/20">
          {backButton}
          {logoSection}

          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-white">
              Bienvenido/a
            </h1>
            <p className="mt-1 text-sm font-medium text-sirius-cielo">
              {nombreCompleto}
            </p>
            <p className="mt-1 text-sm text-white/60">
              Ingrese su contraseña para acceder
            </p>
          </div>

          {errorMessage}

          <form onSubmit={handleLogin} className="space-y-5">
            {passwordInput(
              "password",
              password,
              setPassword,
              showPassword,
              toggleShowPassword,
              "Contraseña",
              "••••••••"
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg bg-sirius-azul px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sirius-azul/30 hover:bg-sirius-azul/90 focus:outline-none focus:ring-2 focus:ring-sirius-cielo focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isLoading ? spinner : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Sirius. Uso interno exclusivo.
        </p>
      </div>
    );
  }

  // --- Step: Create password (first time) ---
  return (
    <div className="w-full max-w-md px-4">
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl p-8 shadow-2xl shadow-black/20 border border-white/20">
        {backButton}
        {logoSection}

        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-white">
            Crear contraseña
          </h1>
          <p className="mt-1 text-sm font-medium text-sirius-cielo">
            {nombreCompleto}
          </p>
          <p className="mt-1 text-sm text-white/60">
            Es su primer ingreso. Cree una contraseña segura.
          </p>
        </div>

        {errorMessage}

        <form onSubmit={handleRegister} className="space-y-5">
          {passwordInput(
            "password",
            password,
            setPassword,
            showPassword,
            toggleShowPassword,
            "Nueva contraseña",
            "Mínimo 8 caracteres"
          )}

          {passwordInput(
            "confirmPassword",
            confirmPassword,
            setConfirmPassword,
            showConfirmPassword,
            toggleShowConfirmPassword,
            "Confirmar contraseña",
            "Repita su contraseña"
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-sirius-azul px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sirius-azul/30 hover:bg-sirius-azul/90 focus:outline-none focus:ring-2 focus:ring-sirius-cielo focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isLoading ? spinner : "Crear contraseña e ingresar"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-white/40">
        &copy; {new Date().getFullYear()} Sirius. Uso interno exclusivo.
      </p>
    </div>
  );
}
