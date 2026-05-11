// js/dashboard.js

console.log("dashboard.js loaded");

const logoutBtn = document.getElementById("logoutBtn");
const dispatchForm = document.getElementById("dispatchForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("formTitle");
const submitIncidentBtn = document.getElementById("submitIncidentBtn");
const incidentMessage = document.getElementById("incidentMessage");

let incidentsCache = [];

function showIncidentMessage(message, type = "success") {
  if (!incidentMessage) return;

  incidentMessage.textContent = message;
  incidentMessage.classList.add("show");
  incidentMessage.style.color = type === "error" ? "#ff5b6e" : "#4ade80";
}

function clearIncidentMessage() {
  if (!incidentMessage) return;

  incidentMessage.textContent = "";
  incidentMessage.classList.remove("show");
}

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

function resetIncidentForm() {
  dispatchForm.reset();

  document.getElementById("editingIncidentId").value = "";

  formTitle.textContent = "Create Incident";
  submitIncidentBtn.textContent = "Create Incident";

  if (cancelEditBtn) {
    cancelEditBtn.style.display = "none";
  }

  clearIncidentMessage();
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", resetIncidentForm);
}

if (dispatchForm) {
  dispatchForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    clearIncidentMessage();

    const editingIncidentId = document.getElementById("editingIncidentId").value;

    const title = document.getElementById("incidentTitle").value.trim();
    const location = document.getElementById("incidentLocation").value.trim();
    const customerEmail = document.getElementById("customerEmail").value.trim();
    const priority = document.getElementById("incidentPriority").value;
    const responderType = document.getElementById("responderType").value;
    const assignedUnit = document.getElementById("assignedUnit").value.trim();
    const responderStatus = document.getElementById("responderStatus").value;
    const details = document.getElementById("incidentDetails").value.trim();

    const incidentPayload = {
      title,
      location,
      priority,
      details,
      customer_email: customerEmail,
      responder_type: responderType,
      assigned_unit: assignedUnit,
      responder_status: responderStatus
    };

    submitIncidentBtn.disabled = true;

    if (editingIncidentId) {
      submitIncidentBtn.textContent = "Saving Changes...";

      const { error } = await window.supabaseClient
        .from("incidents")
        .update(incidentPayload)
        .eq("id", editingIncidentId);

      if (error) {
        console.error("Update incident error:", error);

        showIncidentMessage("Unable to update incident.", "error");

        submitIncidentBtn.disabled = false;
        submitIncidentBtn.textContent = "Save Changes";

        return;
      }

      showIncidentMessage("Incident updated successfully.");

      submitIncidentBtn.disabled = false;

      resetIncidentForm();

      await loadIncidents();

      return;
    }

    submitIncidentBtn.textContent = "Creating Incident...";

    const { data, error } = await window.supabaseClient
      .from("incidents")
      .insert([incidentPayload])
      .select()
      .single();

    if (error) {
      console.error("Create incident error:", error);

      showIncidentMessage("Unable to create incident.", "error");

      submitIncidentBtn.disabled = false;
      submitIncidentBtn.textContent = "Create Incident";

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

Responder Type: ${data.responder_type || "Pending Assignment"}
Assigned Unit: ${data.assigned_unit || "Pending Assignment"}
Responder Status: ${data.responder_status || "Pending Dispatch"}

You can track your emergency status here:
${trackingLink}

Firestar Emergencies`;

    dispatchForm.reset();

    submitIncidentBtn.disabled = false;
    submitIncidentBtn.textContent = "Create Incident";

    showIncidentMessage("Incident created successfully.");

    await loadIncidents();

    window.location.href =
      `mailto:${data.customer_email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  });
}

function editIncident(incidentId) {
  const incident = incidentsCache.find((item) => item.id === incidentId);

  if (!incident) return;

  document.getElementById("editingIncidentId").value = incident.id;
  document.getElementById("incidentTitle").value = incident.title || "";
  document.getElementById("incidentLocation").value = incident.location || "";
  document.getElementById("customerEmail").value = incident.customer_email || "";
  document.getElementById("incidentPriority").value = incident.priority || "";
  document.getElementById("responderType").value = incident.responder_type || "";
  document.getElementById("assignedUnit").value = incident.assigned_unit || "";
  document.getElementById("responderStatus").value =
    incident.responder_status || "Pending Dispatch";
  document.getElementById("incidentDetails").value = incident.details || "";

  formTitle.textContent = "Edit Incident";
  submitIncidentBtn.textContent = "Save Changes";

  if (cancelEditBtn) {
    cancelEditBtn.style.display = "inline-block";
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function completeIncident(incidentId) {
  const { error } = await window.supabaseClient
    .from("incidents")
    .update({
      status: "Completed",
      responder_status: "Resolved"
    })
    .eq("id", incidentId);

  if (error) {
    console.error("Complete incident error:", error);
    return;
  }

  await loadIncidents();
}

async function deleteIncident(incidentId) {
  const confirmDelete = confirm(
    "Are you sure you want to delete this incident? This cannot be undone."
  );

  if (!confirmDelete) return;

  const { error } = await window.supabaseClient
    .from("incidents")
    .delete()
    .eq("id", incidentId);

  if (error) {
    console.error("Delete incident error:", error);
    return;
  }

  await loadIncidents();
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
    console.error("Incident load error:", error);
    return;
  }

  incidentsCache = data || [];

  const activeIncidents = incidentsCache.filter(
    (incident) => incident.status !== "Completed"
  );

  const highPriorityIncidents = incidentsCache.filter(
    (incident) =>
      incident.status !== "Completed" &&
      (incident.priority === "High" || incident.priority === "Critical")
  );

  if (activeIncidentCount) {
    activeIncidentCount.textContent = activeIncidents.length;
  }

  if (highPriorityCount) {
    highPriorityCount.textContent = highPriorityIncidents.length;
  }

  incidentList.innerHTML = "";

  if (incidentsCache.length === 0) {
    incidentList.innerHTML = `
      <p class="empty-state">
        No incidents have been created yet.
      </p>
    `;
    return;
  }

  incidentsCache.forEach((incident) => {
    const incidentCard = document.createElement("div");

    incidentCard.classList.add("incident-item");

    const isCompleted = incident.status === "Completed";

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

      <div class="incident-actions">
        <span class="status ${isCompleted ? "stable" : "danger"}">
          ${incident.status || "Active"}
        </span>

        <button type="button" class="small-btn" data-action="edit" data-id="${incident.id}">
          Edit
        </button>

        <button type="button" class="small-btn complete-btn" data-action="complete" data-id="${incident.id}">
          Complete
        </button>

        <button type="button" class="small-btn delete-btn" data-action="delete" data-id="${incident.id}">
          Delete
        </button>
      </div>
    `;

    incidentList.appendChild(incidentCard);
  });
}

document.addEventListener("click", function (e) {
  const button = e.target.closest("[data-action]");

  if (!button) return;

  const action = button.dataset.action;
  const incidentId = button.dataset.id;

  if (action === "edit") {
    editIncident(incidentId);
  }

  if (action === "complete") {
    completeIncident(incidentId);
  }

  if (action === "delete") {
    deleteIncident(incidentId);
  }
});

protectAdminDashboard();
loadIncidents();