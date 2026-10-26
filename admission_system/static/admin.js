let token = "";
const loginPanel = document.querySelector("#loginPanel");
const recordsPanel = document.querySelector("#recordsPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const recordsMessage = document.querySelector("#recordsMessage");
const recordsBody = document.querySelector("#recordsBody");
const searchInput = document.querySelector("#searchInput");
const detailDialog = document.querySelector("#detailDialog");

function message(el, text, kind) {
  el.textContent = text;
  el.className = `message ${kind}`;
}
async function api(url, options = {}) {
  const headers = {...(options.headers || {})};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, {...options, headers});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) logout(false);
    throw new Error(data.detail || "Request failed.");
  }
  return data;
}
function logout(show = true) {
  token = "";
  recordsPanel.hidden = true;
  loginPanel.hidden = false;
  if (show) message(loginMessage, "You have been logged out.", "success");
}
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMessage.className = "message";
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({username: document.querySelector("#username").value, password: document.querySelector("#password").value})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Login failed.");
    token = data.token;
    loginPanel.hidden = true;
    recordsPanel.hidden = false;
    await loadRecords();
  } catch (err) { message(loginMessage, err.message, "error"); }
});
async function loadRecords() {
  try {
    const q = searchInput.value.trim();
    const data = await api(`/api/admin/admissions?q=${encodeURIComponent(q)}`);
    document.querySelector("#totalCount").textContent = data.total;
    recordsBody.replaceChildren();
    if (!data.records.length) {
      const row = recordsBody.insertRow(); const cell = row.insertCell();
      cell.colSpan = 7; cell.textContent = "No applications found.";
      return;
    }
    for (const r of data.records) {
      const row = recordsBody.insertRow();
      const values = [r.id, r.name, r.father_name, r.student_mobile, [r.course_3_months, r.course_6_months].filter(Boolean).join(", ") || "—", (r.created_at || "").replace("T", " ").replace("Z", "")];
      values.forEach(v => { const td = row.insertCell(); td.textContent = v ?? "—"; });
      const actionCell = row.insertCell(); actionCell.className = "record-actions";
      const view = document.createElement("button"); view.className = "small-button"; view.textContent = "View";
      view.addEventListener("click", () => showDetails(r.id));
      const del = document.createElement("button"); del.className = "small-button danger"; del.textContent = "Delete";
      del.addEventListener("click", () => deleteRecord(r.id, r.name));
      actionCell.append(view, del);
    }
    recordsMessage.className = "message";
  } catch (err) { message(recordsMessage, err.message, "error"); }
}
async function showDetails(id) {
  try {
    const r = await api(`/api/admin/admissions/${id}`);
    const fields = [
      ["Application number", r.id], ["Applicant name", r.name], ["Father's name", r.father_name],
      ["Date of birth", r.dob_figure], ["Date of birth (words)", r.dob_words], ["Admission date", r.admission_date],
      ["Qualification", r.qualification], ["Father's occupation / ID", r.father_occupation], ["Student ID", r.student_id],
      ["Address", r.address], ["Student mobile", r.student_mobile], ["Guardian mobile", r.guardian_mobile],
      ["Course under 3 months", r.course_3_months], ["Course under 6 months", r.course_6_months],
      ["Submitted at (UTC)", r.created_at]
    ];
    const container = document.querySelector("#detailContent"); container.replaceChildren();
    for (const [label, value] of fields) {
      const item = document.createElement("div"); item.className = "detail-item";
      const small = document.createElement("small"); small.textContent = label;
      const strong = document.createElement("strong"); strong.textContent = value || "—";
      item.append(small, strong); container.append(item);
    }
    detailDialog.showModal();
  } catch (err) { message(recordsMessage, err.message, "error"); }
}
async function deleteRecord(id, name) {
  if (!confirm(`Delete application #${id} for ${name}? This cannot be undone.`)) return;
  try { await api(`/api/admin/admissions/${id}`, {method: "DELETE"}); message(recordsMessage, "Application deleted.", "success"); await loadRecords(); }
  catch (err) { message(recordsMessage, err.message, "error"); }
}
let searchTimer;
searchInput.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadRecords, 250); });
document.querySelector("#refreshButton").addEventListener("click", loadRecords);
document.querySelector("#logoutButton").addEventListener("click", () => logout());
document.querySelector("#closeDialog").addEventListener("click", () => detailDialog.close());
