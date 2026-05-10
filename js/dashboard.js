// js/dashboard.js

console.log("dashboard.js loaded");

async function protectAdminDashboard() {
  const {
    data: { user },
    error
  } = await window.supabaseClient.auth.getUser();

  console.log("Current admin:", user);

  if (error || !user) {
    window.location.href = "signin.html";
    return;
  }

  const role = user.user_metadata?.role;

  // Block non-admin users
  if (role !== "admin") {
    window.location.href = "dashboard.html";
    return;
  }

  const adminName = document.getElementById("adminName");
  const avatar = document.querySelector(".avatar");

  const fullName = user.user_metadata?.full_name || "Admin";

  if (adminName) {
    adminName.textContent = fullName;
  }

  if (avatar) {
    avatar.textContent = fullName.charAt(0).toUpperCase();
  }

  console.log("Admin dashboard access granted");
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    await window.supabaseClient.auth.signOut();

    window.location.href = "signin.html";
  });
}

protectAdminDashboard();