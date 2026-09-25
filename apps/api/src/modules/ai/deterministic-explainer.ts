export interface ExplanationResult {
  summary: string;
  rootCause: string;
  recommendedAction: string;
  financialImpact: string;
  source: 'DETERMINISTIC_EXPLAINER' | 'LLM';
}

export function generateDeterministicExplanation(
  alertType: string,
  details: Record<string, unknown> = {},
): ExplanationResult {
  switch (alertType) {
    case 'UNACCOUNTED_CONSUMPTION': {
      const watts = Number(details.unaccountedPowerW || 350);
      const hourlyCost = ((watts / 1000) * 8.0).toFixed(2);
      return {
        summary: `Unregistered load detected on smart submeter drawing ${watts}W without device telemetry attribution.`,
        rootCause: `Physical energy meter registers ${watts}W above the sum of all known active equipment. This typically indicates an unmonitored space heater, kettle, or unauthorized appliance.`,
        recommendedAction: `Inspect wall sockets on Floor 1, Room 101 or register the appliance in the device catalog to restore strict submeter accounting.`,
        financialImpact: `Estimated ongoing waste of ₹${hourlyCost}/hr (₹${(Number(hourlyCost) * 24).toFixed(0)}/day if unaddressed).`,
        source: 'DETERMINISTIC_EXPLAINER',
      };
    }

    case 'VACANCY_ENERGY_WASTE': {
      const wasteW = Number(details.wastePowerW || 1500);
      return {
        summary: `High energy draw persists in confirmed vacant space.`,
        rootCause: `PIR motion and mmWave micro-presence sensors have verified zero occupants for longer than the 300s confirmation delay, yet high-power cooling or lighting remains energized.`,
        recommendedAction: `Trigger autonomous shutoff policy or confirm vacancy override.`,
        financialImpact: `Approximately ₹${((wasteW / 1000) * 8).toFixed(2)}/hour in avoidable operational expenditure.`,
        source: 'DETERMINISTIC_EXPLAINER',
      };
    }

    case 'CO2_HIGH': {
      const co2 = Number(details.co2Ppm || 1600);
      return {
        summary: `CO₂ concentration reached ${co2} ppm, exceeding ASHRAE indoor air quality thresholds.`,
        rootCause: `High occupant density coupled with restricted fresh air ventilation causing rapid metabolic CO₂ accumulation.`,
        recommendedAction: `Engage fresh air damper ventilation or open classroom doorway to cycle indoor air volume.`,
        financialImpact: `Low direct energy cost, but high cognitive and comfort deficit (-45 points on comfort index).`,
        source: 'DETERMINISTIC_EXPLAINER',
      };
    }

    default:
      return {
        summary: `System operational event flagged by IntelliSave anomaly monitor.`,
        rootCause: `Telemetry values deviated from nominal operating envelope.`,
        recommendedAction: `Review room state and adjust automation setpoints if appropriate.`,
        financialImpact: `Minor baseline impact.`,
        source: 'DETERMINISTIC_EXPLAINER',
      };
  }
}
