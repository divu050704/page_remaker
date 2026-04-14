import { Empty } from "./UI";

function Card({ title, children, accent }) {
  const accents = {
    red:   "border-l-red-400",
    amber: "border-l-amber-400",
    green: "border-l-emerald-400",
    gray:  "border-l-gray-200",
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${accents[accent] || accents.gray} p-5`}>
      {title && (
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-3.5">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function StatusDot({ status }) {
  if (status === "pass")
    return <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />;
  if (status === "fail")
    return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 mt-1.5" />;
  return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />;
}

function SeverityBadge({ level }) {
  const styles = {
    high:   "bg-red-50 text-red-700",
    medium: "bg-amber-50 text-amber-700",
    low:    "bg-green-50 text-green-700",
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 capitalize ${styles[level] || styles.low}`}>
      {level || "low"}
    </span>
  );
}

function ScoreMeter({ label, score, maxScore = 20 }) {
  const pct = Math.min(100, (score / maxScore) * 100);
  const color = pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  const textColor = pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0 capitalize">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-5 text-right ${textColor}`}>{score}</span>
    </div>
  );
}

export default function ValidationView({ validation, retries }) {
  if (!validation) return <Empty text="Run the pipeline to see validation results." />;

  const v = validation;

  // Detect if this is the new semantic_validation shape
  const isSemanticShape = !!(v.checks || v.cro_score_after || v.summary || v.failed_checks);
  // Detect structural_validation presence (passed in as a separate prop or embedded)
  const structuralChecks = v.structural_checks || null;

  if (isSemanticShape) {
    return <SemanticValidationView v={v} retries={retries} structuralChecks={structuralChecks} />;
  }

  // Legacy shape
  return <LegacyValidationView v={v} retries={retries} />;
}

// ─── New semantic validation view ──────────────────────────────────────────
function SemanticValidationView({ v, retries, structuralChecks }) {
  const totalBefore = v.cro_score_before?.total;
  const totalAfter  = v.cro_score_after?.total;
  const delta       = v.score_delta?.total;

  const passedChecks   = v.checks?.filter((c) => c.status === "pass") || [];
  const failedChecks   = v.checks?.filter((c) => c.status !== "pass") || [];
  const allPassed      = failedChecks.length === 0;

  return (
    <div className="space-y-4">

      {/* CRO Score header */}
      {totalAfter !== undefined && (
        <Card accent={totalAfter >= 70 ? "green" : totalAfter >= 45 ? "amber" : "red"}>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-gray-900">{totalAfter}</div>
              <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">Score After</div>
            </div>
            {totalBefore !== undefined && (
              <>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-lg text-gray-300">→</div>
                  {delta !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      delta > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                    }`}>
                      {delta > 0 ? "+" : ""}{delta}
                    </span>
                  )}
                </div>
                <div className="text-center opacity-60">
                  <div className="text-2xl font-black text-gray-500">{totalBefore}</div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">Score Before</div>
                </div>
              </>
            )}
            <div className="ml-auto flex flex-col items-end gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                allPassed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}>
                {allPassed ? "All checks passed" : `${failedChecks.length} check${failedChecks.length > 1 ? "s" : ""} failed`}
              </span>
              <span className="text-xs text-gray-400">Retries: {retries}</span>
            </div>
          </div>

          {/* Score breakdown */}
          {v.cro_score_after && (
            <div className="mt-5 pt-4 border-t border-gray-50 space-y-2">
              {Object.entries(v.cro_score_after)
                .filter(([k]) => k !== "total")
                .map(([key, val]) => {
                  const before = v.cro_score_before?.[key];
                  const d = before !== undefined ? val - before : null;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <ScoreMeter label={key.replace(/_/g, " ")} score={val} maxScore={20} />
                      {d !== null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          d > 0 ? "bg-emerald-50 text-emerald-600" : d < 0 ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"
                        }`}>
                          {d > 0 ? "+" : ""}{d}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      )}

      {/* Summary */}
      {v.summary && (
        <Card title="Summary" accent="gray">
          <p className="text-sm text-gray-700 leading-relaxed">{v.summary}</p>
        </Card>
      )}

      {/* Semantic checks */}
      {v.checks?.length > 0 && (
        <Card title={`Semantic Checks (${v.checks.length})`} accent="blue">
          <div className="space-y-3">
            {v.checks.map((check, i) => (
              <div key={i} className="flex gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                <StatusDot status={check.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 mb-0.5 truncate">{check.planned_change}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{check.reason}</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full self-start shrink-0 capitalize ${
                  check.status === "pass" ? "bg-emerald-50 text-emerald-700"
                  : check.status === "fail" ? "bg-red-50 text-red-600"
                  : "bg-amber-50 text-amber-700"
                }`}>
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Failed checks detail */}
      {v.failed_checks?.length > 0 && (
        <Card title="Failed Check Details" accent="red">
          <div className="space-y-2">
            {v.failed_checks.map((fc, i) => (
              <div key={i} className="flex gap-2.5 py-1.5">
                <span className="text-red-400 text-xs shrink-0 mt-0.5">✕</span>
                <p className="text-xs text-gray-600 leading-relaxed">{fc}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Structural checks */}
      {structuralChecks?.length > 0 && (
        <StructuralChecksBlock checks={structuralChecks} />
      )}
    </div>
  );
}

// ─── Structural checks sub-block ──────────────────────────────────────────
function StructuralChecksBlock({ checks }) {
  const passed = checks.filter((c) => c.status === "pass");
  const failed = checks.filter((c) => c.status !== "pass");
  return (
    <Card title={`Structural Validation (${passed.length}/${checks.length} passed)`} accent={failed.length === 0 ? "green" : "amber"}>
      <div className="space-y-2">
        {checks.map((c, i) => (
          <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
            <StatusDot status={c.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <code className="text-[10px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-600 truncate max-w-[180px]">{c.selector}</code>
                <span className="text-[10px] text-gray-400 capitalize">{c.action}</span>
              </div>
              {c.reason && <p className="text-xs text-gray-500">{c.reason}</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Legacy validation view ────────────────────────────────────────────────
function LegacyValidationView({ v, retries }) {
  const score      = v.score || 0;
  const barColor   = score >= 70 ? "bg-emerald-400" : score >= 45 ? "bg-amber-400" : "bg-red-400";
  const scoreColor = score >= 70 ? "text-emerald-600" : score >= 45 ? "text-amber-600" : "text-red-500";

  return (
    <div className="space-y-4">
      <Card accent={score >= 70 ? "green" : score >= 45 ? "amber" : "red"}>
        <div className="flex items-center gap-4 mb-4">
          <span className={`text-3xl font-black ${scoreColor}`}>{score}</span>
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 mt-1.5 block uppercase tracking-widest">Quality score</span>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            v.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}>
            {v.passed ? "Passed" : "Failed"}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Recommendation:{" "}
          <span className="font-medium text-gray-700">{v.recommendation || "—"}</span>
          {" "}·{" "}Retries: {retries}
        </div>
      </Card>

      {v.issues?.length > 0 && (
        <Card title={`Issues (${v.issues.length})`} accent="red">
          {v.issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0">
              <SeverityBadge level={issue.severity} />
              <span className="text-sm text-gray-700">{issue.description}</span>
            </div>
          ))}
        </Card>
      )}

      {(!v.issues || v.issues.length === 0) && (
        <p className="text-sm text-emerald-600">No issues detected.</p>
      )}
    </div>
  );
}