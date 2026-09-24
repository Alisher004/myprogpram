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

  document.querySelectorAll("[data-kg-placeholder]").forEach((el) => {
    const text = lang === "ru" ? el.getAttribute("data-ru-placeholder") : el.getAttribute("data-kg-placeholder");
    if (text !== null) el.setAttribute("placeholder", text);
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

// ===== Lesson search (programma.html) =====
function initLessonSearch() {
  const input = document.getElementById("lesson-search");
  const emptyMsg = document.getElementById("search-empty");
  if (!input) return;

  const weeks = Array.from(document.querySelectorAll("details.week"));
  const months = Array.from(document.querySelectorAll(".month-block"));
  const initialOpen = new Map(weeks.map((w) => [w, w.hasAttribute("open")]));

  const norm = (s) => (s || "").toLowerCase().trim();

  function runSearch() {
    const query = norm(input.value);

    if (!query) {
      document.querySelectorAll("a.lesson").forEach((a) => { a.hidden = false; });
      weeks.forEach((w) => { w.hidden = false; w.open = initialOpen.get(w); });
      months.forEach((m) => { m.hidden = false; });
      if (emptyMsg) emptyMsg.hidden = true;
      return;
    }

    let anyMatch = false;

    months.forEach((month) => {
      let monthHasMatch = false;

      month.querySelectorAll("details.week").forEach((week) => {
        let weekHasMatch = false;

        week.querySelectorAll("a.lesson").forEach((a) => {
          const num = norm(a.querySelector(".num") && a.querySelector(".num").textContent);
          const txt = a.querySelector(".txt");
          const kg = norm(txt && txt.getAttribute("data-kg"));
          const ru = norm(txt && txt.getAttribute("data-ru"));
          const matches = kg.includes(query) || ru.includes(query) || num === query;
          a.hidden = !matches;
          if (matches) weekHasMatch = true;
        });

        week.hidden = !weekHasMatch;
        if (weekHasMatch) {
          week.open = true;
          monthHasMatch = true;
        }
      });

      month.hidden = !monthHasMatch;
      if (monthHasMatch) anyMatch = true;
    });

    if (emptyMsg) emptyMsg.hidden = anyMatch;
  }

  input.addEventListener("input", runSearch);
}

// ===== Mini-quizzes (tests.html) =====
function initQuizzes() {
  document.querySelectorAll(".quiz-card").forEach((card) => {
    const checkBtn = card.querySelector(".quiz-check-btn");
    const resetBtn = card.querySelector(".quiz-reset-btn");
    const result = card.querySelector(".quiz-result");
    if (!checkBtn) return;

    checkBtn.addEventListener("click", () => {
      const questions = card.querySelectorAll(".quiz-q");
      let correctCount = 0;
      let answeredCount = 0;

      questions.forEach((q) => {
        const correctValue = q.dataset.correct;
        const checked = q.querySelector("input:checked");
        if (checked) answeredCount++;

        q.querySelectorAll(".quiz-options label").forEach((label) => {
          label.classList.remove("is-correct", "is-wrong");
          const input = label.querySelector("input");
          if (input.value === correctValue) {
            label.classList.add("is-correct");
          } else if (checked && input === checked) {
            label.classList.add("is-wrong");
          }
        });

        if (checked && checked.value === correctValue) correctCount++;
      });

      const total = questions.length;
      const lang = localStorage.getItem("site-lang") || "kg";
      let msg;
      if (answeredCount < total) {
        msg =
          lang === "ru"
            ? `Ответьте на все вопросы (осталось ${total - answeredCount}).`
            : `Бардык суроого жооп бериңиз (дагы ${total - answeredCount} калды).`;
      } else {
        msg =
          lang === "ru"
            ? `Результат: ${correctCount} из ${total}`
            : `Натыйжа: ${total} суроодон ${correctCount} туура`;
      }
      if (result) {
        result.textContent = msg;
        result.hidden = false;
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        card.querySelectorAll("input[type=radio]").forEach((i) => { i.checked = false; });
        card.querySelectorAll(".quiz-options label").forEach((l) => {
          l.classList.remove("is-correct", "is-wrong");
        });
        if (result) result.hidden = true;
      });
    }
  });
}

// ===== Certificate generator (certificate.html) =====
function initCertificate() {
  const nameInput = document.getElementById("cert-name");
  const dateInput = document.getElementById("cert-date");
  const nameDisplay = document.getElementById("cert-name-display");
  const dateDisplay = document.getElementById("cert-date-display");
  const printBtn = document.getElementById("cert-print-btn");
  if (!nameInput || !dateInput || !nameDisplay || !dateDisplay) return;

  const monthsKg = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
  const monthsRuGen = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  function formatDate(value) {
    if (!value) return "—";
    const [y, m, d] = value.split("-").map(Number);
    const lang = localStorage.getItem("site-lang") || "kg";
    if (lang === "ru") return `${d} ${monthsRuGen[m - 1]} ${y} г.`;
    return `${d}-${monthsKg[m - 1]}, ${y}-жыл`;
  }

  function updateName() {
    const val = nameInput.value.trim();
    const lang = localStorage.getItem("site-lang") || "kg";
    nameDisplay.textContent = val || (lang === "ru" ? "Имя и фамилия студента" : "Студенттин аты-жөнү");
  }

  function updateDate() {
    dateDisplay.textContent = formatDate(dateInput.value);
  }

  nameInput.addEventListener("input", updateName);
  dateInput.addEventListener("input", updateDate);
  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      updateName();
      updateDate();
    });
  });

  dateInput.value = new Date().toISOString().slice(0, 10);
  updateDate();

  if (printBtn) printBtn.addEventListener("click", () => window.print());
}

document.addEventListener("DOMContentLoaded", () => {
  initLangToggle();
  initNavToggle();
  initActiveLink();
  initLessonSearch();
  initQuizzes();
  initCertificate();
});
