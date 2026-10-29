import { VitalSignsInput, TriageResult } from '../types';

export class TriageService {
  /**
   * Base urgency weights corresponding to standardized tiers
   * Higher weight indicates higher queue priority
   */
  public static readonly TIER_WEIGHTS: Record<number, number> = {
    1: 9999, // Immediate / Resuscitation (Emergency bypass)
    2: 120,  // Emergent / High urgency
    3: 70,   // Urgent / Moderate
    4: 35,   // Routine / Standard
    5: 10,   // Minor / Administrative
  };

  /**
   * Linear aging coefficient (points per minute waited)
   * alpha = 1.0 ensures that after 85 minutes, a Tier 4 patient (35 + 85 = 120)
   * matches and surpasses a newly arriving Tier 2 patient (120), preventing starvation.
   */
  public static readonly DEFAULT_AGING_RATE = 1.0;

  /**
   * Computes standardized urgency tier and explanation from vital signs.
   * Safety Note: This is an administrative triage prioritization model,
   * not an autonomous clinical diagnostic tool.
   */
  public evaluateVitals(vitals?: VitalSignsInput): TriageResult {
    if (!vitals) {
      return {
        tier: 4,
        explanation: 'No acute vitals recorded; assigned default standard routine tier (Tier 4).',
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[4],
      };
    }

    const {
      systolicBP,
      diastolicBP,
      heartRate,
      oxygenSaturation,
      temperatureCelsius,
      painScore = 0,
      respiratoryDistress = false,
      alteredMentalState = false,
    } = vitals;

    // --- Tier 1: Resuscitation / Immediate Emergency Check ---
    if (alteredMentalState && respiratoryDistress) {
      return {
        tier: 1,
        explanation: 'CRITICAL ALERT: Altered mental state coupled with acute respiratory distress. Immediate resuscitation required.',
        isEmergency: true,
        baseWeight: TriageService.TIER_WEIGHTS[1],
      };
    }

    if (oxygenSaturation !== undefined && oxygenSaturation < 85) {
      return {
        tier: 1,
        explanation: `CRITICAL ALERT: Severe hypoxia (SpO2 ${oxygenSaturation}% < 85%). Immediate emergency airway/oxygenation required.`,
        isEmergency: true,
        baseWeight: TriageService.TIER_WEIGHTS[1],
      };
    }

    // --- Tier 2: Emergent / High Urgency Check ---
    if (respiratoryDistress) {
      return {
        tier: 2,
        explanation: 'Emergent: Active respiratory distress observed without mental status impairment.',
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[2],
      };
    }

    if (oxygenSaturation !== undefined && oxygenSaturation < 92) {
      return {
        tier: 2,
        explanation: `Emergent: Significant desaturation (SpO2 ${oxygenSaturation}% < 92%).`,
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[2],
      };
    }

    if (painScore >= 9) {
      return {
        tier: 2,
        explanation: `Emergent: Severe, disabling pain reported (${painScore}/10).`,
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[2],
      };
    }

    if (systolicBP !== undefined && (systolicBP >= 180 || systolicBP <= 85)) {
      return {
        tier: 2,
        explanation: `Emergent: Critical hemodynamic blood pressure reading (${systolicBP} mmHg systolic).`,
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[2],
      };
    }

    if (heartRate !== undefined && (heartRate >= 135 || heartRate <= 45)) {
      return {
        tier: 2,
        explanation: `Emergent: Critical pulse arrhythmia / tachycardia / severe bradycardia (${heartRate} bpm).`,
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[2],
      };
    }

    // --- Tier 3: Urgent / Moderate Check ---
    if (painScore >= 6) {
      return {
        tier: 3,
        explanation: `Urgent: Moderate-to-severe pain reported (${painScore}/10).`,
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[3],
      };
    }

    if (temperatureCelsius !== undefined && temperatureCelsius >= 39.0) {
      return {
        tier: 3,
        explanation: `Urgent: High pyrexia/fever (${temperatureCelsius}°C >= 39.0°C).`,
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[3],
      };
    }

    if (heartRate !== undefined && (heartRate >= 110 || heartRate <= 55)) {
      return {
        tier: 3,
        explanation: `Urgent: Moderate tachycardia or bradycardia (${heartRate} bpm).`,
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[3],
      };
    }

    if (systolicBP !== undefined && (systolicBP >= 150 || systolicBP <= 95)) {
      return {
        tier: 3,
        explanation: `Urgent: Stage 2 hypertension or moderate hypotension (${systolicBP} mmHg systolic).`,
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[3],
      };
    }

    // --- Tier 5: Minor / Administrative Check ---
    if (painScore === 0 && (!temperatureCelsius || temperatureCelsius < 37.3) && !systolicBP) {
      return {
        tier: 5,
        explanation: 'Minor / Administrative: No reported pain or acute vitals. Routine refill/followup.',
        isEmergency: false,
        baseWeight: TriageService.TIER_WEIGHTS[5],
      };
    }

    // --- Tier 4: Standard / Routine Baseline ---
    return {
      tier: 4,
      explanation: 'Routine: Stable vital signs within acceptable ambulatory outpatient parameters.',
      isEmergency: false,
      baseWeight: TriageService.TIER_WEIGHTS[4],
    };
  }

  /**
   * Calculates the dynamic priority score combining base urgency weight and waiting duration.
   * PriorityScore = BaseWeight + (alpha * waitingMinutes)
   */
  public calculateDynamicPriorityScore(
    tier: number,
    checkInTime: Date,
    currentTime: Date = new Date(),
    agingRate: number = TriageService.DEFAULT_AGING_RATE
  ): number {
    const baseWeight = TriageService.TIER_WEIGHTS[tier] ?? TriageService.TIER_WEIGHTS[4];
    const diffMs = Math.max(0, currentTime.getTime() - checkInTime.getTime());
    const waitingMinutes = diffMs / (1000 * 60);

    return Number((baseWeight + agingRate * waitingMinutes).toFixed(2));
  }
}
