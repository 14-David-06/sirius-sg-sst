/**
 * Script de prueba para validar todas las herramientas del MCP SGSST
 */

import { loadConfig } from "../src/config.js";
import { HttpClient } from "../src/utils/http-client.js";
import { SessionInfo } from "../src/types.js";

// Colores para la consola
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(60));
  log(title, "cyan");
  console.log("=".repeat(60));
}

function logTest(name: string, passed: boolean) {
  const symbol = passed ? "✓" : "✗";
  const color = passed ? "green" : "red";
  log(`${symbol} ${name}`, color);
}

/**
 * Clase de pruebas
 */
class TestRunner {
  private config = loadConfig();
  private session: SessionInfo = { isAuthenticated: false };
  private testsPassed = 0;
  private testsFailed = 0;

  async run(): Promise<void> {
    logSection("🧪 PRUEBAS MCP SGSST");

    try {
      await this.testConnection();
      await this.testAuthentication();
      await this.testPersonal();
      await this.testCapacitaciones();
      await this.testInventarioEPP();
      await this.testInspecciones();
      await this.testMedicinaLaboral();
      await this.testAccidentes();
      await this.testPoliticas();
      await this.testInformes();

      this.printSummary();
    } catch (error) {
      log(`\n❌ Error fatal: ${error}`, "red");
      process.exit(1);
    }
  }

  private async testConnection(): Promise<void> {
    logSection("🔌 Prueba de Conexión");

    try {
      const client = new HttpClient(this.config, this.session);
      const response = await client.get("/api/capacitaciones");

      const passed = response !== null;
      logTest("Conexión con servidor SGSST", passed);

      if (passed) this.testsPassed++;
      else this.testsFailed++;
    } catch (error) {
      logTest("Conexión con servidor SGSST", false);
      this.testsFailed++;
      throw new Error(`No se pudo conectar con ${this.config.apiUrl}`);
    }
  }

  private async testAuthentication(): Promise<void> {
    logSection("🔐 Prueba de Autenticación");

    const email = process.env.SGSST_DEFAULT_USER_EMAIL;
    const password = process.env.SGSST_DEFAULT_USER_PASSWORD;

    if (!email || !password) {
      log("⚠️ Saltando pruebas de autenticación (credenciales no configuradas)", "yellow");
      return;
    }

    try {
      const client = new HttpClient(this.config, this.session);

      // Verificar usuario
      const verifyResponse = await client.post("/api/auth/verify", { email });
      logTest("Verificar usuario", verifyResponse.success);
      if (verifyResponse.success) this.testsPassed++;
      else this.testsFailed++;

      // Iniciar sesión
      const loginResponse = await client.post("/api/auth/login", { email, password });
      logTest("Iniciar sesión", loginResponse.success);

      if (loginResponse.success && loginResponse.data) {
        this.testsPassed++;
        this.session = {
          isAuthenticated: true,
          token: (loginResponse.data as any).token,
          user: (loginResponse.data as any).user,
        };
        log(`  Usuario: ${this.session.user?.nombreCompleto}`, "blue");
      } else {
        this.testsFailed++;
      }
    } catch (error) {
      logTest("Autenticación", false);
      this.testsFailed++;
    }
  }

  private async testPersonal(): Promise<void> {
    logSection("👥 Prueba de Personal");

    if (!this.session.isAuthenticated) {
      log("⚠️ Saltando (no autenticado)", "yellow");
      return;
    }

    try {
      const client = new HttpClient(this.config, this.session);

      // Listar personal
      const response = await client.get("/api/personal?limit=5");
      logTest("Listar personal", response.success);

      if (response.success) {
        this.testsPassed++;
        const personal = response.data as any[];
        log(`  Encontrados: ${personal?.length || 0} empleados`, "blue");
      } else {
        this.testsFailed++;
      }
    } catch (error) {
      logTest("Personal", false);
      this.testsFailed++;
    }
  }

  private async testCapacitaciones(): Promise<void> {
    logSection("📚 Prueba de Capacitaciones");

    if (!this.session.isAuthenticated) {
      log("⚠️ Saltando (no autenticado)", "yellow");
      return;
    }

    try {
      const client = new HttpClient(this.config, this.session);

      const response = await client.get("/api/capacitaciones");
      logTest("Listar capacitaciones", response.success);

      if (response.success) {
        this.testsPassed++;
        const caps = response.data as any[];
        log(`  Encontradas: ${caps?.length || 0} capacitaciones`, "blue");
      } else {
        this.testsFailed++;
      }
    } catch (error) {
      logTest("Capacitaciones", false);
      this.testsFailed++;
    }
  }

