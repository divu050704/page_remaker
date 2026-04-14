import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion"; // <-- Import Framer Motion
import AnalysisView from "./components/AnalyseView";
import { PreviewView, Empty, Card } from "./components/UI";
import apiClient from "./api";

const TABS = ["Preview", "Analysis"];

const LOADING_MESSAGES = [
  "Agent 1: Fetching and analyzing your landing page...",
  "Agent 2: Weaving personalized ad copy into the HTML...",
  "Agent 3: Validating structural and semantic changes...",
  "Finalizing your hyper-personalized experience..."
];

export default function App() {
  const [url, setUrl]               = useState("");
  const [adType, setAdType]         = useState("text");
  const [adText, setAdText]         = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  
  const [activeTab, setActiveTab]   = useState("Preview");
  const [loading, setLoading]       = useState(false);
  const [hasRun, setHasRun]         = useState(false);
  
  // Rotating loading messages state
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Response State
  const [changesMade, setChangesMade] = useState([]);
  const [errors, setErrors]           = useState([]);
  const [finalHtml, setFinalHtml]     = useState("");
  const [oldHtml, setOldHtml]         = useState("");
  
  const fileInputRef = useRef();

  // Cycle through loading messages, but STOP at the last one
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => {
          // If we haven't reached the last message, increment
          if (prev < LOADING_MESSAGES.length - 1) {
            return prev + 1;
          }
          // Otherwise, clear interval and stay on the last message
          clearInterval(interval);
          return prev;
        });
      }, 3000); // Increased slightly for better readability
    } else {
      setLoadingMsgIdx(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setUploadedFile(f);
  };

  const runPipeline = async () => {
    if (!url.trim()) { alert("Please enter a landing page URL"); return; }
    const hasAd = adType === "text" ? !!adText.trim() : !!uploadedFile;
    if (!hasAd) { alert("Please provide an ad creative"); return; }

    setLoading(true);
    setHasRun(true);
    setErrors([]);
    setChangesMade([]);
    setFinalHtml("");
    setOldHtml("");

    try {
      const formData = new FormData();
      formData.append("url", url);
      formData.append("ad_creative_type", adType);
      if (adType === "image" && uploadedFile) {
        formData.append("ad_image", uploadedFile);
        formData.append("ad_creative", uploadedFile.name);
      } else {
        formData.append("ad_creative", adText);
      }

      const { data } = await apiClient.post("analyze/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setChangesMade(data.changes_made || []);
      setErrors(data.errors || []);
      setFinalHtml(data.final_html || "");
      setOldHtml(data.old_html || "");

      if (data.errors && data.errors.length > 0) {
        // Leave active tab as is
      } else {
        setActiveTab("Preview");
      }

    } catch (e) {
      setErrors([e?.response?.data?.detail || e.message || "An unknown error occurred."]);
    }

    setLoading(false);
  };

  const tabContent = {
    Preview:  <PreviewView html={finalHtml} oldHtml={oldHtml} sourceUrl={url} />,
    Analysis: <AnalysisView changes={changesMade} />,
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f7f4] font-sans text-gray-900">
      {/* Topbar */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" opacity=".4"/>
              <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" stroke="white" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-gray-900">Converge</span>
        </div>
        <span className="text-gray-300 text-sm">/</span>
        <span className="text-sm text-gray-500">Landing Page Personalizer</span>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Sidebar */}
        <aside className="w-[300px] flex-shrink-0 border-r border-gray-200 bg-white p-6 flex flex-col gap-7 overflow-y-auto">
          {/* URL input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2.5">
              Landing Page URL
            </label>
            <input
              type="url"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
              placeholder="https://yourpage.com/landing"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {/* Ad creative */}
          <div className="flex-1 flex flex-col">
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2.5">
              Ad Creative
            </label>

            <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
              {["text", "image"].map((t) => (
                <button
                  key={t}
                  onClick={() => setAdType(t)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    adType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t === "text" ? "✦ Text" : "⬡ Image"}
                </button>
              ))}
            </div>

            {adType === "text" && (
              <textarea
                className="w-full px-3.5 py-3 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-gray-400 focus:bg-white transition-all resize-y min-h-[120px] leading-relaxed"
                placeholder="Paste your ad copy here..."
                value={adText}
                onChange={(e) => setAdText(e.target.value)}
              />
            )}

            {adType === "image" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all flex-1 flex flex-col items-center justify-center gap-2 ${
                  uploadedFile ? "border-gray-900 bg-gray-50" : "border-gray-200 text-gray-400 hover:border-gray-400"
                }`}
              >
                {uploadedFile ? (
                  <p className="text-sm font-medium text-gray-900 break-all px-2">{uploadedFile.name}</p>
                ) : (
                  <p className="text-sm font-medium">Upload ad image</p>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          <button
            onClick={runPipeline}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold bg-gray-900 hover:bg-gray-800 text-white transition-all disabled:opacity-40"
          >
            {loading ? "Running..." : "Personalize"}
          </button>
        </aside>

        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {errors.length > 0 ? (
             <div className="flex-1 overflow-y-auto p-6 bg-[#f8f7f4]">
                <Card title="Generation Errors" accent="red">
                  <div className="space-y-3">
                    {errors.map((err, i) => (
                      <div key={i} className="flex gap-2.5 items-start p-3 bg-red-50 rounded-lg border border-red-100">
                        <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                        <p className="text-sm text-red-800 break-all">
                          {typeof err === "string" ? err : JSON.stringify(err)}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
             </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex gap-0 border-b border-gray-200 bg-white px-6">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3.5 text-xs font-semibold border-b-2 transition-colors tracking-wide uppercase ${
                      activeTab === tab
                        ? "border-gray-900 text-gray-900"
                        : "border-transparent text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#f8f7f4]">
                {!hasRun ? (
                  <Empty text="Enter a landing page URL and ad creative, then click Personalize." />
                ) : loading ? (
                  
                  // --- NEW FRAMER MOTION LOADING STATE ---
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="relative h-12 flex items-center justify-center w-full overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={loadingMsgIdx}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className="absolute text-gray-500 font-medium text-sm text-center m-0"
                        >
                          {LOADING_MESSAGES[loadingMsgIdx]}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                    {/* Optional: Add a continuous spinner so the user knows it's still working when the text stops on the final message */}
                    <motion.div 
                      className="mt-6 w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  // ---------------------------------------
                  
                ) : (
                  tabContent[activeTab]
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}