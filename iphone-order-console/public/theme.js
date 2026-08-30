// Shared across every page. The inline <script> in each page's <head>
// already applies the saved theme before paint; this module just wires
// up the toggle button in the sidebar footer so it works the same way
// on every page, not only from Settings.
const btn = document.getElementById("theme-toggle-btn");

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function updateLabel() {
  btn.textContent = currentTheme() === "dark" ? "Switch To Light Mode" : "Switch To Dark Mode";
}

btn.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  updateLabel();
});

updateLabel();