  private async testInventarioEPP(): Promise<void> {
    logSection("🦺 Prueba de Inventario EPP");

    if (!this.session.isAuthenticated) {
      log("⚠️ Saltando (no autenticado)", "yellow");
      return;
    }

    try {
      const client = new HttpClient(this.config, this.session);

      const response = await client.get("/api/insumos/epp");
      logTest("Listar inventario EPP", response.success);

      if (response.success) {
        this.testsPassed++;
        const items = response.data as any[];
        log(`  Items: ${items?.length || 0}`, "blue");
      } else {
        this.testsFailed++;
      }
    } catch (error) {
      logTest("Inventario EPP", false);
      this.testsFailed++;
    }
  }

  private async testInspecciones(): Promise<void> {
    logSection("🔍 Prueba de Inspecciones");

    if (!this.session.isAuthenticated) {
      log("⚠️ Saltando (no autenticado)", "yellow");
      return;
    }

    try {
      const client = new HttpClient(this.config, this.session);

      const tipos = ["epp", "areas", "equipos"];

      for (const tipo of tipos) {
        const response = await client.get(`/api/inspecciones-${tipo}`);
        logTest(`Listar inspecciones ${tipo.toUpperCase()}`, response.success);

        if (response.success) this.testsPassed++;
        else this.testsFailed++;
      }
    } catch (error) {
      logTest("Inspecciones", false);
      this.testsFailed++;
    }
  }

  private async testMedicinaLaboral(): Promise<void> {
    logSection("🏥 Prueba de Medicina Laboral");

    if (!this.session.isAuthenticated) {
      log("⚠️ Saltando (no autenticado)", "yellow");
      return;
    }

    try {
      const client = new HttpClient(this.config, this.session);

      const response = await client.get("/api/medicina-laboral/examenes");
      logTest("Listar exámenes ocupacionales", response.success);

      if (response.success) this.testsPassed++;
      else this.testsFailed++;
    } catch (error) {
      logTest("Medicina Laboral", false);
      this.testsFailed++;
    }
  }

  private async testAccidentes(): Promise<void> {
    logSection("⚠️ Prueba de Accidentes");

    if (!this.session.isAuthenticated) {
      log("⚠️ Saltando (no autenticado)", "yellow");
      return;
    }

    try {
      const client = new HttpClient(this.config, this.session);

      const response = await client.get("/api/accidentes/eventos");
      logTest("Listar accidentes e incidentes", response.success);

      if (response.success) this.testsPassed++;
      else this.testsFailed++;
    } catch (error) {
      logTest("Accidentes", false);
      this.testsFailed++;
    }
  }

  private async testPoliticas(): Promise<void> {
    logSection("📄 Prueba de Políticas");

    if (!this.session.isAuthenticated) {
      log("⚠️ Saltando (no autenticado)", "yellow");
      return;
    }

    try {
      const client = new HttpClient(this.config, this.session);

      const response = await client.get("/api/politicas");
      logTest("Listar políticas", response.success);

      if (response.success) this.testsPassed++;
      else this.testsFailed++;
    } catch (error) {
      logTest("Políticas", false);
      this.testsFailed++;
    }
  }

  private async testInformes(): Promise<void> {
    logSection("📊 Prueba de Informes");

    if (!this.session.isAuthenticated) {
      log("⚠️ Saltando (no autenticado)", "yellow");
      return;
    }

    try {
      const client = new HttpClient(this.config, this.session);

      const response = await client.get("/api/informes/mensual");
      logTest("Obtener informe mensual", response.success);

      if (response.success) this.testsPassed++;
      else this.testsFailed++;
    } catch (error) {
      logTest("Informes", false);
      this.testsFailed++;
    }
  }

  private printSummary(): void {
    logSection("📋 Resumen de Pruebas");

    const total = this.testsPassed + this.testsFailed;
    const percentage = total > 0 ? ((this.testsPassed / total) * 100).toFixed(1) : "0";

    log(`Total de pruebas: ${total}`, "blue");
    log(`Pasadas: ${this.testsPassed}`, "green");
    log(`Fallidas: ${this.testsFailed}`, "red");
    log(`Porcentaje de éxito: ${percentage}%`, "cyan");

    if (this.testsFailed === 0) {
      log("\n✅ ¡Todas las pruebas pasaron!", "green");
    } else {
      log("\n⚠️ Algunas pruebas fallaron", "yellow");
    }
  }
}

// Ejecutar pruebas
async function main() {
  const runner = new TestRunner();
  await runner.run();
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
