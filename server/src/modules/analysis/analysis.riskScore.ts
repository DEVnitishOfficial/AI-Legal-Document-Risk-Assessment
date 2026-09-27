const RISK_SCORE_BY_LEVEL: Record<string, number> = {
    Low: 30,
    Medium: 60,
    High: 90,
};

// Deterministic, server-side risk score derivation — kept in its own tiny,
// dependency-free module (rather than living in analysis.controller.ts)
// so analysis.worker.ts can use it without pulling in the controller's own
// imports (which reach the BullMQ queue / Redis connection) just to get a
// pure lookup function.
export const riskScoreForLevel = (level: string): number => RISK_SCORE_BY_LEVEL[level] ?? 60;
