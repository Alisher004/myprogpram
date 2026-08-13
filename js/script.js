// ===== Language toggle (kg / ru) =====
function applyLang(lang) {
  document.documentElement.setAttribute("lang", lang === "ru" ? "ru" : "ky");

  document.querySelectorAll("[data-kg]").forEach((el) => {
    const text = lang === "ru" ? el.getAttribute("data-ru") : el.getAttribute("data-kg");
    if (text !== null) el.textContent = text;
  });

  document.querySelectorAll("[data-kg-html]").forEach((el) => {
    const html = lang === "ru" ? el.getAttribute("data-ru-html") : el.getAttribute("data-kg-html");
    if (html !== null) el.innerHTML = html;
  });

  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  localStorage.setItem("site-lang", lang);
}

function initLangToggle() {
  const saved = localStorage.getItem("site-lang") || "kg";
  applyLang(saved);

  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => applyLang(btn.dataset.lang));
  });
}

// ===== Mobile nav toggle =====
function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    links.classList.toggle("open");
  });

  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => links.classList.remove("open"));
  });
}

// ===== Active nav link highlight =====
function initActiveLink() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path) a.classList.add("active");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLangToggle();
  initNavToggle();
  initActiveLink();
});
