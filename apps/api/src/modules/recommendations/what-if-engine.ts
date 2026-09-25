import { roundTo } from '../../utils/math.js';

export interface WhatIfRequest {
  roomId: string;
  proposedTempSetPointC?: number;
  proposedVacancyDelaySec?: number;
  tariffRate?: number;
}

export interface WhatIfProjection {
  scenarioName: string;
  baselineAnnualKwh: number;
  projectedAnnualKwh: number;
  annualKwhSaved: number;
  annualCostSavedInr: number;
  annualCo2AvoidedKg: number;
  predictedComfortScore: number;
  paybackPeriodMonths: number;
}

export class WhatIfEngine {
  simulate(params: WhatIfRequest): WhatIfProjection {
    const tariff = params.tariffRate || 8.0;
    const currentBaselineKwh = 12500; // Average institutional classroom baseline

    let savingsFraction = 0.0;
    let predictedComfort = 95.0;

    if (params.proposedTempSetPointC !== undefined) {
      const delta = params.proposedTempSetPointC - 23.0;
      if (delta > 0) {
        savingsFraction += delta * 0.065; // ~6.5% savings per degree increase
      }
      if (params.proposedTempSetPointC > 26.0) {
        predictedComfort -= (params.proposedTempSetPointC - 26.0) * 15;
      }
    }

    if (params.proposedVacancyDelaySec !== undefined) {
      if (params.proposedVacancyDelaySec <= 120) {
        savingsFraction += 0.08; // 8% extra savings by shortening vacancy delay
      } else if (params.proposedVacancyDelaySec <= 180) {
        savingsFraction += 0.05;
      }
    }

    const annualSavedKwh = roundTo(currentBaselineKwh * savingsFraction, 1);
    const annualCostSavedInr = roundTo(annualSavedKwh * tariff, 2);
    const annualCo2AvoidedKg = roundTo(annualSavedKwh * 0.82, 1);

    return {
      scenarioName: 'Optimized Energy & Comfort Setpoints',
      baselineAnnualKwh: currentBaselineKwh,
      projectedAnnualKwh: roundTo(currentBaselineKwh - annualSavedKwh, 1),
      annualKwhSaved: annualSavedKwh,
      annualCostSavedInr: annualCostSavedInr,
      annualCo2AvoidedKg,
      predictedComfortScore: Math.max(70, roundTo(predictedComfort, 1)),
      paybackPeriodMonths: 0, // Software-only optimization, immediate ROI
    };
  }
}

export const whatIfEngine = new WhatIfEngine();
