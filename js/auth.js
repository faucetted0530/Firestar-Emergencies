// js/auth.js

console.log("auth.js loaded");

const signupForm = document.getElementById("signupForm");
const signinForm = document.getElementById("signinForm");
const adminSignupForm = document.getElementById("adminSignupForm");

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
    submitButton.textContent = "Creating Admin...";

    const { data: keyData, error: keyError } = await window.supabaseClient
      .from("admin_keys")
      .select("*")
      .eq("key", companyKey)
      .eq("is_active", true)
      .single();

    if (keyError || !keyData) {
      showMessage(formMessage, "Invalid company admin key.");

      submitButton.disabled = false;
      submitButton.textContent = "Create Admin Account";

      return;
    }

    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "admin"
        }
      }
    });

    console.log("Admin signup response:", data, error);

    if (error) {
      showMessage(formMessage, error.message);

      submitButton.disabled = false;
      submitButton.textContent = "Create Admin Account";

      return;
    }

    showMessage(
      formMessage,
      "Admin account created. Please check your email to confirm your account."
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

    if (!data.user.email_confirmed_at) {
      showMessage(
        formMessage,
        "Please verify your email before signing in."
      );

      await window.supabaseClient.auth.signOut();

      submitButton.disabled = false;
      submitButton.textContent = "Sign In";

      return;
    }

    const role = data.user.user_metadata?.role;

    if (role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "dashboard.html";
    }
  });
}