// ===== Code Playground: in-browser editor + live preview =====
let pgState = { html: "", css: "", js: "" };
let pgLessonId = null;
let pgActiveTab = null;
let pgDebounceTimer = null;
let pgTabs = [];

// ===== Code hints (autocomplete) =====
const PG_DICT = {
  html: [
    "div", "span", "p", "a", "img", "ul", "ol", "li", "button", "input", "form",
    "label", "select", "option", "textarea", "h1", "h2", "h3", "h4", "h5", "h6",
    "section", "header", "footer", "nav", "main", "article", "table", "thead",
    "tbody", "tr", "td", "th", "br", "hr", "strong", "em", "small", "script",
    "style", "link", "meta", "iframe", "video", "audio", "canvas", "figure",
    "class", "id", "href", "src", "alt", "type", "name", "value", "placeholder",
    "target", "rel", "disabled", "checked", "required", "data-id", "rows", "cols",
  ],
  css: [
    "color", "background", "background-color", "background-image", "margin",
    "margin-top", "margin-bottom", "margin-left", "margin-right", "padding",
    "padding-top", "padding-bottom", "padding-left", "padding-right", "border",
    "border-radius", "border-color", "border-width", "display", "flex",
    "flex-direction", "flex-wrap", "justify-content", "align-items", "align-self",
    "gap", "width", "height", "max-width", "min-width", "max-height", "min-height",
    "font-size", "font-weight", "font-family", "text-align", "text-decoration",
    "line-height", "letter-spacing", "position", "top", "left", "right", "bottom",
    "z-index", "overflow", "overflow-x", "overflow-y", "transition", "transform",
    "box-shadow", "cursor", "opacity", "grid-template-columns", "grid-template-rows",
    "object-fit", "white-space", "box-sizing", "block", "inline", "inline-block",
    "none", "center", "space-between", "space-around", "flex-start", "flex-end",
    "absolute", "relative", "fixed", "sticky", "static", "bold", "italic",
    "underline", "pointer", "hidden", "visible", "auto", "solid", "dashed",
    "dotted", "uppercase", "lowercase", "wrap", "nowrap", "border-box",
  ],
  js: [
    "let", "const", "var", "function", "return", "if", "else", "for", "while",
    "do", "switch", "case", "break", "continue", "true", "false", "null",
    "undefined", "new", "class", "extends", "this", "try", "catch", "finally",
    "throw", "async", "await", "import", "export", "default", "typeof",
    "console", "document", "window", "localStorage", "sessionStorage", "JSON",
    "Math", "Array", "Object", "String", "Number", "Boolean", "Date", "Promise",
    "fetch", "setTimeout", "setInterval", "parseInt", "parseFloat",
    "log", "warn", "error", "querySelector", "querySelectorAll", "getElementById",
    "addEventListener", "removeEventListener", "createElement", "appendChild",
    "removeChild", "remove", "setAttribute", "getAttribute", "classList", "add",
    "toggle", "contains", "innerHTML", "innerText", "textContent", "value",
    "checked", "dataset", "forEach", "map", "filter", "reduce", "find",
    "findIndex", "some", "every", "includes", "indexOf", "push", "pop", "shift",
    "unshift", "splice", "slice", "join", "split", "trim", "toUpperCase",
    "toLowerCase", "replace", "startsWith", "endsWith", "setItem", "getItem",
    "removeItem", "stringify", "parse", "then", "preventDefault",
    "stopPropagation", "target", "random", "floor", "round", "ceil", "keys",
    "values", "entries", "length",
  ],
};

let pgHintMenuEl = null;
let pgHintItems = [];
let pgHintSelected = -1;
let pgHintRange = null; // { start, end } of the word being replaced, in the active textarea

function pgGetHintMenu() {
  if (pgHintMenuEl) return pgHintMenuEl;
  const wrap = document.getElementById("editor-body");
  const menu = document.createElement("div");
  menu.className = "pg-hint-menu";
  wrap.appendChild(menu);
  pgHintMenuEl = menu;
  return menu;
}

function pgHideHints() {
  if (pgHintMenuEl) pgHintMenuEl.classList.remove("open");
  pgHintItems = [];
  pgHintSelected = -1;
  pgHintRange = null;
}

