import type { Metadata } from "next";
import Image from "next/image";

import { leerCliente, SCOPE_ESCRIBIR } from "@/lib/mcp/oauth";
import { FormularioAutorizar, type Solicitud } from "./formulario";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conectar con Claude | Sirius SG-SST",
  description: "Autoriza a un asistente para consultar y registrar en SG-SST a tu nombre",
};

/** Los parámetros que `/api/oauth/authorize` pasa a esta pantalla. */
const PARAMETROS = [
  "client_id",
  "redirect_uri",
  "code_challenge",
  "code_challenge_method",
  "response_type",
  "state",
  "scope",
  "resource",
] as const;

/**
 * La pantalla donde una persona autoriza —o no— que Claude entre a SG-SST a
 * su nombre.
 *
 * No valida nada por su cuenta: a esta URL solo se llega desde
 * `/api/oauth/authorize`, que ya comprobó el cliente y el `redirect_uri`, y el
 * `POST` al que envía el formulario lo vuelve a comprobar todo. Aquí solo se lee
 * el nombre del cliente para decir de quién se habla, y se pide la contraseña.
 */
export default async function AutorizarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const solicitud = {} as Solicitud;
  for (const clave of PARAMETROS) {
    const valor = params[clave];
    if (typeof valor === "string") solicitud[clave] = valor;
  }

  if (!solicitud.client_id || !solicitud.redirect_uri) {
    return (
      <Tarjeta>
        <h1 className="text-xl font-semibold text-white">Solicitud incompleta</h1>
        <p className="mt-2 text-sm text-white/60">
          A esta pantalla se llega desde la aplicación que quiere conectarse. Si llegaste
          aquí de otra forma, vuelve a intentar la conexión desde Claude.
        </p>
      </Tarjeta>
    );
  }

  const cliente = leerCliente(solicitud.client_id);
  const nombreCliente = cliente?.nombre?.trim() || "Una aplicación";

  // Solo se ofrece conceder registro si el cliente lo pidió.
  const pedidos = (solicitud.scope ?? "").split(/\s+/).filter(Boolean);
  const ofrecerEscritura = pedidos.length === 0 || pedidos.includes(SCOPE_ESCRIBIR);

  let destino: string;
  try {
    destino = new URL(solicitud.redirect_uri).host;
  } catch {
    destino = solicitud.redirect_uri;
  }

  return (
    <Tarjeta>
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white">Conectar {nombreCliente} a SG-SST</h1>
        <p className="mt-2 text-sm text-white/60">
          Entra con tu documento y tu contraseña de SG-SST. El conector queda con{" "}
          <strong className="font-medium text-white/80">tu</strong> nivel de acceso: verá y
          hará lo mismo que tú puedes hacer en el sistema, ni más ni menos.
        </p>
      </div>

      <FormularioAutorizar
        solicitud={solicitud}
        nombreCliente={nombreCliente}
        destino={destino}
        ofrecerEscritura={ofrecerEscritura}
      />
    </Tarjeta>
  );
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md px-4 py-10">
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl p-8 shadow-2xl shadow-black/20 border border-white/20">
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="Sirius SG-SST" width={200} height={50} className="h-12 w-auto" priority />
        </div>
        {children}
      </div>
    </div>
  );
}
