// js/responder-dashboard.js

console.log("responder-dashboard.js loaded");

const logoutBtn = document.getElementById("logoutBtn");
const responderIncidentList = document.getElementById("responderIncidentList");
const responderMessage = document.getElementById("responderMessage");
const responderTypeDisplay = document.getElementById("responderTypeDisplay");
const requestCount = document.getElementById("requestCount");

let currentUser = null;
let currentResponderType = null;
let realtimeChannel = null;

function showResponderMessage(message, type = "success") {
  if (!responderMessage) return;

  responderMessage.textContent = message;
  responderMessage.classList.add("show");
  responderMessage.style.color = type === "error" ? "#ff5b6e" : "#4ade80";
}

function clearResponderMessage() {
  if (!responderMessage) return;

  responderMessage.textContent = "";
  responderMessage.classList.remove("show");
}

async function protectResponderDashboard() {
  const {
    data: { user },
    error
  } = await window.supabaseClient.auth.getUser();

  if (error || !user) {
    window.location.href = "signin.html";
    return;
  }

  const role = user.user_metadata?.role?.toLowerCase();

  if (role !== "responder") {
    window.location.href = "dashboard.html";
    return;
  }

  currentUser = user;
  currentResponderType = user.user_metadata?.responder_type;

  if (!currentResponderType) {
    showResponderMessage("Responder type missing on account.", "error");
    return;
  }

  if (responderTypeDisplay) {
    responderTypeDisplay.textContent = currentResponderType;
  }

  await loadResponderIncidents();
  subscribeToResponderIncidents();
}

async function loadResponderIncidents() {
  if (!currentResponderType || !responderIncidentList) return;

  const { data, error } = await window.supabaseClient
    .from("incidents")
    .select("*")
    .eq("responder_type", currentResponderType)
    .neq("status", "Completed")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error("Responder incident load error:", error);
    showResponderMessage("Unable to load incidents.", "error");
    return;
  }

  renderResponderIncidents(data || []);
}

function renderResponderIncidents(incidents) {
  responderIncidentList.innerHTML = "";

  if (requestCount) {
    requestCount.textContent = `${incidents.length} Request${incidents.length === 1 ? "" : "s"}`;
  }

  if (incidents.length === 0) {
    responderIncidentList.innerHTML = `
      <p class="empty-state">
        No active incidents currently assigned to your responder type.
      </p>
    `;
    return;
  }

  incidents.forEach((incident) => {
    const card = document.createElement("div");
    card.classList.add("incident-item");

    const decision = incident.responder_decision || "Pending";
    const acceptedBy = incident.accepted_by_name || "Not accepted";

    card.innerHTML = `
      <div>
        <h3>${incident.tracking_id || "Missing ID"} — ${incident.title}</h3>
        <p>${incident.location} • ${incident.priority} Priority</p>
        <p>Details: ${incident.details || "No details provided"}</p>
        <p>Assigned Unit: ${incident.assigned_unit || "Not assigned"}</p>
        <p>Responder Status: ${incident.responder_status || "Pending Dispatch"}</p>
        <p>Decision: ${decision}</p>
        <p>Accepted By: ${acceptedBy}</p>
      </div>

      <div class="incident-actions">
        <span class="status ${decision === "Accepted" ? "stable" : "danger"}">
          ${decision}
        </span>

        <button
          type="button"
          class="small-btn complete-btn"
          data-action="accept"
          data-id="${incident.id}"
        >
          Accept
        </button>

        <button
          type="button"
          class="small-btn delete-btn"
          data-action="decline"
          data-id="${incident.id}"
        >
          Decline
        </button>

        <button
          type="button"
          class="small-btn"
          data-action="onscene"
          data-id="${incident.id}"
        >
          On Scene
        </button>

        <button
          type="button"
          class="small-btn complete-btn"
          data-action="resolved"
          data-id="${incident.id}"
        >
          Resolved
        </button>
      </div>
    `;

    responderIncidentList.appendChild(card);
  });
}

async function acceptIncident(incidentId) {
  clearResponderMessage();

  const fullName = currentUser.user_metadata?.full_name || "Responder";

  const { error } = await window.supabaseClient
    .from("incidents")
    .update({
      responder_decision: "Accepted",
      accepted_by: currentUser.id,
      accepted_by_name: fullName,
      responder_status: "En Route"
    })
    .eq("id", incidentId);

  if (error) {
    console.error("Accept incident error:", error);
    showResponderMessage("Unable to accept incident.", "error");
    return;
  }

  showResponderMessage("Incident accepted. Status set to En Route.");
  await loadResponderIncidents();
}

async function declineIncident(incidentId) {
  clearResponderMessage();

  const fullName = currentUser.user_metadata?.full_name || "Responder";

  const { error } = await window.supabaseClient
    .from("incidents")
    .update({
      responder_decision: "Declined",
      accepted_by: currentUser.id,
      accepted_by_name: fullName,
      responder_status: "Pending Dispatch"
    })
    .eq("id", incidentId);

  if (error) {
    console.error("Decline incident error:", error);
    showResponderMessage("Unable to decline incident.", "error");
    return;
  }

  showResponderMessage("Incident declined.");
  await loadResponderIncidents();
}

async function updateResponderStatus(incidentId, status) {
  clearResponderMessage();

  const payload = {
    responder_status: status
  };

  if (status === "Resolved") {
    payload.status = "Completed";
    payload.responder_decision = "Accepted";
  }

  const { error } = await window.supabaseClient
    .from("incidents")
    .update(payload)
    .eq("id", incidentId);

  if (error) {
    console.error("Status update error:", error);
    showResponderMessage("Unable to update status.", "error");
    return;
  }

  showResponderMessage(`Status updated to ${status}.`);
  await loadResponderIncidents();
}

function subscribeToResponderIncidents() {
  if (realtimeChannel) {
    window.supabaseClient.removeChannel(realtimeChannel);
  }

  realtimeChannel = window.supabaseClient
    .channel(`responder-${currentResponderType}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "incidents"
      },
      () => {
        loadResponderIncidents();
      }
    )
    .subscribe();
}

document.addEventListener("click", async function (e) {
  const button = e.target.closest("[data-action]");

  if (!button) return;

  const action = button.dataset.action;
  const incidentId = button.dataset.id;

  if (action === "accept") {
    await acceptIncident(incidentId);
  }

  if (action === "decline") {
    await declineIncident(incidentId);
  }

  if (action === "onscene") {
    await updateResponderStatus(incidentId, "On Scene");
  }

  if (action === "resolved") {
    await updateResponderStatus(incidentId, "Resolved");
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
    }

    await window.supabaseClient.auth.signOut();
    window.location.href = "signin.html";
  });
}

protectResponderDashboard();