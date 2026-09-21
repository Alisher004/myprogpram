// ===== Code Playground: in-browser editor + live preview =====
let pgState = { html: "", css: "", js: "" };
let pgLessonId = null;
let pgActiveTab = null;
let pgDebounceTimer = null;
let pgTabs = [];

function pgStorageKey(id) {
  return `playground-${id}`;
}

function pgLoadSaved(id) {
  try {
    const raw = localStorage.getItem(pgStorageKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function pgSave(id, state) {
  try {
    localStorage.setItem(pgStorageKey(id), JSON.stringify(state));
  } catch (e) {
    /* localStorage unavailable — ignore */
  }
}

function pgBuildDoc(state) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color:#1b2233; margin:0; padding:16px; }
  ${state.css || ""}
</style>
</head>
<body>
${state.html || ""}
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
${state.js || ""}
<\/script>
</body>
</html>`;
}

function pgRun() {
  const frame = document.getElementById("preview-frame");
  const consoleLog = document.getElementById("console-log");
  if (!frame || !consoleLog) return;
  consoleLog.innerHTML = "";
  frame.srcdoc = pgBuildDoc(pgState);
}

function pgAppendConsole(level, text) {
  const consoleLog = document.getElementById("console-log");
  if (!consoleLog) return;
  const line = document.createElement("div");
  line.className = "console-line" + (level === "error" ? " error" : "");
  const safeText = String(text).replace(/</g, "&lt;");
  line.innerHTML = '<span class="console-arrow">›</span>' + safeText;
  consoleLog.appendChild(line);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || !data.__playground) return;
  pgAppendConsole(data.level, data.text);
});

function pgSwitchTab(tab) {
  pgActiveTab = tab;
  document.querySelectorAll("#editor-tabs button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll("#editor-body textarea").forEach((ta) => {
    ta.classList.toggle("active", ta.dataset.tab === tab);
  });
}

function pgReadEditors() {
  pgTabs.forEach((t) => {
    const ta = document.getElementById(`pg-editor-${t.key}`);
    if (ta) pgState[t.key] = ta.value;
  });
}

function pgHandleInput() {
  clearTimeout(pgDebounceTimer);
  pgDebounceTimer = setTimeout(() => {
    pgReadEditors();
    pgSave(pgLessonId, pgState);
    pgRun();
  }, 600);
}

function initPlayground(lesson, lang) {
  const block = document.getElementById("playground-block");
  const pg = lesson.playground;

  if (!pg || (!pg.html && !pg.css && !pg.js)) {
    block.style.display = "none";
    return;
  }

  pgLessonId = lesson.id;
  const saved = pgLoadSaved(lesson.id);
  pgState = saved || { html: pg.html || "", css: pg.css || "", js: pg.js || "" };

  document.getElementById("playground-heading").textContent = "💻 " + (lang === "ru" ? "Практика" : "Практика");

  pgTabs = [];
  if (pg.html !== undefined) pgTabs.push({ key: "html", label: "HTML" });
  if (pg.css !== undefined) pgTabs.push({ key: "css", label: "CSS" });
  if (pg.js !== undefined) pgTabs.push({ key: "js", label: "JavaScript" });

  const tabsWrap = document.getElementById("editor-tabs");
  const bodyWrap = document.getElementById("editor-body");
  tabsWrap.innerHTML = "";
  bodyWrap.innerHTML = "";

  pgTabs.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = t.label;
    btn.dataset.tab = t.key;
    btn.addEventListener("click", () => pgSwitchTab(t.key));
    tabsWrap.appendChild(btn);

    const ta = document.createElement("textarea");
    ta.id = `pg-editor-${t.key}`;
    ta.dataset.tab = t.key;
    ta.spellcheck = false;
    ta.value = pgState[t.key] || "";
    ta.addEventListener("input", pgHandleInput);
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        ta.value = ta.value.slice(0, start) + "  " + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
        pgHandleInput();
      }
    });
    bodyWrap.appendChild(ta);
  });

  pgSwitchTab(pgTabs[0].key);

  document.getElementById("run-btn-text").textContent = lang === "ru" ? "Запустить" : "Иштетүү";
  document.getElementById("reset-btn-text").textContent = lang === "ru" ? "Сбросить" : "Баштапкыга";
  document.getElementById("preview-tab-label").textContent = lang === "ru" ? "Результат" : "Натыйжа";
  document.getElementById("console-log").setAttribute(
    "data-placeholder",
    lang === "ru" ? "Здесь появится вывод console.log" : "console.log натыйжасы ушул жерде көрүнөт"
  );

  document.getElementById("run-btn").onclick = () => {
    pgReadEditors();
    pgSave(lesson.id, pgState);
    pgRun();
  };

  document.getElementById("reset-btn").onclick = () => {
    const confirmMsg =
      lang === "ru"
        ? "Сбросить изменения к исходному коду?"
        : "Өзгөртүүлөрдү баштапкы кодго кайтарабызбы?";
    if (!confirm(confirmMsg)) return;
    localStorage.removeItem(pgStorageKey(lesson.id));
    pgState = { html: pg.html || "", css: pg.css || "", js: pg.js || "" };
    pgTabs.forEach((t) => {
      const ta = document.getElementById(`pg-editor-${t.key}`);
      if (ta) ta.value = pgState[t.key] || "";
    });
    pgRun();
  };

  block.style.display = "";
  pgRun();
}
