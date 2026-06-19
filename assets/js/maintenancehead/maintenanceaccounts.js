// assets/js/maintenancehead/maintenanceaccounts.js
document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("teacherAccountNamesBody");
  if (!tbody) return;

  // Overview card counter: <strong id="overview-schedule-count">—</strong>
  const overviewMaintCountEl = document.getElementById("overview-schedule-count");

  // ==========================================
  // 🧾 RENDER TABLE ROWS
  // ==========================================
  function renderMaintenanceAccounts(rows) {
    tbody.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6" style="text-align:center; font-style:italic;">
            No maintenance accounts have been created.
          </td>
        </tr>`;
      if (overviewMaintCountEl) {
        overviewMaintCountEl.textContent = "—";
      }
      return;
    }

    // ✅ Every row treated as "Active" by default
    const activeCount = rows.length;
    if (overviewMaintCountEl) {
      overviewMaintCountEl.textContent = activeCount;
    }

    rows.forEach((m, index) => {
      const tr = document.createElement("tr");

      const staffName = m.name      || "—";
      const staffId   = m.maint_id  || "—";
      const phone     = m.phone     || "—";
      const email     = m.email     || "—";

      // Default status is ALWAYS "Active" (UI-level)
      const status      = "Active";
      const statusClass = "status-active";

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${staffName}</td>
        <td>${staffId}</td>
        <td>${phone}</td>
        <td>${email}</td>
        <td><span class="status-pill ${statusClass}">${status}</span></td>
      `;

      tbody.appendChild(tr);
    });
  }

  // ==========================================
  // 🔁 LOAD FROM DATABASE (maintenance_users)
  // ==========================================
  async function loadMaintenanceAccounts() {
    try {
      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const res = await fetch(`${cleanBase}/api/maintenance_users_list?_=` + Date.now(), {
        headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.ok !== true) {
        console.error("Maintenance users load error:", data?.error || data?.msg);
        renderMaintenanceAccounts([]);
        return;
      }

      const rows = Array.isArray(data.rows) ? data.rows : [];
      renderMaintenanceAccounts(rows);
    } catch (err) {
      console.error("Maintenance users fetch error:", err);
      renderMaintenanceAccounts([]);
    }
  }

  // Initial load
  loadMaintenanceAccounts();

  // Optional: re-load when some global refresh event is fired
  if (window.KLASECO_REFRESH && typeof window.KLASECO_REFRESH.subscribe === "function") {
    window.KLASECO_REFRESH.subscribe("maintenance-users-changed", () => {
      loadMaintenanceAccounts();
    });
  }
});
