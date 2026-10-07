import { useI18n } from "../i18n/I18nContext";

export default function Resources() {
  const { t } = useI18n();

  return (
    <>
      <section className="hero" style={{ padding: "52px 0" }}>
        <div className="container">
          <span className="eyebrow">{t("resources.t1")}</span>
          <h1>{t("resources.t2")}</h1>
          <p>{t("resources.t3")}</p>
        </div>
      </section>

      <section className="tight">
      <div className="container">

        <div className="res-cat">
          <h3>📘 <span>{t("resources.t4")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://developer.mozilla.org/ru/docs/Web/HTML" target="_blank" rel="noopener">MDN Web Docs (HTML/CSS)</a><span>{t("resources.t5")}</span></div>
            <div className="res-link"><a href="https://flexboxfroggy.com/" target="_blank" rel="noopener">Flexbox Froggy</a><span>{t("resources.t6")}</span></div>
            <div className="res-link"><a href="https://cssgridgarden.com/" target="_blank" rel="noopener">Grid Garden</a><span>{t("resources.t7")}</span></div>
            <div className="res-link"><a href="https://css-tricks.com/" target="_blank" rel="noopener">CSS-Tricks</a><span>{t("resources.t8")}</span></div>
            <div className="res-link"><a href="https://caniuse.com/" target="_blank" rel="noopener">Can I Use</a><span>{t("resources.t9")}</span></div>
          </div>
        </div>

        <div className="res-cat">
          <h3>⚡ <span>{t("resources.t10")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://learn.javascript.ru/" target="_blank" rel="noopener">javascript.info</a><span>{t("resources.t11")}</span></div>
            <div className="res-link"><a href="https://developer.mozilla.org/ru/docs/Web/JavaScript" target="_blank" rel="noopener">MDN JavaScript</a><span>{t("resources.t12")}</span></div>
            <div className="res-link"><a href="https://javascript30.com/" target="_blank" rel="noopener">JavaScript30</a><span>{t("resources.t13")}</span></div>
            <div className="res-link"><a href="https://eloquentjavascript.net/" target="_blank" rel="noopener">Eloquent JavaScript</a><span>{t("resources.t14")}</span></div>
          </div>
        </div>

        <div className="res-cat">
          <h3>🌿 <span>{t("resources.t15")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://learngitbranching.js.org/?locale=ru_RU" target="_blank" rel="noopener">Learn Git Branching</a><span>{t("resources.t16")}</span></div>
            <div className="res-link"><a href="https://skills.github.com/" target="_blank" rel="noopener">GitHub Skills</a><span>{t("resources.t17")}</span></div>
            <div className="res-link"><a href="https://docs.github.com/ru" target="_blank" rel="noopener">GitHub Docs</a><span>{t("resources.t18")}</span></div>
            <div className="res-link"><a href="https://www.conventionalcommits.org/ru/" target="_blank" rel="noopener">Conventional Commits</a><span>{t("resources.t19")}</span></div>
          </div>
        </div>

        <div className="res-cat">
          <h3>⚛️ <span>{t("resources.t20")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://react.dev/learn" target="_blank" rel="noopener">react.dev</a><span>{t("resources.t21")}</span></div>
            <div className="res-link"><a href="https://vitejs.dev/" target="_blank" rel="noopener">Vite</a><span>{t("resources.t22")}</span></div>
            <div className="res-link"><a href="https://reactrouter.com/" target="_blank" rel="noopener">React Router</a><span>{t("resources.t23")}</span></div>
            <div className="res-link"><a href="https://tailwindcss.com/docs" target="_blank" rel="noopener">Tailwind CSS</a><span>{t("resources.t24")}</span></div>
          </div>
        </div>

        <div className="res-cat">
          <h3>🧩 <span>{t("resources.t25")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://www.freecodecamp.org/" target="_blank" rel="noopener">freeCodeCamp</a><span>{t("resources.t26")}</span></div>
            <div className="res-link"><a href="https://www.frontendmentor.io/" target="_blank" rel="noopener">Frontend Mentor</a><span>{t("resources.t27")}</span></div>
            <div className="res-link"><a href="https://roadmap.sh/frontend" target="_blank" rel="noopener">roadmap.sh</a><span>{t("resources.t28")}</span></div>
            <div className="res-link"><a href="https://www.codewars.com/" target="_blank" rel="noopener">Codewars</a><span>{t("resources.t29")}</span></div>
          </div>
        </div>

        <div className="res-cat">
          <h3>🎨 <span>{t("resources.t30")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://dribbble.com/" target="_blank" rel="noopener">Dribbble</a><span>{t("resources.t31")}</span></div>
            <div className="res-link"><a href="https://coolors.co/" target="_blank" rel="noopener">Coolors</a><span>{t("resources.t32")}</span></div>
            <div className="res-link"><a href="https://fonts.google.com/" target="_blank" rel="noopener">Google Fonts</a><span>{t("resources.t33")}</span></div>
            <div className="res-link"><a href="https://www.figma.com/" target="_blank" rel="noopener">Figma</a><span>{t("resources.t34")}</span></div>
          </div>
        </div>

        <div className="res-cat">
          <h3>🚀 <span>{t("resources.t35")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://vercel.com/docs" target="_blank" rel="noopener">Vercel</a><span>{t("resources.t36")}</span></div>
            <div className="res-link"><a href="https://docs.netlify.com/" target="_blank" rel="noopener">Netlify</a><span>{t("resources.t37")}</span></div>
            <div className="res-link"><a href="https://pages.github.com/" target="_blank" rel="noopener">GitHub Pages</a><span>{t("resources.t38")}</span></div>
          </div>
        </div>

        <div className="res-cat">
          <h3>⌨️ <span>{t("resources.t39")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://www.typing.com/" target="_blank" rel="noopener">Typing.com</a><span>{t("resources.t40")}</span></div>
            <div className="res-link"><a href="https://klavogonki.ru/" target="_blank" rel="noopener">Klavogonki.ru</a><span>{t("resources.t41")}</span></div>
            <div className="res-link"><a href="https://www.keybr.com/" target="_blank" rel="noopener">Keybr.com</a><span>{t("resources.t42")}</span></div>
          </div>
        </div>

        <div className="res-cat">
          <h3>🛠️ <span>{t("resources.t43")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://code.visualstudio.com/" target="_blank" rel="noopener">VS Code</a><span>{t("resources.t44")}</span></div>
            <div className="res-link"><a href="https://developer.chrome.com/docs/devtools" target="_blank" rel="noopener">Chrome DevTools</a><span>{t("resources.t45")}</span></div>
            <div className="res-link"><a href="https://github.com/public-apis/public-apis" target="_blank" rel="noopener">Public APIs</a><span>{t("resources.t46")}</span></div>
            <div className="res-link"><a href="https://getbootstrap.com/" target="_blank" rel="noopener">Bootstrap</a><span>{t("resources.t47")}</span></div>
          </div>
        </div>

      </div>
      </section>
    </>
  );
}
