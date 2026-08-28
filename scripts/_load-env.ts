// Cargar variables de entorno antes de importar configuraciones
import { config } from "dotenv";
import { join } from "path";

// Cargar .env.local que tiene las variables reales
config({ path: join(process.cwd(), ".env.local") });
