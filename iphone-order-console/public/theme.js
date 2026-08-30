// Shared across every page. The inline <script> in each page's <head>
// already applies both saved preferences before paint; this module just
// wires up the two toggle buttons so they behave the same way on every
// page, not only on whichever page you clicked them from.

const themeBtn = document.getElementById("theme-toggle-btn");
const sidebarBtn = document.getElementById("sidebar-toggle-btn");

themeBtn?.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
});

sidebarBtn?.addEventListener("click", () => {
  const collapsed = document.documentElement.classList.toggle("sidebar-collapsed");
  localStorage.setItem("sidebarCollapsed", collapsed ? "true" : "false");
});
