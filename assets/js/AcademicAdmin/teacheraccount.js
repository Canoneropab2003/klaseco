// assets/js/AcademicAdmin/teacheraccount.js
// Load teacher accounts from Supabase (teachers table) and render in AcademicAdmin list

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("teacherAccountNamesBody");
  if (!tbody) return;

  function renderEmptyRow(message = "No teacher accounts have been created.") {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7" style="text-align:center; color:#9aa5b1; font-style:italic;">
          ${message}
        </td>
      </tr>
    `;
  }

  function getStatusClass(statusRaw) {
    const status = (statusRaw || "").toString().trim().toLowerCase();

    if (status === "active") return "status-active";
    if (status === "inactive") return "status-inactive";
    if (status === "suspended") return "status-suspended";

    // default pill style
    return "status-inactive";
  }

  function renderTeachers(list) {
    tbody.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      renderEmptyRow();
      return;
    }

    list.forEach((t, index) => {
      const tr = document.createElement("tr");

      const statusText  = t.status || "—";
      const statusClass = getStatusClass(statusText);

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${t.name || "—"}</td>
        <td>${t.teacher_id || "—"}</td>
        <td>${t.program || "—"}</td>
        <td>${t.phone || "—"}</td>
        <td>${t.email || "—"}</td>
        <td>
          <span class="status-pill ${statusClass}">
            ${statusText}
          </span>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  async function loadTeachers() {
    try {
    // ✅ FIX: Remove .php and use absolute origin
    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    const res = await fetch(`${cleanBase}/api/teachers_list?_=${Date.now()}`, {
      headers: { 
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      credentials: "same-origin",
    });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.ok !== true) {
        console.error("Teacher list load error:", data?.error || data?.msg);
        renderEmptyRow("Unable to load teacher accounts.");
        return;
      }

      const rows = Array.isArray(data.rows) ? data.rows : [];
      renderTeachers(rows);
    } catch (err) {
      console.error("Teacher list fetch failed:", err);
      renderEmptyRow("Server error while loading teacher accounts.");
    }
  }

  // Initial load from database
  loadTeachers();
});
