// js/dispatch.js

console.log("dispatch.js loaded");

const logoutBtn = document.getElementById("logoutBtn");
const assignResponderForm = document.getElementById("assignResponderForm");
const incidentSelect = document.getElementById("incidentSelect");
const dispatchIncidentList = document.getElementById("dispatchIncidentList");
const dispatchMessage = document.getElementById("dispatchMessage");

function showDispatchMessage(text, type = "success") {
  if (!dispatchMessage) return;

  dispatchMessage.textContent = text;
  dispatchMessage.classList.add("show");

  if (type === "error") {
    dispatchMessage.style.color = "#ff5b6e";
  } else {
    dispatchMessage.style.color = "#4ade80";
  }
}

async function protectDispatchDashboard() {
  const {
    data: { user },
    error
  } = await window.supabaseClient.auth.getUser();

  if (error || !user) {
    window.location.href = "signin.html";
    return;
  }

  const role = user.user_metadata?.role;

  if (role !== "admin" && role !== "dispatcher") {
    window.location.href = "dashboard.html";
    return;
  }

  const dispatcherName = document.getElementById("dispatcherName");
  const avatar = document.querySelector(".avatar");

  const fullName = user.user_metadata?.full_name || "Dispatcher";

  if (dispatcherName) dispatcherName.textContent = fullName;
  if (avatar) avatar.textContent = fullName.charAt(0).toUpperCase();
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    await window.supabaseClient.auth.signOut();
    window.location.href = "signin.html";
  });
}

async function loadDispatchIncidents() {
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

  if (incidentSelect) {
    incidentSelect.innerHTML = `<option value="">Select Incident</option>`;

    data.forEach((incident) => {
      const option = document.createElement("option");

      option.value = incident.id;
      option.textContent = `${incident.tracking_id} — ${incident.title}`;

      incidentSelect.appendChild(option);
    });
  }

  if (dispatchIncidentList) {
    dispatchIncidentList.innerHTML = "";

    if (data.length === 0) {
      dispatchIncidentList.innerHTML = `
        <p class="empty-state">No incidents available for dispatch.</p>
      `;
      return;
    }

    data.forEach((incident) => {
      const card = document.createElement("div");

      card.classList.add("incident-item");

      card.innerHTML = `
        <div>
          <h3>${incident.title}</h3>
          <p>${incident.location} • ${incident.priority} Priority</p>
          <p>Tracking ID: ${incident.tracking_id}</p>
          <p>Responder Type: ${incident.responder_type || "Not assigned"}</p>
          <p>Assigned Unit: ${incident.assigned_unit || "Not assigned"}</p>
          <p>Status: ${incident.responder_status || "Pending Dispatch"}</p>
        </div>

        <span class="status danger">
          ${incident.status || "Active"}
        </span>
      `;

      dispatchIncidentList.appendChild(card);
    });
  }
}

if (assignResponderForm) {
  assignResponderForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const incidentId = document.getElementById("incidentSelect").value;
    const responderType = document.getElementById("responderType").value;
    const assignedUnit = document.getElementById("assignedUnit").value.trim();
    const responderStatus = document.getElementById("responderStatus").value;

    const submitButton = assignResponderForm.querySelector("button");

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
      console.error(error);

      showDispatchMessage("Unable to assign responders.", "error");

      submitButton.disabled = false;
      submitButton.textContent = "Assign Responders";

      return;
    }

    showDispatchMessage("Responders assigned successfully.");

    assignResponderForm.reset();

    submitButton.disabled = false;
    submitButton.textContent = "Assign Responders";

    loadDispatchIncidents();
  });
}

protectDispatchDashboard();
loadDispatchIncidents();