// ===== Lesson detail page rendering =====
function getLessonId() {
  const params = new URLSearchParams(location.search);
  const id = parseInt(params.get("id"), 10);
  return Number.isFinite(id) ? id : 1;
}

function currentLang() {
  return localStorage.getItem("site-lang") || "kg";
}

function renderLesson() {
  const id = getLessonId();
  const lesson = LESSONS.find((l) => l.id === id);
  const lang = currentLang();
  const root = document.getElementById("lesson-root");

  if (!lesson) {
    root.innerHTML =
      lang === "ru"
        ? "<p>Урок не найден. <a href=\"programma.html\">Вернуться к программе</a></p>"
        : "<p>Сабак табылган жок. <a href=\"programma.html\">Программага кайтуу</a></p>";
    return;
  }

  const title = lang === "ru" ? lesson.title_ru : lesson.title_kg;
  const material = lang === "ru" ? lesson.material_ru : lesson.material_kg;
  const homework = lang === "ru" ? lesson.homework_ru : lesson.homework_kg;
  const monthLabel = lang === "ru" ? `${lesson.month}-й месяц` : `${lesson.month}-ай`;
  const weekLabel = lang === "ru" ? `${lesson.week}-я неделя` : `${lesson.week}-жума`;
  const lessonLabel = lang === "ru" ? `Занятие ${lesson.id}` : `${lesson.id}-сабак`;

  document.title = `Lesson ${lesson.id} — ${title} — Кодбилим`;
  document.getElementById("lesson-crumb").textContent = `${monthLabel} · ${weekLabel}`;
  document.getElementById("lesson-badge").textContent = lessonLabel;
  document.getElementById("lesson-title").textContent = title;
  document.getElementById("material-heading").textContent = lang === "ru" ? "📘 Материал занятия" : "📘 Сабактын материалы";
  document.getElementById("material-text").textContent = material;
  document.getElementById("homework-heading").textContent = lang === "ru" ? "📝 Домашнее задание" : "📝 Үй тапшырма";
  document.getElementById("homework-text").textContent = homework;
  document.getElementById("video-heading").textContent = lang === "ru" ? "🎬 Видео-урок" : "🎬 Видео сабак";
  document.getElementById("links-heading").textContent = lang === "ru" ? "🔗 Полезные ссылки" : "🔗 Пайдалуу шилтемелер";
  document.getElementById("back-link").textContent = lang === "ru" ? "← Вернуться к программе" : "← Программага кайтуу";

  const videoBlock = document.getElementById("video-block");
  if (lesson.exam) {
    videoBlock.style.display = "none";
  } else {
    videoBlock.style.display = "";
    const videoBox = document.getElementById("video-box");
    const videoFallback = document.getElementById("video-fallback");
    if (lesson.video) {
      videoBox.innerHTML = `<iframe src="${lesson.video}" allowfullscreen loading="lazy"></iframe>`;
      const watchUrl = lesson.video.replace("/embed/", "/watch?v=");
      const fallbackText =
        lang === "ru"
          ? "Видео не открывается? Смотреть на YouTube →"
          : "Видео ачылбай жатабы? YouTube'до көрүү →";
      videoFallback.innerHTML = `<a href="${watchUrl}" target="_blank" rel="noopener">${fallbackText}</a>`;
    } else {
      videoBox.innerHTML = `<div class="video-placeholder"><div class="icon">🎬</div><p>${
        lang === "ru" ? "Видео будет добавлено позже" : "Видео жакында кошулат"
      }</p></div>`;
      videoFallback.innerHTML = "";
    }
  }

  const guideBlock = document.getElementById("guide-block");
  const guideContent = document.getElementById("guide-content");
  const guideHtml = lang === "ru" ? lesson.guide_ru_html : lesson.guide_kg_html;
  if (guideHtml) {
    document.getElementById("guide-heading").textContent = lang === "ru" ? "📖 Полное руководство" : "📖 Толук колдонмо";
    guideContent.innerHTML = guideHtml;
    guideBlock.style.display = "";
  } else {
    guideContent.innerHTML = "";
    guideBlock.style.display = "none";
  }

  const linksWrap = document.getElementById("lesson-links");
  const linksBlock = document.getElementById("lesson-links-block");
  linksWrap.innerHTML = "";
  if (lesson.links && lesson.links.length) {
    lesson.links.forEach((l) => {
      const a = document.createElement("a");
      a.className = "link";
      a.href = l.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = lang === "ru" ? l.l_ru : l.l_kg;
      linksWrap.appendChild(a);
    });
    linksBlock.style.display = "block";
  } else {
    linksBlock.style.display = "none";
  }

  const prev = LESSONS.find((l) => l.id === lesson.id - 1);
  const next = LESSONS.find((l) => l.id === lesson.id + 1);
  const navWrap = document.getElementById("lesson-nav");
  navWrap.innerHTML = "";

  if (prev) {
    const a = document.createElement("a");
    a.href = `lesson.html?id=${prev.id}`;
    a.innerHTML = `<span class="dir">${lang === "ru" ? "← Предыдущее" : "← Мурунку"}</span><span class="ttl">${
      lang === "ru" ? prev.title_ru : prev.title_kg
    }</span>`;
    navWrap.appendChild(a);
  } else {
    navWrap.appendChild(Object.assign(document.createElement("div"), { className: "lesson-nav-empty" }));
  }

  if (next) {
    const a = document.createElement("a");
    a.className = "next";
    a.href = `lesson.html?id=${next.id}`;
    a.innerHTML = `<span class="dir">${lang === "ru" ? "Следующее →" : "Кийинки →"}</span><span class="ttl">${
      lang === "ru" ? next.title_ru : next.title_kg
    }</span>`;
    navWrap.appendChild(a);
  } else {
    navWrap.appendChild(Object.assign(document.createElement("div"), { className: "lesson-nav-empty" }));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderLesson();
  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => renderLesson());
  });
});
