const weights = { Low: 0.25, Medium: 0.5, High: 0.75, Critical: 1 } as const;
export function calculateRisk(severity: keyof typeof weights, criticality: keyof typeof weights, reportCount: number, confidence = 1) {
  const countFactor = Math.min(1, reportCount / 3);
  const score = Math.round(100 * (0.4 * weights[severity] + 0.3 * weights[criticality] + 0.2 * confidence + 0.1 * countFactor) * 100) / 100;
  return { score, severityWeight: weights[severity], criticalityWeight: weights[criticality], matchConfidence: confidence, intelligenceCountFactor: countFactor, level: score >= 75 ? "Critical" : score >= 50 ? "High" : score >= 25 ? "Medium" : "Low" };
}
