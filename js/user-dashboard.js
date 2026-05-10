// js/user-dashboard.js

console.log("user-dashboard.js loaded");

async function protectUserDashboard() {
  const {
    data: { user },
    error
  } = await window.supabaseClient.auth.getUser();

  console.log("Current user:", user);

  if (error || !user) {
    window.location.href = "signin.html";
    return;
  }

  const role = user.user_metadata?.role;

  // Prevent admins from using regular dashboard
  if (role === "admin") {
    window.location.href = "admin-dashboard.html";
    return;
  }

  console.log("User dashboard access granted");
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    await window.supabaseClient.auth.signOut();

    window.location.href = "signin.html";
  });
}

protectUserDashboard();