import { config } from '../config';
import { MLPredictionPayload, MLPredictionResponse } from '../types';

export class MLService {
  /**
   * Calls the Python FastAPI ML inference service with strict timeout and fallback
   */
  public async predictWaitTime(
    payload: MLPredictionPayload,
    departmentAvgMinutes = 15
  ): Promise<MLPredictionResponse> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.mlServiceTimeoutMs);

      const response = await fetch(`${config.mlServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`ML service responded with HTTP status ${response.status}`);
      }

      const data = (await response.json()) as any;
      const latencyMs = Date.now() - startTime;

      return {
        predicted_wait_minutes: Math.max(2, Math.round(data.predicted_wait_minutes)),
        confidence_interval: data.confidence_interval || [
          Math.max(0, data.predicted_wait_minutes - 5),
          data.predicted_wait_minutes + 8,
        ],
        model_version: data.model_version || 'v1.0.0',
        model_name: data.model_name || 'RandomForestRegressor',
        source: 'ML_MODEL',
        latency_ms: latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.warn(
        `⚠️ ML Service unavailable (${(error as Error).message}). Engaging deterministic fallback rule.`
      );

      // Fallback calculation: patients_ahead * avg_department_duration * urgency_multiplier
      const urgencyMultiplier: Record<number, number> = {
        1: 0.1,
        2: 0.5,
        3: 0.8,
        4: 1.0,
        5: 1.2,
      };

      const mult = urgencyMultiplier[payload.urgency_tier] ?? 1.0;
      const estimated = Math.max(
        3,
        Math.round(payload.patients_ahead * departmentAvgMinutes * mult)
      );

      return {
        predicted_wait_minutes: estimated,
        confidence_interval: [Math.max(0, estimated - 5), estimated + 8],
        model_version: 'deterministic-heuristic-v1',
        model_name: 'RuleBasedDepartmentMultiplier',
        source: 'FALLBACK_RULE',
        latency_ms: latencyMs,
      };
    }
  }
}
