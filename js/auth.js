// js/auth.js

console.log("auth.js loaded");

const signupForm = document.getElementById("signupForm");
const signinForm = document.getElementById("signinForm");
const adminSignupForm = document.getElementById("adminSignupForm");
const successMessage = document.getElementById("successMessage");

function showMessage(messageElement, text) {
  if (!messageElement) return;
  messageElement.textContent = text;
  messageElement.classList.add("show");
}

function clearMessage(messageElement) {
  if (!messageElement) return;
  messageElement.textContent = "";
  messageElement.classList.remove("show");
}

// Detect email confirmation redirect
const urlHash = window.location.hash;

if (successMessage && urlHash.includes("access_token")) {
  successMessage.textContent =
    "Email confirmation successful. You may now sign in.";

  successMessage.classList.add("show");

  history.replaceState(null, null, window.location.pathname);
}

// Regular User Sign Up
if (signupForm) {
  signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    const submitButton = signupForm.querySelector("button");
    const formMessage = document.getElementById("formMessage");

    clearMessage(formMessage);

    submitButton.disabled = true;
    submitButton.textContent = "Creating Account...";

    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "user"
        }
      }
    });

    console.log("Signup response:", data, error);

    if (error) {
      showMessage(formMessage, error.message);
      submitButton.disabled = false;
      submitButton.textContent = "Sign Up";
      return;
    }

    showMessage(
      formMessage,
      "Account created. Please check your email to confirm your account."
    );

    submitButton.disabled = false;
    submitButton.textContent = "Sign Up";
  });
}

// Admin / Dispatcher Sign Up
if (adminSignupForm) {
  adminSignupForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fullName = document.getElementById("adminFullName").value.trim();
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    const companyKey = document.getElementById("companyKey").value.trim();

    const submitButton = adminSignupForm.querySelector("button");
    const formMessage = document.getElementById("formMessage");

    clearMessage(formMessage);

    submitButton.disabled = true;
    submitButton.textContent = "Checking Key...";

    const { data: keyData, error: keyError } = await window.supabaseClient
      .from("admin_keys")
      .select("*")
      .eq("key", companyKey)
      .eq("is_active", true)
      .single();

    console.log("Company key response:", keyData, keyError);

    if (
      keyError ||
      !keyData ||
      Number(keyData.used_count) >= Number(keyData.max_uses)
    ) {
      showMessage(formMessage, "Invalid, inactive, or expired company key.");
      submitButton.disabled = false;
      submitButton.textContent = "Create Admin Account";
      return;
    }

    const accountRole = (keyData.role || "admin").toLowerCase();

    submitButton.textContent =
      accountRole === "dispatcher"
        ? "Creating Dispatcher..."
        : "Creating Admin...";

    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: accountRole,
          company_name: keyData.company_name,
          company_key_id: keyData.id
        }
      }
    });

    console.log("Company account signup response:", data, error);

    if (error) {
      showMessage(formMessage, error.message);
      submitButton.disabled = false;
      submitButton.textContent = "Create Admin Account";
      return;
    }

    await window.supabaseClient
      .from("admin_keys")
      .update({
        used_count: Number(keyData.used_count) + 1
      })
      .eq("id", keyData.id);

    showMessage(
      formMessage,
      "Account created. Please check your email to confirm your account."
    );

    submitButton.disabled = false;
    submitButton.textContent = "Create Admin Account";
  });
}

// Sign In
if (signinForm) {
  signinForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("signinEmail").value.trim();
    const password = document.getElementById("signinPassword").value;

    const submitButton = signinForm.querySelector("button");
    const formMessage = document.getElementById("formMessage");

    clearMessage(formMessage);

    submitButton.disabled = true;
    submitButton.textContent = "Signing In...";

    const { data, error } =
      await window.supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    console.log("Signin response:", data, error);

    if (error) {
      showMessage(formMessage, error.message);
      submitButton.disabled = false;
      submitButton.textContent = "Sign In";
      return;
    }

    const {
      data: { user },
      error: userError
    } = await window.supabaseClient.auth.getUser();

    if (userError || !user) {
      showMessage(formMessage, "Unable to verify account. Please try again.");
      submitButton.disabled = false;
      submitButton.textContent = "Sign In";
      return;
    }

    console.log("SIGNED IN USER:", user);
    console.log("USER METADATA:", user.user_metadata);
    console.log("USER ROLE:", user.user_metadata?.role);

    if (!user.email_confirmed_at) {
      showMessage(formMessage, "Please verify your email before signing in.");

      await window.supabaseClient.auth.signOut();

      submitButton.disabled = false;
      submitButton.textContent = "Sign In";

      return;
    }

    const role = user.user_metadata?.role?.toLowerCase();

    if (role === "dispatcher") {
      window.location.href = "dispatch-dashboard.html";
      return;
    }

    if (role === "admin") {
      window.location.href = "admin-dashboard.html";
      return;
    }

    window.location.href = "dashboard.html";
  });
}