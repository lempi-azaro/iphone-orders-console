// Applies saved display preferences as early as possible, before the
// rest of the page's own script runs. This has to live in its own
// external file (not an inline <script> in <head>) because the site's
// Content-Security-Policy intentionally does not allow 'unsafe-inline'
// scripts — inline scripts are a common XSS vector, so CSP blocks them
// by default unless explicitly allowed. An external file loaded from
// the same origin satisfies script-src 'self' without weakening that
// protection.
document.documentElement.dataset.theme = localStorage.getItem("theme") || "light";
if (localStorage.getItem("sidebarCollapsed") === "true") {
  document.documentElement.classList.add("sidebar-collapsed");
}
