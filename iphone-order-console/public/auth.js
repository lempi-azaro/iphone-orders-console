import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// If already signed in with a valid (non-expired) session, skip login.
const { data: { session } } = await supabase.auth.getSession();
if (session) window.location.href = "dashboard.html";

const form = document.getElementById("login-form");
const errorMsg = document.getElementById("error-msg");
const loginBtn = document.getElementById("login-btn");
const magicBtn = document.getElementById("magic-link-btn");

let turnstileToken = null;
window.onTurnstileOk = (token) => {
  turnstileToken = token;
  loginBtn.disabled = false;
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";

  // Supabase verifies the Turnstile token server-side via a configured
  // CAPTCHA provider on the Auth settings — the token is just forwarded here.
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken: turnstileToken },
  });

  if (error) {
    // Deliberately generic message — never reveal whether the email
    // exists or the password was wrong (prevents account enumeration).
    errorMsg.textContent = "Invalid email or password.";
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign in";
    return;
  }

  window.location.href = "dashboard.html";
});

magicBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  if (!email) {
    errorMsg.textContent = "Enter your email above first.";
    return;
  }
  errorMsg.textContent = "";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/dashboard.html` },
  });
  errorMsg.style.color = "var(--accent)";
  errorMsg.textContent = error
    ? "Could not send link. Try again shortly."
    : "Check your email for a sign-in link (valid once, expires shortly).";
});
