// js/auth.js

console.log("auth.js loaded");

const signupForm = document.getElementById("signupForm");
const signinForm = document.getElementById("signinForm");
const adminSignupForm = document.getElementById("adminSignupForm");
const responderSignupForm = document.getElementById("responderSignupForm");
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

    const { error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "user"
        }
      }
    });

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

// Admin Sign Up
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

    submitButton.textContent = "Creating Admin...";

    const { error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "admin",
          company_name: keyData.company_name,
          company_key_id: keyData.id
        }
      }
    });

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
      "Admin account created. Please check your email to confirm your account."
    );

    submitButton.disabled = false;
    submitButton.textContent = "Create Admin Account";
  });
}

// Responder Sign Up
if (responderSignupForm) {
  responderSignupForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fullName = document.getElementById("responderFullName").value.trim();
    const email = document.getElementById("responderEmail").value.trim();
    const password = document.getElementById("responderPassword").value;
    const responderType = document.getElementById("responderTypeSignup").value;
    const companyKey = document.getElementById("responderCompanyKey").value.trim();

    const submitButton = responderSignupForm.querySelector("button");
    const formMessage = document.getElementById("formMessage");

    clearMessage(formMessage);

    submitButton.disabled = true;
    submitButton.textContent = "Checking Key...";

    const { data: keyData, error: keyError } = await window.supabaseClient
      .from("admin_keys")
      .select("*")
      .eq("key", companyKey)
      .eq("is_active", true)
      .eq("role", "responder")
      .single();

    if (
      keyError ||
      !keyData ||
      Number(keyData.used_count) >= Number(keyData.max_uses)
    ) {
      showMessage(formMessage, "Invalid, inactive, or expired responder key.");
      submitButton.disabled = false;
      submitButton.textContent = "Create Responder Account";
      return;
    }

    submitButton.textContent = "Creating Responder...";

    const { error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "responder",
          responder_type: responderType,
          company_name: keyData.company_name,
          company_key_id: keyData.id
        }
      }
    });

    if (error) {
      showMessage(formMessage, error.message);
      submitButton.disabled = false;
      submitButton.textContent = "Create Responder Account";
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
      "Responder account created. Please check your email to confirm your account."
    );

    submitButton.disabled = false;
    submitButton.textContent = "Create Responder Account";
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

    const { error } =
      await window.supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      showMessage(formMessage, error.message);
      submitButton.disabled = false;
      submitButton.textContent = "Sign In";
      return;
    }

    const {
      data: { user }
    } = await window.supabaseClient.auth.getUser();

    if (!user.email_confirmed_at) {
      showMessage(formMessage, "Please verify your email before signing in.");

      await window.supabaseClient.auth.signOut();

      submitButton.disabled = false;
      submitButton.textContent = "Sign In";

      return;
    }

    const role = user.user_metadata?.role?.toLowerCase();

    if (role === "admin") {
      window.location.href = "admin-dashboard.html";
      return;
    }

    if (role === "responder") {
      window.location.href = "responder-dashboard.html";
      return;
    }

    window.location.href = "dashboard.html";
  });
}