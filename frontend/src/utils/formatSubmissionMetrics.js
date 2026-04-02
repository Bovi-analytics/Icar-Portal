/**
 * Formats submission.metrics from GET /submissions for display on cards.
 * Supports full object (preferred) or legacy single-number RMSE.
 */
export function formatSubmissionMetrics(metrics) {
  if (metrics == null || metrics === "") return "—";
  if (typeof metrics === "number") {
    if (Number.isNaN(metrics)) return "—";
    return `RMSE ${metrics.toFixed(2)} kg`;
  }
  if (typeof metrics === "object") {
    const rmse = metrics.root_mean_squared_error;
    const r = metrics.pearson_correlation;
    const parts = [];
    if (typeof rmse === "number" && !Number.isNaN(rmse)) {
      parts.push(`RMSE ${rmse.toFixed(2)} kg`);
    }
    if (typeof r === "number" && !Number.isNaN(r)) {
      parts.push(`r ${r.toFixed(3)}`);
    }
    return parts.length ? parts.join(" · ") : "—";
  }
  return "—";
}
