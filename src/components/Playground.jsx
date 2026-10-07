import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nContext";

const TABS = [
  { key: "html", label: "HTML" },
  { key: "css", label: "CSS" },
  { key: "js", label: "JavaScript" },
];

const storageKey = (id) => `playground-${id}`;

function loadSaved(id) {
  try {
    const raw = localStorage.getItem(storageKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(id, code) {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(code));
  } catch {
    /* localStorage unavailable — ignore */
  }
}

function initialCode(pg) {
  return { html: pg.html || "", css: pg.css || "", js: pg.js || "" };
}

function buildDoc(code) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color:#1b2233; margin:0; padding:16px; }
  ${code.css}
</style>
</head>
<body>
${code.html}
<script>
(function(){
  function send(level, args){
    try {
      var parts = args.map(function(a){
        if (typeof a === "object" && a !== null) {
          try { return JSON.stringify(a, null, 2); } catch(e){ return String(a); }
        }
        return String(a);
      });
      window.parent.postMessage({ __playground: true, level: level, text: parts.join(" ") }, "*");
    } catch(e){}
  }
  ["log","warn","error","info"].forEach(function(level){
    var orig = console[level] ? console[level].bind(console) : function(){};
    console[level] = function(){
      send(level, Array.prototype.slice.call(arguments));
      orig.apply(console, arguments);
    };
  });
  window.onerror = function(msg, src, line){
    send("error", [msg + " (сап " + line + ")"]);
  };
})();
<\/script>
<script>
${code.js}
<\/script>
</body>
</html>`;
}

// Mounted with key={lesson.id}, so state resets when the lesson changes
export default function Playground({ lessonId, playground }) {
  const { t } = useI18n();
  const tabs = TABS.filter((tab) => playground[tab.key] !== undefined);
  const [code, setCode] = useState(() => loadSaved(lessonId) || initialCode(playground));
  const [activeTab, setActiveTab] = useState(tabs[0].key);
  const [srcDoc, setSrcDoc] = useState(() => buildDoc(code));
  const [logs, setLogs] = useState([]);
  const frameRef = useRef(null);
  const consoleRef = useRef(null);

  const run = (next = code) => {
    setLogs([]);
    setSrcDoc(buildDoc(next));
  };

  // Auto-run 600ms after the last keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      save(lessonId, code);
      run(code);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    const onMessage = (event) => {
      const data = event.data;
      if (!data || !data.__playground) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      setLogs((prev) => [...prev, { level: data.level, text: data.text }]);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [logs]);

  const update = (key, value) => setCode((prev) => ({ ...prev, [key]: value }));

  const onKeyDown = (e, key) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = ta;
    update(key, value.slice(0, start) + "  " + value.slice(end));
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + 2;
    });
  };

  const reset = () => {
    if (!confirm(t("lesson.resetConfirm"))) return;
    try {
      localStorage.removeItem(storageKey(lessonId));
    } catch {
      /* ignore */
    }
    const fresh = initialCode(playground);
    setCode(fresh);
    run(fresh);
  };

  return (
    <div className="lesson-block">
      <h3>{t("lesson.practice")}</h3>
      <div className="playground">
        <div className="playground-panel">
          <div className="editor-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? "active" : undefined}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="editor-body">
            {tabs.map((tab) => (
              <textarea
                key={tab.key}
                className={activeTab === tab.key ? "active" : undefined}
                spellCheck={false}
                value={code[tab.key]}
                onChange={(e) => update(tab.key, e.target.value)}
                onKeyDown={(e) => onKeyDown(e, tab.key)}
              />
            ))}
          </div>
          <div className="playground-toolbar">
            <button type="button" onClick={() => (save(lessonId, code), run())}>
              ▶ <span>{t("lesson.run")}</span>
            </button>
            <button type="button" onClick={reset}>
              ↺ <span>{t("lesson.reset")}</span>
            </button>
          </div>
        </div>
        <div className="playground-panel playground-output">
          <div className="output-tabs">
            <span>{t("lesson.result")}</span>
          </div>
          <iframe
            ref={frameRef}
            className="preview-frame"
            sandbox="allow-scripts allow-modals allow-forms"
            title="preview"
            srcDoc={srcDoc}
          />
          <div className="console-log" ref={consoleRef} data-placeholder={t("lesson.consolePlaceholder")}>
            {logs.map((line, i) => (
              <div key={i} className={`console-line${line.level === "error" ? " error" : ""}`}>
                <span className="console-arrow">›</span>
                {line.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