// Returns the caret's pixel position relative to the textarea's own top-left corner,
// by mirroring the textarea's text/box styling into a hidden div (the standard
// "caret coordinates in a textarea" trick — textareas expose no native API for this).
function pgCaretPixelPos(ta) {
  const mirror = document.createElement("div");
  const style = getComputedStyle(ta);
  const props = [
    "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "tabSize",
  ];
  props.forEach((p) => { mirror.style[p] = style[p]; });
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";

  const before = ta.value.slice(0, ta.selectionStart);
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.textContent = before;
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const pos = {
    top: marker.offsetTop - ta.scrollTop,
    left: marker.offsetLeft - ta.scrollLeft,
  };
  document.body.removeChild(mirror);
  return pos;
}

function pgCurrentWordRange(ta) {
  const caret = ta.selectionStart;
  const before = ta.value.slice(0, caret);
  const match = before.match(/[A-Za-z_-][A-Za-z0-9_-]*$/);
  if (!match) return null;
  return { start: caret - match[0].length, end: caret, word: match[0] };
}

function pgCollectBufferWords() {
  const words = new Set();
  ["html", "css", "js"].forEach((k) => {
    const val = pgState[k] || "";
    const found = val.match(/[A-Za-z_][A-Za-z0-9_-]*/g) || [];
    found.forEach((w) => { if (w.length > 2) words.add(w); });
  });
  return words;
}

function pgGetSuggestions(tab, word) {
  const lower = word.toLowerCase();
  const dict = PG_DICT[tab] || [];
  const bufferWords = pgCollectBufferWords();
  const pool = new Set([...dict, ...bufferWords]);
  const matches = [...pool].filter(
    (w) => w.toLowerCase().startsWith(lower) && w.toLowerCase() !== lower
  );
  matches.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return matches.slice(0, 8);
}

function pgRenderHints(suggestions, word) {
  const menu = pgGetHintMenu();
  menu.innerHTML = "";
  pgHintItems = suggestions;
  pgHintSelected = suggestions.length ? 0 : -1;
  suggestions.forEach((s, i) => {
    const item = document.createElement("div");
    item.className = "pg-hint-item" + (i === 0 ? " selected" : "");
    item.innerHTML =
      '<span class="pg-hint-match">' + word + "</span>" + s.slice(word.length);
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      pgAcceptHint(document.getElementById(`pg-editor-${pgActiveTab}`), s);
    });
    menu.appendChild(item);
  });
  menu.classList.toggle("open", suggestions.length > 0);
}

function pgShowHints(ta, tab) {
  const range = pgCurrentWordRange(ta);
  if (!range || range.word.length < 2) {
    pgHideHints();
    return;
  }
  const suggestions = pgGetSuggestions(tab, range.word);
  if (!suggestions.length) {
    pgHideHints();
    return;
  }
  pgHintRange = range;
  pgRenderHints(suggestions, range.word);
  const pos = pgCaretPixelPos(ta);
  const menu = pgGetHintMenu();
  menu.style.left = Math.max(0, pos.left) + "px";
  menu.style.top = pos.top + 22 + "px";
}

function pgAcceptHint(ta, suggestion) {
  if (!ta || !pgHintRange) return;
  const { start, end } = pgHintRange;
  const value = ta.value;
  ta.value = value.slice(0, start) + suggestion + value.slice(end);
  const caret = start + suggestion.length;
  ta.selectionStart = ta.selectionEnd = caret;
  pgHideHints();
  ta.focus();
  pgHandleInput();
}

function pgMoveHintSelection(delta) {
  if (!pgHintItems.length) return;
  const items = pgHintMenuEl.querySelectorAll(".pg-hint-item");
  items[pgHintSelected]?.classList.remove("selected");
  pgHintSelected = (pgHintSelected + delta + items.length) % items.length;
  items[pgHintSelected]?.classList.add("selected");
  items[pgHintSelected]?.scrollIntoView({ block: "nearest" });
}

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
  pgHideHints();
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
  pgHideHints();
  pgHintMenuEl = null;

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
    ta.addEventListener("input", () => {
      pgHandleInput();
      pgShowHints(ta, t.key);
    });
    ta.addEventListener("keydown", (e) => {
      const hintsOpen = pgHintItems.length > 0;
      if (hintsOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        pgMoveHintSelection(e.key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (hintsOpen && (e.key === "Enter" || e.key === "Tab") && pgHintSelected >= 0) {
        e.preventDefault();
        pgAcceptHint(ta, pgHintItems[pgHintSelected]);
        return;
      }
      if (hintsOpen && e.key === "Escape") {
        e.preventDefault();
        pgHideHints();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        ta.value = ta.value.slice(0, start) + "  " + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
        pgHandleInput();
      }
    });
    ta.addEventListener("blur", () => {
      setTimeout(pgHideHints, 120);
    });
    ta.addEventListener("scroll", pgHideHints);
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
    pgHideHints();
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
