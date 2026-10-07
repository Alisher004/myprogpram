import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { I18nProvider } from "../../src/i18n/I18nContext";

// Renders `ui` at `path` and exposes the current location for redirect assertions
export function LocationProbe() {
  const { pathname } = useLocation();
  return <output data-testid="location">{pathname}</output>;
}

export function renderAt(path, routes) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>{routes}</Routes>
        <LocationProbe />
      </MemoryRouter>
    </I18nProvider>
  );
}

export const anyPath = (element) => <Route path="*" element={element} />;
export { Route };
