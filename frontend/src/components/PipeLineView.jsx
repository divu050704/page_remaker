function StepDot({ status }) {
  if (status === "running")
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.2)] animate-pulse shrink-0" />
    );
  if (status === "done")
    return <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />;
  if (status === "error")
    return <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />;
  return <span className="w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-300 shrink-0" />;
}

function StatusLabel({ status }) {
  if (status === "done")
    return <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Done</span>;
  if (status === "running")
    return <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">Running…</span>;
  if (status === "error")
    return <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Error</span>;
  return <span className="text-[10px] text-gray-300">Idle</span>;
}

export default function PipelineView({ steps, retries, pipelineMsg }) {
  const doneCount = steps.filter((s) => s.status === "done").length;
  const hasError  = steps.some((s) => s.status === "error");
  const allDone   = doneCount === steps.length;

  return (
    <div className="space-y-3 max-w-xl">
      {/* Progress bar */}
      {doneCount > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
              {allDone && !hasError ? "Complete" : hasError ? "Error" : "Running"}
            </span>
            <span className="text-[10px] text-gray-400">{doneCount}/{steps.length} steps</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${hasError ? "bg-red-400" : "bg-gray-900"}`}
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-all ${
              s.status === "running"
                ? "border-amber-200 bg-amber-50/60"
                : s.status === "done"
                ? "border-gray-100 bg-white"
                : s.status === "error"
                ? "border-red-200 bg-red-50/40"
                : "border-gray-100 bg-white opacity-50"
            }`}
          >
            <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0">{String(i + 1).padStart(2, "0")}</span>
            <StepDot status={s.status} />
            <span className="flex-1 text-sm text-gray-800 font-medium">{s.label}</span>
            <StatusLabel status={s.status} />
          </div>
        ))}
      </div>

      {/* Retry / message */}
      {(pipelineMsg || retries > 0) && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
          {pipelineMsg && <p className="text-xs text-gray-500">{pipelineMsg}</p>}
          {retries > 0 && !pipelineMsg && (
            <p className="text-xs text-gray-500">Completed with {retries} retry attempt{retries !== 1 ? "s" : ""}.</p>
          )}
        </div>
      )}
    </div>
  );
}