#!/usr/bin/env node

/**
 * MCP Server para Sirius Sistema de Gestión de Seguridad y Salud en el Trabajo
 *
 * Este servidor MCP expone todas las funcionalidades del sistema SGSST a través de herramientas
 * que pueden ser utilizadas por agentes de IA.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig, validateConfig, Logger } from "./config.js";
import { SessionInfo, ToolContext } from "./types.js";

// Importar todas las herramientas
import { authTools } from "./tools/auth.js";
import { personalTools } from "./tools/personal.js";
import { capacitacionesTools } from "./tools/capacitaciones.js";
import { inventarioInspeccionesTools } from "./tools/inventario-inspecciones.js";
import { modulosAvanzadosTools } from "./tools/modulos-avanzados.js";

/**
 * Clase principal del servidor MCP
 */
class SGSSTServer {
  private server: Server;
  private config: ReturnType<typeof loadConfig>;
  private logger: Logger;
  private session: SessionInfo;
  private tools: Map<string, any>;

  constructor() {
    // Cargar y validar configuración
    this.config = loadConfig();
    validateConfig(this.config);

    this.logger = new Logger(this.config.logLevel);

    // Inicializar sesión vacía
    this.session = {
      isAuthenticated: false,
    };

    // Crear servidor MCP
    this.server = new Server(
      {
        name: "sirius-sgsst",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Registrar todas las herramientas
    this.tools = new Map();
    this.registerTools();

    // Configurar handlers
    this.setupHandlers();

    this.logger.info("Servidor MCP SGSST inicializado");
  }

  /**
   * Registra todas las herramientas del MCP
   */
  private registerTools(): void {
    const allTools = [
      ...authTools,
      ...personalTools,
      ...capacitacionesTools,
      ...inventarioInspeccionesTools,
      ...modulosAvanzadosTools,
    ];

    allTools.forEach((tool) => {
      this.tools.set(tool.name, tool);
      this.logger.debug(`Herramienta registrada: ${tool.name}`);
    });

    this.logger.info(`Total de herramientas registradas: ${this.tools.size}`);
  }

  /**
   * Configura los handlers del servidor MCP
   */
  private setupHandlers(): void {
    // Handler para listar herramientas
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      return { tools };
    });

    // Handler para ejecutar herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      this.logger.info(`Ejecutando herramienta: ${name}`);
      this.logger.debug(`Argumentos:`, args);

      const tool = this.tools.get(name);

      if (!tool) {
        this.logger.error(`Herramienta no encontrada: ${name}`);
        return {
          content: [
            {
              type: "text",
              text: `❌ Error: Herramienta '${name}' no encontrada`,
            },
          ],
          isError: true,
        };
      }

      try {
        // Crear contexto para la herramienta
        const context: ToolContext = {
          config: this.config,
          session: this.session,
        };

        // Ejecutar la herramienta
        const result = await tool.handler(args || {}, context);

        this.logger.info(`Herramienta ${name} ejecutada exitosamente`);
        return result;
      } catch (error) {
        this.logger.error(`Error al ejecutar herramienta ${name}:`, error);

        return {
          content: [
            {
              type: "text",
              text: `❌ Error al ejecutar ${name}: ${
                error instanceof Error ? error.message : "Error desconocido"
              }`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Inicia el servidor MCP
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();

    this.logger.info("Iniciando servidor MCP SGSST...");
    this.logger.info(`API URL: ${this.config.apiUrl}`);

    if (this.config.nominaCoreUrl) {
      this.logger.info(`Nómina Core URL: ${this.config.nominaCoreUrl}`);
    } else {
      this.logger.warn("Nómina Core no configurada");
    }

    await this.server.connect(transport);

    this.logger.info("✅ Servidor MCP SGSST iniciado correctamente");
    this.logger.info(`📋 ${this.tools.size} herramientas disponibles`);
  }

  /**
   * Detiene el servidor MCP
   */
  async stop(): Promise<void> {
    this.logger.info("Deteniendo servidor MCP SGSST...");
    await this.server.close();
    this.logger.info("Servidor MCP SGSST detenido");
  }
}

/**
 * Punto de entrada principal
 */
async function main() {
  const server = new SGSSTServer();

  // Manejar señales de terminación
  process.on("SIGINT", async () => {
    await server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.stop();
    process.exit(0);
  });

  // Iniciar servidor
  await server.start();
}

main().catch((error) => {
  console.error("Error fatal al iniciar servidor MCP:", error);
  process.exit(1);
});
