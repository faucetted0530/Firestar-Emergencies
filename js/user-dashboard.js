// js/user-dashboard.js

console.log("user-dashboard.js loaded");

const trackingForm = document.getElementById("trackingForm");
const trackingInput = document.getElementById("trackingInput");
const trackingMessage = document.getElementById("trackingMessage");
const incidentTracker = document.getElementById("incidentTracker");
const logoutBtn = document.getElementById("logoutBtn");

let realtimeChannel = null;
let currentTrackingId = null;

function showTrackingMessage(message, type = "error") {
  if (!trackingMessage) return;

  trackingMessage.textContent = message;
  trackingMessage.classList.add("show");
  trackingMessage.style.color = type === "success" ? "#4ade80" : "#ff5b6e";
}

function clearTrackingMessage() {
  if (!trackingMessage) return;

  trackingMessage.textContent = "";
  trackingMessage.classList.remove("show");
}

async function protectCustomerPortal() {
  const {
    data: { user },
    error
  } = await window.supabaseClient.auth.getUser();

  if (error || !user) {
    window.location.href = "signin.html";
    return;
  }

  const role = user.user_metadata?.role?.toLowerCase();

  if (role === "admin") {
    window.location.href = "admin-dashboard.html";
    return;
  }
}

function displayIncident(incident) {
  if (!incidentTracker) return;

  incidentTracker.style.display = "block";

  document.getElementById("trackingIdDisplay").textContent =
    incident.tracking_id || "Missing";

  document.getElementById("incidentTitleDisplay").textContent =
    incident.title || "Not available";

  document.getElementById("incidentLocationDisplay").textContent =
    incident.location || "Not available";

  document.getElementById("incidentPriorityDisplay").textContent =
    incident.priority || "Not available";

  document.getElementById("responderTypeDisplay").textContent =
    incident.responder_type || "Pending assignment";

  document.getElementById("assignedUnitDisplay").textContent =
    incident.assigned_unit || "Pending assignment";

  document.getElementById("responderStatusDisplay").textContent =
    incident.responder_status || "Pending Dispatch";

  document.getElementById("incidentDetailsDisplay").textContent =
    incident.details || "No additional details available.";

  const statusDisplay = document.getElementById("incidentStatusDisplay");

  statusDisplay.textContent = incident.status || "Active";

  if (incident.status === "Completed") {
    statusDisplay.className = "status stable";
  } else {
    statusDisplay.className = "status danger";
  }
}

async function loadIncidentByTrackingId(trackingId) {
  clearTrackingMessage();

  const cleanTrackingId = trackingId.trim().toUpperCase();

  const { data, error } = await window.supabaseClient
    .from("incidents")
    .select("*")
    .eq("tracking_id", cleanTrackingId)
    .single();

  if (error || !data) {
    console.error("Tracking lookup error:", error);

    showTrackingMessage("No incident found with that tracking ID.");
    incidentTracker.style.display = "none";

    return;
  }

  currentTrackingId = cleanTrackingId;

  displayIncident(data);

  showTrackingMessage("Incident loaded successfully.", "success");

  subscribeToIncident(data.id);
}

function subscribeToIncident(incidentId) {
  if (realtimeChannel) {
    window.supabaseClient.removeChannel(realtimeChannel);
  }

  realtimeChannel = window.supabaseClient
    .channel(`incident-${incidentId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "incidents",
        filter: `id=eq.${incidentId}`
      },
      (payload) => {
        console.log("Realtime incident update:", payload.new);
        displayIncident(payload.new);
      }
    )
    .subscribe();
}

if (trackingForm) {
  trackingForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const trackingId = trackingInput.value;

    await loadIncidentByTrackingId(trackingId);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
    }

    await window.supabaseClient.auth.signOut();
    window.location.href = "signin.html";
  });
}

const urlParams = new URLSearchParams(window.location.search);
const trackingFromUrl = urlParams.get("tracking");

if (trackingFromUrl && trackingInput) {
  trackingInput.value = trackingFromUrl;
  loadIncidentByTrackingId(trackingFromUrl);
}

protectCustomerPortal();