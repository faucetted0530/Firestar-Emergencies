// js/dashboard.js

console.log("dashboard.js loaded");

const logoutBtn = document.getElementById("logoutBtn");
const dispatchForm = document.getElementById("dispatchForm");
const assignResponderForm = document.getElementById("assignResponderForm");

async function protectAdminDashboard() {
  const {
    data: { user },
    error
  } = await window.supabaseClient.auth.getUser();

  if (error || !user) {
    window.location.href = "signin.html";
    return;
  }

  const role = user.user_metadata?.role?.toLowerCase();

  console.log("Logged in role:", role);

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

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    await window.supabaseClient.auth.signOut();
    window.location.href = "signin.html";
  });
}

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
      console.error("Create incident error:", error);

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

    await loadIncidents();

    window.location.href =
      `mailto:${data.customer_email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  });
}

if (assignResponderForm) {
  assignResponderForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const incidentId = document.getElementById("incidentSelect").value;
    const responderType = document.getElementById("responderType").value;
    const assignedUnit = document.getElementById("assignedUnit").value.trim();
    const responderStatus = document.getElementById("responderStatus").value;

    const submitButton = assignResponderForm.querySelector("button");
    const dispatchMessage = document.getElementById("dispatchMessage");

    submitButton.disabled = true;
    submitButton.textContent = "Assigning...";

    const { error } = await window.supabaseClient
      .from("incidents")
      .update({
        responder_type: responderType,
        assigned_unit: assignedUnit,
        responder_status: responderStatus
      })
      .eq("id", incidentId);

    if (error) {
      console.error("Assign responder error:", error);

      if (dispatchMessage) {
        dispatchMessage.textContent = "Unable to assign responders.";
        dispatchMessage.classList.add("show");
        dispatchMessage.style.color = "#ff5b6e";
      }

      submitButton.disabled = false;
      submitButton.textContent = "Assign Responders";

      return;
    }

    if (dispatchMessage) {
      dispatchMessage.textContent = "Responders assigned successfully.";
      dispatchMessage.classList.add("show");
      dispatchMessage.style.color = "#4ade80";
    }

    assignResponderForm.reset();

    submitButton.disabled = false;
    submitButton.textContent = "Assign Responders";

    await loadIncidents();
  });
}

async function loadIncidents() {
  const incidentList = document.querySelector(".incident-list");
  const incidentSelect = document.getElementById("incidentSelect");
  const activeIncidentCount = document.getElementById("activeIncidentCount");
  const highPriorityCount = document.getElementById("highPriorityCount");

  console.log("incidentSelect found:", incidentSelect);

  const { data, error } = await window.supabaseClient
    .from("incidents")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  console.log("Loaded incidents:", data, error);

  if (error) {
    console.error("Incident load error:", error);
    return;
  }

  if (incidentSelect) {
    incidentSelect.innerHTML = `<option value="">Select Incident</option>`;

    data.forEach((incident) => {
      const option = document.createElement("option");

      option.value = incident.id;
      option.textContent = `${incident.tracking_id || "No ID"} — ${incident.title}`;

      incidentSelect.appendChild(option);
    });
  }

  if (activeIncidentCount) {
    activeIncidentCount.textContent = data.filter(
      (incident) => incident.status === "Active"
    ).length;
  }

  if (highPriorityCount) {
    highPriorityCount.textContent = data.filter(
      (incident) =>
        incident.priority === "High" ||
        incident.priority === "Critical"
    ).length;
  }

  if (!incidentList) return;

  incidentList.innerHTML = "";

  if (data.length === 0) {
    incidentList.innerHTML = `
      <p class="empty-state">No incidents have been created yet.</p>
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
        <p>Tracking ID: ${incident.tracking_id || "Missing"}</p>
        <p>Customer Email: ${incident.customer_email || "Not provided"}</p>
        <p>Responder Type: ${incident.responder_type || "Not assigned"}</p>
        <p>Assigned Unit: ${incident.assigned_unit || "Not assigned"}</p>
        <p>Responder Status: ${incident.responder_status || "Pending Dispatch"}</p>
      </div>

      <span class="status danger">
        ${incident.status || "Active"}
      </span>
    `;

    incidentList.appendChild(incidentCard);
  });
}

protectAdminDashboard();
loadIncidents();