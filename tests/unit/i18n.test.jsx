import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import kg from "../../src/i18n/kg.json";
import ru from "../../src/i18n/ru.json";
import { I18nProvider, useI18n } from "../../src/i18n/I18nContext";
import LanguageSelect from "../../src/components/LanguageSelect";

const flatKeys = (o, p = "") =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flatKeys(v, `${p}${k}.`) : [`${p}${k}`]));
const get = (o, k) => k.split(".").reduce((n, part) => n?.[part], o);
const sources = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.jsx?$/.test(f) ? [p] : [];
  });

describe("translations", () => {
  it("Кыргызча and Русский have exactly the same keys", () => {
    expect(flatKeys(ru).sort()).toEqual(flatKeys(kg).sort());
  });
  it("every static t(\"…\") key used in the code exists", () => {
    const missing = [];
    for (const file of sources("src")) {
      for (const [, key] of readFileSync(file, "utf8").matchAll(/\bt\(\s*"([^"]+)"/g)) {
        if (get(kg, key) === undefined) missing.push(`${key} (${file})`);
      }
    }
    expect(missing).toEqual([]);
  });
  it("no translation is empty", () => {
    for (const dict of [kg, ru]) for (const k of flatKeys(dict)) expect(get(dict, k), k).not.toBe("");
  });
});

function Probe() {
  const { t } = useI18n();
  return <p data-testid="probe">{t("auth.login")}</p>;
}
const mount = () =>
  render(
    <I18nProvider>
      <LanguageSelect />
      <Probe />
    </I18nProvider>
  );

describe("language selection", () => {
  it("offers exactly Кыргызча and Русский", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: kg.common.language }));
    const options = screen.getAllByRole("option").map((o) => o.textContent.replace("✓", "").trim());
    expect(options).toEqual(["Кыргызча", "Русский"]);
  });

  it("switching applies to the UI, the <html lang> and survives a reload", () => {
    const first = mount();
    expect(screen.getByTestId("probe").textContent).toBe(kg.auth.login);
    fireEvent.click(screen.getByRole("button", { name: kg.common.language }));
    act(() => fireEvent.click(screen.getByText("Русский")));
    expect(screen.getByTestId("probe").textContent).toBe(ru.auth.login);
    expect(document.documentElement.lang).toBe("ru");
    expect(localStorage.getItem("site-lang")).toBe("ru");
    first.unmount();
    mount(); // "reload"
    expect(screen.getByTestId("probe").textContent).toBe(ru.auth.login);
  });

  it("ignores a corrupted stored value and falls back to Кыргызча", () => {
    localStorage.setItem("site-lang", "xx");
    mount();
    expect(screen.getByTestId("probe").textContent).toBe(kg.auth.login);
  });

  it("closes the menu with Escape", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: kg.common.language }));
    expect(screen.queryByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
