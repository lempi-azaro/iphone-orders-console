// Shared across every page. apply-prefs.js already applied both saved
// preferences before this runs; this module wires up the two toggle
// buttons and keeps the sidebar chevron pointed the right direction.

const themeBtn = document.getElementById("theme-toggle-btn");
const sidebarBtn = document.getElementById("sidebar-toggle-btn");
const sidebarIcon = document.getElementById("sidebar-toggle-icon");

function updateSidebarIcon() {
  if (!sidebarIcon) return;
  sidebarIcon.textContent = document.documentElement.classList.contains("sidebar-collapsed") ? "›" : "‹";
}

themeBtn?.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
});

sidebarBtn?.addEventListener("click", () => {
  const collapsed = document.documentElement.classList.toggle("sidebar-collapsed");
  localStorage.setItem("sidebarCollapsed", collapsed ? "true" : "false");
  updateSidebarIcon();
});

updateSidebarIcon();
