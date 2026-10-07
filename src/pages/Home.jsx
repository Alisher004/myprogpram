import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";

export default function Home() {
  const { t } = useI18n();

  return (
    <>
      <section className="hero">
          <div className="container">
            <span className="eyebrow">{t("home.t1")}</span>
            <h1>{t("home.t2")}</h1>
            <p>{t("home.t3")}</p>

            <div className="hero-stats">
              <div><strong>3</strong><span>{t("home.t4")}</span></div>
              <div><strong>60</strong><span>{t("home.t5")}</span></div>
              <div><strong>120</strong><span>{t("home.t6")}</span></div>
              <div><strong>3+</strong><span>{t("home.t7")}</span></div>
            </div>

            <div className="hero-actions">
              <Link className="btn btn-primary" to="/programma">{t("home.t8")}</Link>
              <Link className="btn btn-outline" to="/resources">{t("home.t9")}</Link>
            </div>
          </div>
        </section>

      <section style={{ background: "var(--surface)" }}>
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">{t("home.t10")}</span>
              <h2>{t("home.t11")}</h2>
              <p>{t("home.t12")}</p>
            </div>

            <div className="grid grid-2">
              <div className="card">
                <div className="icon">💻</div>
                <h3>{t("home.t13")}</h3>
                <p>{t("home.t14")}</p>
              </div>
              <div className="card">
                <div className="icon">🌐</div>
                <h3>{t("home.t15")}</h3>
                <p>{t("home.t16")}</p>
              </div>
              <div className="card">
                <div className="icon">🧑‍💻</div>
                <h3>{t("home.t17")}</h3>
                <p>{t("home.t18")}</p>
              </div>
              <div className="card">
                <div className="icon">🎨</div>
                <h3>{t("home.t19")}</h3>
                <p>{t("home.t20")}</p>
              </div>
              <div className="card">
                <div className="icon">🌍</div>
                <h3>{t("home.t21")}</h3>
                <p>{t("home.t22")}</p>
              </div>
              <div className="card">
                <div className="icon">🗺️</div>
                <h3>{t("home.t23")}</h3>
                <p>{t("home.t24")}</p>
              </div>
            </div>
          </div>
        </section>

      <section style={{ background: "var(--surface)" }}>
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">{t("home.t25")}</span>
              <h2>{t("home.t26")}</h2>
            </div>
            <div className="grid grid-2">
              <div className="card">
                <h3>{t("home.t27")}</h3>
                <p>{t("home.t28")}</p>
              </div>
              <div className="card">
                <h3>{t("home.t29")}</h3>
                <p>{t("home.t30")}</p>
              </div>
              <div className="card">
                <h3>{t("home.t31")}</h3>
                <p>{t("home.t32")}</p>
              </div>
            </div>

            <div className="timeline" style={{ marginTop: "44px" }}>
              <div className="step">
                <span className="pill">{t("home.t33")}</span>
                <h3>{t("home.t34")}</h3>
                <p>{t("home.t35")}</p>
              </div>
              <div className="step">
                <span className="pill">{t("home.t36")}</span>
                <h3>{t("home.t37")}</h3>
                <p>{t("home.t38")}</p>
              </div>
              <div className="step">
                <span className="pill">{t("home.t39")}</span>
                <h3>{t("home.t40")}</h3>
                <p>{t("home.t41")}</p>
              </div>
            </div>
          </div>
        </section>

      <section>
          <div className="container">
            <div className="cta">
              <h2>{t("home.t42")}</h2>
              <p>{t("home.t43")}</p>
              <Link className="btn btn-primary" to="/programma">{t("home.t44")}</Link>
            </div>
          </div>
        </section>
    </>
  );
}
