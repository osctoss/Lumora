import { FastifyInstance } from 'fastify';
import { AUTOMATION_DEFAULTS } from '../config/defaults.js';

let settings = {
  tariffRateInrPerKwh: AUTOMATION_DEFAULTS.TARIFF_INR_PER_KWH,
  gridEmissionsFactorKgPerKwh: AUTOMATION_DEFAULTS.GRID_CO2_KG_PER_KWH,
  vacancyConfirmationTimeSec: AUTOMATION_DEFAULTS.VACANCY_CONFIRMATION_TIME_SEC,
  targetComfortTempC: 24.0,
  preCoolMinutes: AUTOMATION_DEFAULTS.PRE_COOL_MINUTES,
};

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/settings
  app.get('/', async () => {
    return { settings };
  });

  // PATCH /api/settings
  app.patch<{ Body: Partial<typeof settings> }>('/', async (request) => {
    settings = {
      ...settings,
      ...request.body,
    };
    return { success: true, settings };
  });
}
