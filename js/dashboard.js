// js/dashboard.js

console.log("dashboard.js loaded");

async function protectAdminDashboard() {
  const {
    data: { user },
    error
  } = await window.supabaseClient.auth.getUser();

  if (error || !user) {
    window.location.href = "signin.html";
    return;
  }

  const role = user.user_metadata?.role;

  if (role !== "admin") {
    window.location.href = "dashboard.html";
    return;
  }

  const adminName = document.getElementById("adminName");
  const avatar = document.querySelector(".avatar");

  const fullName = user.user_metadata?.full_name || "Admin";

  if (adminName) adminName.textContent = fullName;
  if (avatar) avatar.textContent = fullName.charAt(0).toUpperCase();
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    await window.supabaseClient.auth.signOut();
    window.location.href = "signin.html";
  });
}

const dispatchForm = document.getElementById("dispatchForm");

if (dispatchForm) {
  dispatchForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const title = document.getElementById("incidentTitle").value.trim();
    const location = document.getElementById("incidentLocation").value.trim();
    const customerEmail = document.getElementById("customerEmail").value.trim();
    const priority = document.getElementById("incidentPriority").value;
    const details = document.getElementById("incidentDetails").value.trim();

    const submitButton = dispatchForm.querySelector("button");

    submitButton.disabled = true;
    submitButton.textContent = "Creating Incident...";

    const { data, error } = await window.supabaseClient
      .from("incidents")
      .insert([
        {
          title,
          location,
          priority,
          details,
          customer_email: customerEmail
        }
      ])
      .select()
      .single();

    if (error) {
      console.error(error);

      submitButton.disabled = false;
      submitButton.textContent = "Create Incident";

      return;
    }

    const trackingLink =
      `${window.location.origin}/dashboard.html?tracking=${data.tracking_id}`;

    const emailSubject =
      `Firestar Emergencies Incident Tracking ID: ${data.tracking_id}`;

    const emailBody =
      `Hello,

Your emergency incident has been created.

Incident Tracking ID: ${data.tracking_id}

You can track your emergency status here:
${trackingLink}

Firestar Emergencies`;

    dispatchForm.reset();

    submitButton.disabled = false;
    submitButton.textContent = "Create Incident";

    loadIncidents();

    window.location.href =
      `mailto:${data.customer_email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  });
}

async function loadIncidents() {
  const incidentList = document.querySelector(".incident-list");
  const activeIncidentCount = document.getElementById("activeIncidentCount");
  const highPriorityCount = document.getElementById("highPriorityCount");

  if (!incidentList) return;

  const { data, error } = await window.supabaseClient
    .from("incidents")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error(error);
    return;
  }

  const activeIncidents = data.filter(
    (incident) => incident.status === "Active"
  );

  const highPriorityIncidents = data.filter(
    (incident) =>
      incident.priority === "High" ||
      incident.priority === "Critical"
  );

  if (activeIncidentCount) {
    activeIncidentCount.textContent = activeIncidents.length;
  }

  if (highPriorityCount) {
    highPriorityCount.textContent = highPriorityIncidents.length;
  }

  incidentList.innerHTML = "";

  if (data.length === 0) {
    incidentList.innerHTML = `
      <p class="empty-state">
        No incidents have been created yet.
      </p>
    `;
    return;
  }

  data.forEach((incident) => {
    const incidentCard = document.createElement("div");

    incidentCard.classList.add("incident-item");

    incidentCard.innerHTML = `
      <div>
        <h3>${incident.title}</h3>
        <p>${incident.location} • ${incident.priority} Priority</p>
        <p>Tracking ID: ${incident.tracking_id}</p>
        <p>Customer Email: ${incident.customer_email || "Not provided"}</p>
      </div>

      <span class="status danger">
        ${incident.status}
      </span>
    `;

    incidentList.appendChild(incidentCard);
  });
}

protectAdminDashboard();
loadIncidents();