import { Empty, Card } from "./UI";

export default function AnalysisView({ changes }) {
  if (!changes || changes.length === 0) {
    return <Empty text="No changes were detected or recorded." />;
  }

  // Helper to color-code the badge based on standard actions
  const getActionStyles = (action) => {
    const act = (action || "").toLowerCase();
    if (act === "add" || act === "insert") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (act === "remove" || act === "delete") return "bg-red-50 text-red-700 border-red-200";
    if (act === "update" || act === "modify" || act === "replace") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="space-y-4">
      <Card title={`Changes Made (${changes.length})`} accent="blue">
        <div className="space-y-4">
          {changes.map((change, i) => {
            // Filter out keys we are explicitly rendering so they don't appear in the raw JSON block
            const handledKeys = ["action", "selector", "attribute", "content", "value", "reasoning"];
            const rawData = Object.fromEntries(
              Object.entries(change).filter(([k]) => !handledKeys.includes(k))
            );

            return (
              <div key={i} className="p-4 rounded-lg border border-gray-100 bg-gray-50 flex flex-col gap-3">
                
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getActionStyles(change.action)}`}>
                    {change.action || "Unknown Action"}
                  </span>
                </div>

                {/* Extracted Reasoning Block */}
                {change.reasoning && (
                  <div className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold text-gray-900 mr-2">Reasoning:</span>
                    {change.reasoning}
                  </div>
                )}

                {/* Display known fields from the change object dynamically */}
                {(change.selector || change.attribute) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                    {change.selector && (
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Target Selector</span>
                        <code className="text-xs text-pink-600 bg-white px-1.5 py-0.5 rounded border border-gray-200 break-all">
                          {change.selector}
                        </code>
                      </div>
                    )}
                    
                    {change.attribute && (
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Attribute</span>
                        <span className="text-xs font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                          {change.attribute}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Show raw content/values if they exist */}
                {(change.content || change.value) && (
                  <div className="mt-1">
                    <span className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Content / Value</span>
                    <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto text-gray-700 whitespace-pre-wrap">
                      {change.content || change.value}
                    </pre>
                  </div>
                )}

                {/* Fallback for unstructured extra data in the change object */}
                {Object.keys(rawData).length > 0 && (
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-600 font-medium">Raw Data Payload</summary>
                    <pre className="mt-2 bg-white p-3 rounded border border-gray-200 overflow-x-auto text-gray-600">
                      {JSON.stringify(rawData, null, 2)}
                    </pre>
                  </details>
                )}

              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}