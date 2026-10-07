import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";

export default function Career() {
  const { t } = useI18n();

  return (
    <>
      <section className="hero" style={{ padding: "52px 0" }}>
        <div className="container">
          <span className="eyebrow">{t("career.t1")}</span>
          <h1>{t("career.t2")}</h1>
          <p>{t("career.t3")}</p>
        </div>
      </section>

      <section className="tight">
      <div className="container">

        {/* ===== CHECKLIST ===== */}
        <div className="lesson-block" style={{ marginTop: "0" }}>
          <h3>{t("career.t4")}</h3>
          <p>{t("career.t5")}</p>
          <ul className="checklist">
            <li><span className="box"></span><div><span className="ttl">HTML</span><span className="desc">{t("career.t6")}</span></div></li>
            <li><span className="box"></span><div><span className="ttl">CSS</span><span className="desc">{t("career.t7")}</span></div></li>
            <li><span className="box"></span><div><span className="ttl">JavaScript</span><span className="desc">{t("career.t8")}</span></div></li>
            <li><span className="box"></span><div><span className="ttl">Git</span><span className="desc">{t("career.t9")}</span></div></li>
            <li><span className="box"></span><div><span className="ttl">GitHub</span><span className="desc">{t("career.t10")}</span></div></li>
            <li><span className="box"></span><div><span className="ttl">React</span><span className="desc">{t("career.t11")}</span></div></li>
            <li><span className="box"></span><div><span className="ttl">{t("career.t12")}</span><span className="desc">{t("career.t13")}</span></div></li>
            <li><span className="box"></span><div><span className="ttl">Portfolio</span><span className="desc">{t("career.t14")}</span></div></li>
            <li><span className="box"></span><div><span className="ttl">Resume / CV</span><span className="desc">{t("career.t15")}</span></div></li>
            <li><span className="box"></span><div><span className="ttl">{t("career.t16")}</span><span className="desc">{t("career.t17")}</span></div></li>
          </ul>
        </div>

        {/* ===== 1. SKILLS ===== */}
        <div className="section-head" style={{ marginTop: "44px" }}>
          <span className="eyebrow">{t("career.t18")}</span>
          <h2>{t("career.t19")}</h2>
          <p>{t("career.t20")}</p>
        </div>
        <div className="pill-list">
          <span className="pill">HTML</span>
          <span className="pill">CSS</span>
          <span className="pill">Bootstrap</span>
          <span className="pill">JavaScript</span>
          <span className="pill">Git</span>
          <span className="pill">GitHub</span>
          <span className="pill">React</span>
          <span className="pill">Firebase</span>
          <span className="pill">{t("career.t21")}</span>
          <span className="pill">{t("career.t22")}</span>
        </div>

        {/* ===== 2. PORTFOLIO ===== */}
        <div className="section-head" style={{ marginTop: "44px" }}>
          <span className="eyebrow">{t("career.t23")}</span>
          <h2>{t("career.t24")}</h2>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <div className="icon">🧩</div>
            <h3>{t("career.t25")}</h3>
            <p>{t("career.t26")}</p>
          </div>
          <div className="card">
            <div className="icon">✨</div>
            <h3>{t("career.t27")}</h3>
            <p>{t("career.t28")}</p>
          </div>
        </div>
        <div className="pill-list" style={{ marginTop: "22px" }}>
          <span className="pill">{t("career.t29")}</span>
          <span className="pill">{t("career.t30")}</span>
          <span className="pill">{t("career.t31")}</span>
          <span className="pill">{t("career.t32")}</span>
        </div>

        {/* ===== 3. GITHUB ===== */}
        <div className="section-head" style={{ marginTop: "44px" }}>
          <span className="eyebrow">{t("career.t33")}</span>
          <h2>{t("career.t34")}</h2>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <div className="icon">🐙</div>
            <h3>{t("career.t35")}</h3>
            <p>{t("career.t36")}</p>
          </div>
          <div className="card">
            <div className="icon">🧹</div>
            <h3>{t("career.t37")}</h3>
            <p>{t("career.t38")}</p>
          </div>
        </div>

        {/* ===== 4. RESUME ===== */}
        <div className="section-head" style={{ marginTop: "44px" }}>
          <span className="eyebrow">{t("career.t39")}</span>
          <h2>{t("career.t40")}</h2>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <div className="icon">✅</div>
            <h3>{t("career.t41")}</h3>
            <p>{t("career.t42")}</p>
          </div>
          <div className="card">
            <div className="icon">🚫</div>
            <h3>{t("career.t43")}</h3>
            <p>{t("career.t44")}</p>
          </div>
          <div className="card">
            <div className="icon">🌱</div>
            <h3>{t("career.t45")}</h3>
            <p>{t("career.t46")}</p>
          </div>
          <div className="card">
            <div className="icon">🧠</div>
            <h3>{t("career.t47")}</h3>
            <p>{t("career.t48")}</p>
          </div>
        </div>
        <div className="card" style={{ marginTop: "22px" }}>
          <div className="icon">📁</div>
          <h3>{t("career.t49")}</h3>
          <p>{t("career.t50")}</p>
        </div>

        {/* ===== 5. INTERVIEW ===== */}
        <div className="section-head" style={{ marginTop: "44px" }}>
          <span className="eyebrow">{t("career.t51")}</span>
          <h2>{t("career.t52")}</h2>
        </div>
        <div className="card">
          <p>{t("career.t53")}</p>
          <div className="res-links" style={{ marginTop: "14px" }}>
            <div className="res-link"><a href="https://github.com/h5bp/Front-end-Developer-Interview-Questions" target="_blank" rel="noopener">Front-end Interview Questions</a><span>{t("career.t54")}</span></div>
            <div className="res-link"><a href="https://roadmap.sh/frontend" target="_blank" rel="noopener">roadmap.sh</a><span>{t("career.t55")}</span></div>
            <div className="res-link"><a href="https://leetcode.com/" target="_blank" rel="noopener">LeetCode</a><span>{t("career.t56")}</span></div>
          </div>
        </div>

        {/* ===== 6. JOB SEARCH ===== */}
        <div className="section-head" style={{ marginTop: "44px" }}>
          <span className="eyebrow">{t("career.t57")}</span>
          <h2>{t("career.t58")}</h2>
        </div>

        <div className="res-cat">
          <h3>🇰🇬 <span>{t("career.t59")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://dev.kg/" target="_blank" rel="noopener">dev.kg</a><span>{t("career.t60")}</span></div>
            <div className="res-link"><a href="https://career.habr.com/" target="_blank" rel="noopener">Habr Карьера</a><span>{t("career.t61")}</span></div>
            <div className="res-link"><a href="https://hh.kg/" target="_blank" rel="noopener">hh.kg</a><span>{t("career.t62")}</span></div>
            <div className="res-link"><a href="https://job.kg/" target="_blank" rel="noopener">job.kg</a><span>{t("career.t63")}</span></div>
            <div className="res-link"><a href="https://hh.ru/" target="_blank" rel="noopener">hh.ru</a><span>{t("career.t64")}</span></div>
            <div className="res-link"><a href="https://www.linkedin.com/jobs/" target="_blank" rel="noopener">LinkedIn Jobs</a><span>{t("career.t65")}</span></div>
          </div>
        </div>

        <div className="res-cat">
          <h3>🌍 <span>{t("career.t66")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://djinni.co/" target="_blank" rel="noopener">Djinni</a><span>{t("career.t67")}</span></div>
            <div className="res-link"><a href="https://remoteok.com/" target="_blank" rel="noopener">Remote OK</a><span>{t("career.t68")}</span></div>
            <div className="res-link"><a href="https://weworkremotely.com/" target="_blank" rel="noopener">We Work Remotely</a><span>{t("career.t69")}</span></div>
            <div className="res-link"><a href="https://wellfound.com/" target="_blank" rel="noopener">Wellfound</a><span>{t("career.t70")}</span></div>
          </div>
        </div>

        <div className="res-cat">
          <h3>💼 <span>{t("career.t71")}</span></h3>
          <div className="res-links">
            <div className="res-link"><a href="https://www.upwork.com/" target="_blank" rel="noopener">Upwork</a><span>{t("career.t72")}</span></div>
            <div className="res-link"><a href="https://www.toptal.com/" target="_blank" rel="noopener">Toptal</a><span>{t("career.t73")}</span></div>
            <div className="res-link"><a href="https://www.freelancer.com/" target="_blank" rel="noopener">Freelancer.com</a><span>{t("career.t74")}</span></div>
          </div>
        </div>

        {/* ===== HOW THEY CONNECT ===== */}
        <div className="lesson-block" style={{ marginTop: "22px" }}>
          <h3>{t("career.t75")}</h3>
          <p>{t("career.t76")}</p>
        </div>

        <div className="cta" style={{ marginTop: "44px" }}>
          <h2>{t("career.t77")}</h2>
          <p>{t("career.t78")}</p>
          <Link className="btn btn-primary" to="/programma">{t("career.t79")}</Link>
        </div>

      </div>
      </section>
    </>
  );
}
