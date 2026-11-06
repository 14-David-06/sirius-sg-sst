"use client";

import { useState } from "react";

export type Solicitud = {
  client_id: string;
  redirect_uri: string;
  code_challenge?: string;
  code_challenge_method?: string;
  response_type?: string;
  state?: string;
  scope?: string;
  resource?: string;
};

const claseCampo =
  "block w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-sirius-cielo focus:ring-2 focus:ring-sirius-cielo/30 focus:outline-none transition-colors disabled:opacity-60";

export function FormularioAutorizar({
  solicitud,
  nombreCliente,
  destino,
  ofrecerEscritura,
}: {
  solicitud: Solicitud;
  nombreCliente: string;
  destino: string;
  ofrecerEscritura: boolean;
}) {
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [password, setPassword] = useState("");
  // Desmarcado por defecto: registrar en SG-SST queda a la vista de todo el
  // equipo y de las auditorías, así que se concede a propósito, no por inercia.
  const [escribir, setEscribir] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function autorizar(evento: React.FormEvent) {
    evento.preventDefault();

    if (numeroDocumento.length < 4 || !password) {
      setError("Ingresa tu número de documento y tu contraseña.");
      return;
    }

    setCargando(true);
    setError(null);

    const respuesta = await fetch("/api/oauth/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...solicitud, numeroDocumento, password, escribir }),
    }).catch(() => null);

    const datos = (await respuesta?.json().catch(() => ({}))) as
      | { redirect?: string; error?: string }
      | undefined;

    if (!respuesta?.ok || !datos?.redirect) {
      setCargando(false);
      setError(datos?.error ?? "No pudimos autorizar la conexión.");
      return;
    }

    // El código vuelve al cliente por su propio redirect_uri; `cargando` se
    // queda puesto porque la navegación ya está en camino.
    window.location.href = datos.redirect;
  }

  return (
    <>
      <form onSubmit={autorizar} className="mt-6 space-y-5">
        <div>
          <label htmlFor="numeroDocumento" className="block text-sm font-medium text-white/80 mb-1.5">
            Número de documento
          </label>
          <input
            id="numeroDocumento"
            name="numeroDocumento"
            type="text"
            inputMode="numeric"
            autoComplete="username"
            autoFocus
            maxLength={15}
            placeholder="1234567890"
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value.replace(/[^A-Za-z0-9]/g, ""))}
            disabled={cargando}
            className={claseCampo}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={cargando}
            className={claseCampo}
          />
        </div>

        <div className="rounded-lg border border-white/15 bg-black/10 p-4 text-sm">
          <p className="font-medium text-white">Qué podrá hacer</p>
          <ul className="mt-2 space-y-1.5 text-white/70">
            <li>
              Consultar accidentes, inspecciones, EPP, capacitaciones, medicina laboral,
              comités e indicadores del informe mensual.
            </li>
            {escribir ? (
              <li>Registrar accidentes, reportes, acciones, inspecciones y entregas de EPP.</li>
            ) : null}
          </ul>

          {ofrecerEscritura ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={escribir}
                onChange={(e) => setEscribir(e.target.checked)}
                disabled={cargando}
                className="mt-0.5 accent-sirius-cielo"
              />
              <span className="text-white/70">
                Permitir que también registre en SG-SST, no solo que consulte.
              </span>
            </label>
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={cargando}
          className="flex w-full items-center justify-center rounded-lg bg-sirius-azul px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sirius-azul/30 hover:bg-sirius-azul/90 focus:outline-none focus:ring-2 focus:ring-sirius-cielo focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {cargando ? "Un momento…" : `Autorizar ${nombreCliente}`}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-white/40">
        Al autorizar, el código se envía a {destino}. Para cortar el acceso, quita el
        conector en Claude. Si necesitas cortarlo sin tocar Claude, pide que inactiven tu
        usuario o le quiten el acceso a SG-SST en Sirius Nómina Core: cambiar la contraseña
        no basta.
      </p>
    </>
  );
}
