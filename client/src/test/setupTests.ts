import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library's auto-cleanup-after-each-test only self-registers when it
// finds a *global* `afterEach` (i.e. `test.globals: true`); this project
// imports test functions explicitly instead, so register it by hand —
// otherwise each test in a file renders into the same jsdom document and
// later tests see leftover elements from earlier ones.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement scrollIntoView; several components call it
// defensively (e.g. FormError scrolling a new error into view), which would
// otherwise throw in every test that mounts them.
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
