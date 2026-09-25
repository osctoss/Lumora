import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://intellisave:intellisave@localhost:5432/intellisave?schema=public';
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://intellisave:intellisave@localhost:5432/intellisave?schema=public'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DEFAULT_SIMULATION_SPEED: z.coerce.number().default(1),
  DEFAULT_TARIFF_INR_PER_KWH: z.coerce.number().default(8.0),
  DEFAULT_CO2_FACTOR_KG_PER_KWH: z.coerce.number().default(0.82),
});

export const env = envSchema.parse(process.env);
