// Shared severity chip colors (tokens defined in App.css) so the report panel
// and the Documents grid always agree on what "High" looks like.
export const RISK_LEVEL_BADGE: Record<string, string> = {
  High: "bg-risk-high-bg text-risk-high-fg dark:bg-risk-high-bg-dark dark:text-risk-high-fg-dark",
  Medium: "bg-risk-med-bg text-risk-med-fg dark:bg-risk-med-bg-dark dark:text-risk-med-fg-dark",
  Low: "bg-risk-low-bg text-risk-low-fg dark:bg-risk-low-bg-dark dark:text-risk-low-fg-dark",
};
