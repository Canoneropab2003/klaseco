// =====================================================
// ✅ KLASECO — ATTENDANCE JS (FULL CLEAN UPDATED)
// ✅ Works on BOTH: admindb.php (no room picker) AND academicadmin.php (room picker)
// ✅ DB Fetch + Filters + CSV
// ✅ FIXED: Empty-state ("No attendance yet.") now hides correctly when rows exist
// =====================================================

(function () {
  "use strict";

  // Prevent double init (page sometimes includes attendance.js twice)
  if (window.__KLASECO_ATTENDANCE_INITED__) return;
  window.__KLASECO_ATTENDANCE_INITED__ = true;

  // =========================
  // CONFIG
  // =========================
  const ATT_API_URL = "api/attendance_summary"; // endpoint must exist
  const ATT_EMPTY_ROW_CLASS = "t-empty-row";

  // =========================
  // GLOBALS
  // =========================
  let attTableBody = null;

  const attState = {
    selectedRoom: null,      // "A301" | "A302" | null
    selectedDate: null,      // "YYYY-MM-DD" | null
    selectedTeacher: null,   // string | null
    searchQuery: "",         // lower-case search
    rowsLimit: "all"         // "all" or number string
  };

  // =========================
  // HELPERS
  // =========================
  function normalizeText(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ✅ IMPORTANT: Reliable visibility check for <tr>
  // offsetParent is often NULL for table rows, so we use getClientRects.
  function isRowVisible(row) {
    if (!row) return false;
    if (row.hidden) return false;

    const cs = getComputedStyle(row);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;

    // Works for <tr> reliably (if it is rendered in layout)
    return row.getClientRects().length > 0;
  }

  function getAttendanceRealRows() {
    if (!attTableBody) return [];
    return Array.from(attTableBody.querySelectorAll(`tr:not(.${ATT_EMPTY_ROW_CLASS})`));
  }

  function refreshAttendanceEmptyState() {
    if (!attTableBody) return;

    const visibleRows = getAttendanceRealRows().filter(isRowVisible);

    let emptyRow = attTableBody.querySelector(`tr.${ATT_EMPTY_ROW_CLASS}`);

    if (visibleRows.length === 0) {
      if (!emptyRow) {
        emptyRow = document.createElement("tr");
        emptyRow.className = ATT_EMPTY_ROW_CLASS;
        emptyRow.innerHTML = `
          <td colspan="6" class="t-empty-cell">
            <div class="t-empty-center">No attendance yet.</div>
          </td>
        `;
        attTableBody.appendChild(emptyRow);
      }
    } else if (emptyRow) {
      emptyRow.remove();
    }
  }

  // Prefer <tr data-date="YYYY-MM-DD">
  function rowDateValue(row) {
    const d = row.getAttribute("data-date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return normalizeText(row.querySelector("td:last-child")?.textContent);
  }

  function rowTeacherValue(row) {
    return normalizeText(row.querySelector(".tname")?.textContent);
  }

  function rowSearchBlob(row) {
    const teacher = rowTeacherValue(row);
    const room = normalizeText(row.querySelector(".troom")?.textContent);

    const program = normalizeText(
      row.querySelector(".tprogram")?.textContent ||
      row.querySelector("td:nth-child(4)")?.textContent
    );

    const subject = normalizeText(
      row.querySelector(".tsubject")?.textContent ||
      row.querySelector("td:nth-child(5)")?.textContent
    );

    const timeIn = normalizeText(row.querySelector("td:nth-child(1)")?.textContent);
    const timeOut = normalizeText(row.querySelector("td:nth-child(2)")?.textContent);
    const date = normalizeText(row.querySelector("td:nth-child(6)")?.textContent);

    return `${teacher} ${program} ${room} ${subject} ${timeIn} ${timeOut} ${date}`.toLowerCase();
  }

  // =========================
  // APPLY FILTERS + LIMIT
  // =========================
  function applyAttendanceFiltersAndLimit() {
    if (!attTableBody) return;

    const rows = getAttendanceRealRows();

    // 1) Apply filters
    rows.forEach((row) => {
      const dateTxt = rowDateValue(row);
      const teacherTxt = rowTeacherValue(row);
      const blob = rowSearchBlob(row);

      const okDate = !attState.selectedDate || dateTxt === attState.selectedDate;
      const okTeacher = !attState.selectedTeacher || teacherTxt === attState.selectedTeacher;
      const okSearch = !attState.searchQuery || blob.includes(attState.searchQuery);

      row.style.display = (okDate && okTeacher && okSearch) ? "" : "none";
    });

    // 2) Apply rows limit only on currently visible rows
    const visibleRows = rows.filter(isRowVisible);

    // reset any previous hiding from limit
    visibleRows.forEach((r) => (r.style.display = ""));

    if (attState.rowsLimit !== "all") {
      const limit = parseInt(attState.rowsLimit, 10);
      if (!isNaN(limit)) {
        visibleRows.forEach((row, idx) => {
          row.style.display = idx < limit ? "" : "none";
        });
      }
    }

    refreshAttendanceEmptyState();
  }

  // =========================
  // TOAST
  // =========================
  function attendanceToast(message, type = "ok") {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.setAttribute("role", "status");
    toast.style.position = "fixed";
    toast.style.right = "16px";
    toast.style.bottom = "16px";
    toast.style.zIndex = "99999";
    toast.style.fontFamily = "system-ui, sans-serif";
    toast.style.fontWeight = "800";
    toast.style.fontSize = "14px";
    toast.style.padding = "10px 14px";
    toast.style.borderRadius = "12px";
    toast.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)";
    toast.style.backdropFilter = "blur(6px) saturate(1.1)";
    toast.style.webkitBackdropFilter = "blur(6px) saturate(1.1)";
    toast.style.color = "#0b2b38";

    const bgByType = {
      ok: "rgba(184, 248, 111, 0.9)",
      warn: "rgba(255, 211, 78, 0.9)",
      error: "rgba(255, 120, 120, 0.9)"
    };
    toast.style.background = bgByType[type] || bgByType.ok;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
  }

  // =========================
  // EXPORT EXCEL (.xlsx) — Styled with SheetJS
  // =========================
  function loadSheetJS(callback) {
    if (window.XLSX) return callback();
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js";
    s.onload = callback;
    s.onerror = () => attendanceToast("Failed to load Excel library.", "error");
    document.head.appendChild(s);
  }

  function exportAttendanceCSV(attendanceSection) {
    const table = attendanceSection.querySelector("table");
    if (!table) return attendanceToast("No table found to export.", "error");

    const allRows = Array.from(table.querySelectorAll("tbody tr"));
    const visibleRows = allRows.filter((row) => {
      if (row.classList.contains(ATT_EMPTY_ROW_CLASS)) return false;
      return isRowVisible(row);
    });

    if (!visibleRows.length) return attendanceToast("No visible attendance to export.", "warn");

    loadSheetJS(() => {
      const XLSX = window.XLSX;

      const HEADERS = ["Time In", "Time Out", "Room", "Teacher", "Program", "Subject", "Date"];

      // Build data rows
      const dataRows = visibleRows.map((row) =>
        Array.from(row.querySelectorAll("td")).map((td) => normalizeText(td.textContent))
      );

      // ── Colours (hex without #) ──────────────────────────────
      const TEAL_DARK   = "0D2B34";   // header bg  (#0d2b34)
      const GREEN_LIME  = "B8F86F";   // accent / alt row
      const WHITE       = "FFFFFF";
      const LIGHT_ROW   = "EDF3F5";   // even row bg
      const TEXT_DARK   = "16333C";
      const TEXT_WHITE  = "FFFFFF";

      // ── Cell helpers ─────────────────────────────────────────
      function headerCell(v) {
        return {
          v, t: "s",
          s: {
            font:      { bold: true, color: { rgb: TEXT_WHITE }, name: "Arial", sz: 11 },
            fill:      { patternType: "solid", fgColor: { rgb: TEAL_DARK } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border:    borders("FFFFFF")
          }
        };
      }

      function dataCell(v, rowIdx) {
        const even = rowIdx % 2 === 0;
        return {
          v, t: "s",
          s: {
            font:      { bold: false, color: { rgb: TEXT_DARK }, name: "Arial", sz: 10 },
            fill:      { patternType: "solid", fgColor: { rgb: even ? WHITE : LIGHT_ROW } },
            alignment: { horizontal: "left", vertical: "center" },
            border:    borders("D9E5E8")
          }
        };
      }

      function borders(colorHex) {
        const side = { style: "thin", color: { rgb: colorHex } };
        return { top: side, bottom: side, left: side, right: side };
      }

      // ── Build worksheet ──────────────────────────────────────
      const today      = new Date();
      const dateStr    = today.toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
      const timeStr    = today.toLocaleTimeString("en-PH", { hour:"2-digit", minute:"2-digit" });

      // Row 1 — Report title (merged A1:G1)
      const titleCell = {
        v: "KLASECO — Attendance Report", t: "s",
        s: {
          font:      { bold: true, color: { rgb: WHITE }, name: "Arial", sz: 14 },
          fill:      { patternType: "solid", fgColor: { rgb: TEAL_DARK } },
          alignment: { horizontal: "center", vertical: "center" }
        }
      };

      // Row 2 — subtitle / export timestamp
      const subtitleCell = {
        v: `Exported: ${dateStr}  •  ${timeStr}`, t: "s",
        s: {
          font:      { italic: true, color: { rgb: "4A7080" }, name: "Arial", sz: 10 },
          fill:      { patternType: "solid", fgColor: { rgb: "E8F2F4" } },
          alignment: { horizontal: "center", vertical: "center" }
        }
      };

      // Row 3 — accent divider (solid lime-green strip)
      const accentCell = {
        v: "", t: "s",
        s: { fill: { patternType: "solid", fgColor: { rgb: GREEN_LIME } } }
      };

      const ws = {};
      const cols = HEADERS.length;
      const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

      function cellAddr(col, row) { return ALPHA[col] + row; }

      // Row 1: Title across all columns
      HEADERS.forEach((_, c) => {
        ws[cellAddr(c, 1)] = c === 0 ? titleCell : { v: "", t: "s", s: titleCell.s };
      });

      // Row 2: Subtitle
      HEADERS.forEach((_, c) => {
        ws[cellAddr(c, 2)] = c === 0 ? subtitleCell : { v: "", t: "s", s: subtitleCell.s };
      });

      // Row 3: Accent stripe
      HEADERS.forEach((_, c) => { ws[cellAddr(c, 3)] = { ...accentCell }; });

      // Row 4: Column headers
      HEADERS.forEach((h, c) => { ws[cellAddr(c, 4)] = headerCell(h); });

      // Rows 5+: Data
      dataRows.forEach((row, ri) => {
        row.forEach((val, c) => {
          ws[cellAddr(c, ri + 5)] = dataCell(val, ri);
        });
      });

      // Summary row (total count)
      const summaryRow = dataRows.length + 5;
      HEADERS.forEach((_, c) => {
        ws[cellAddr(c, summaryRow)] = {
          v: c === 0 ? `Total Records: ${dataRows.length}` : "",
          t: "s",
          s: {
            font:  { bold: true, color: { rgb: TEXT_DARK }, name: "Arial", sz: 10 },
            fill:  { patternType: "solid", fgColor: { rgb: GREEN_LIME } },
            alignment: { horizontal: c === 0 ? "left" : "center", vertical: "center" },
            border: borders("9FE87A")
          }
        };
      });

      // Sheet range
      ws["!ref"] = `A1:${ALPHA[cols - 1]}${summaryRow}`;

      // Merges: title row + subtitle row span full width
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } },   // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: cols - 1 } },   // Subtitle
        { s: { r: 2, c: 0 }, e: { r: 2, c: cols - 1 } },   // Accent
        { s: { r: summaryRow - 1, c: 0 }, e: { r: summaryRow - 1, c: cols - 1 } } // Summary
      ];

      // Column widths
      ws["!cols"] = [
        { wch: 12 },  // Time In
        { wch: 12 },  // Time Out
        { wch: 8  },  // Room
        { wch: 26 },  // Teacher
        { wch: 10 },  // Program
        { wch: 12 },  // Subject
        { wch: 13 },  // Date
      ];

      // Row heights (in points)
      ws["!rows"] = [
        { hpt: 32 },  // Title
        { hpt: 20 },  // Subtitle
        { hpt: 6  },  // Accent stripe
        { hpt: 22 },  // Header
      ];

      // ── Workbook ─────────────────────────────────────────────
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");

      const fileName = `KLASECO_Attendance_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      attendanceToast("Excel file exported!", "ok");
    });
  }

  // =========================
  // EXPORT PDF (jsPDF + autoTable)
  // =========================
  function loadJsPDF() {
    return new Promise((resolve, reject) => {
      if (window.jspdf && window.jspdf.jsPDF) return resolve(window.jspdf.jsPDF);

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => {
        const plugin = document.createElement("script");
        plugin.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
        plugin.onload  = () => resolve(window.jspdf.jsPDF);
        plugin.onerror = () => reject(new Error("Failed to load jsPDF autoTable"));
        document.head.appendChild(plugin);
      };
      script.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(script);
    });
  }

  // Load an image URL as a base64 data-URI for jsPDF
  function loadImageAsBase64(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => resolve(null); // logo optional — don't block export
      img.src = url + "?_=" + Date.now(); // cache-bust for crossOrigin
    });
  }

  async function exportAttendancePDF(attendanceSection) {
    const table = attendanceSection.querySelector("table");
    if (!table) return attendanceToast("No table found to export.", "error");

    const visibleRows = Array.from(table.querySelectorAll("tbody tr")).filter((row) => {
      if (row.classList.contains(ATT_EMPTY_ROW_CLASS)) return false;
      return isRowVisible(row);
    });

    if (!visibleRows.length) return attendanceToast("No visible attendance to export.", "warn");

    let jsPDF;
    try {
      jsPDF = await loadJsPDF();
    } catch (err) {
      console.error("[ATT] jsPDF load failed:", err);
      return attendanceToast("Export failed: could not load PDF library.", "error");
    }

    // Load logo (non-blocking)
    const logoData = await loadImageAsBase64("assets/images/klaseco-logo.png");

    const now     = new Date();
    const dateStr = now.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
    const room    = attState.selectedRoom || "ALL";

    // ── Palette
    const C = {
      teal:      [13,  43,  52],
      tealMid:   [22,  68,  84],
      tealLight: [232, 242, 244],
      lime:      [184, 248, 111],
      white:     [255, 255, 255],
      rowAlt:    [241, 248, 250],
      border:    [206, 224, 228],
      textDark:  [13,  43,  52],
      textMid:   [74,  112, 128],
      textLight: [148, 180, 190],
    };

    const doc   = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();   // 297 mm
    const pageH = doc.internal.pageSize.getHeight();  // 210 mm
    const M     = 13;
    const HDR_H = 26;
    const FTR_H = 9;

    // ════════════════════════════════════════
    // Compute stats first (needed inside drawFooter closure)
    // ════════════════════════════════════════
    const dataRows = visibleRows.map((row) =>
      Array.from(row.querySelectorAll("td")).map((td) => normalizeText(td.textContent))
    );

    // Column order from loadAttendanceFromDB td rendering:
    // 0=Time In | 1=Time Out | 2=Room | 3=Teacher | 4=Program | 5=Subject | 6=Date
    // Read stats directly from DOM spans — 100% reliable regardless of thead structure.
    const totalRecords   = dataRows.length;

    const uniqueTeachers = new Set(
      visibleRows.map(r => normalizeText(r.querySelector(".tname")?.textContent)).filter(Boolean)
    ).size;

    const uniqueDates = new Set(
      visibleRows.map(r => {
        // prefer data-date attribute, fall back to last td text
        const attr = r.getAttribute("data-date");
        if (attr) return attr;
        const tds = r.querySelectorAll("td");
        return normalizeText(tds[tds.length - 1]?.textContent);
      }).filter(Boolean)
    ).size;

    const withTimeOut = visibleRows.filter(r => {
      // Time Out is always the 2nd <td> (index 1)
      const v = normalizeText(r.querySelectorAll("td")[1]?.textContent);
      return v && v !== "--" && v !== "—" && v !== "-";
    }).length;

    // ════════════════════════════════════════
    // HELPER — draw header band (called on every page)
    // ════════════════════════════════════════
    function drawHeader() {
      // Dark teal band
      doc.setFillColor(...C.teal);
      doc.rect(0, 0, pageW, HDR_H, "F");

      // Lime left accent bar
      doc.setFillColor(...C.lime);
      doc.rect(0, 0, 4, HDR_H, "F");

      // Subtle decorative circles top-right
      doc.setDrawColor(...C.tealMid);
      doc.setLineWidth(0.4);
      doc.circle(pageW - 14, -4, 20);
      doc.circle(pageW - 5,   3, 12);

      const logoH  = 9;
      let   textX  = M + 6;

      // Logo
      if (logoData) {
        const aspect = logoData.w / logoData.h;
        const logoW  = logoH * aspect;
        const logoY  = (HDR_H - logoH) / 2;
        doc.addImage(logoData.dataUrl, "PNG", M + 1, logoY, logoW, logoH);
        textX = M + 1 + logoW + 4;
      }

      // "KLASECO" in lime — measure first so subtitle never overlaps
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...C.lime);
      doc.text("KLASECO", textX, HDR_H / 2 + 1);
      const klasW = doc.getTextWidth("KLASECO");

      // "· Attendance Report" right after, no overlap
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(200, 228, 238);
      doc.text("· Attendance Report", textX + klasW + 3, HDR_H / 2 + 1);

      // Export timestamp below wordmark
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.textLight);
      doc.text(`Exported: ${dateStr}  ·  ${timeStr}`, textX, HDR_H / 2 + 6.5);

      // Room badge — inside the band, right side, vertically centred
      const badgeLabel = `Room: ${room}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const bW  = doc.getTextWidth(badgeLabel) + 8;
      const bH  = 7;
      const bX  = pageW - M - bW;
      const bY  = (HDR_H - bH) / 2;
      doc.setFillColor(...C.lime);
      doc.roundedRect(bX, bY, bW, bH, 1.5, 1.5, "F");
      doc.setTextColor(...C.teal);
      doc.text(badgeLabel, bX + 4, bY + bH / 2 + 1.5);
    }

    // ════════════════════════════════════════
    // HELPER — draw footer bar (called on every page)
    // ════════════════════════════════════════
    function drawFooter(pageNum) {
      const fy = pageH - FTR_H;

      doc.setFillColor(...C.teal);
      doc.rect(0, fy, pageW, FTR_H, "F");

      doc.setFillColor(...C.lime);
      doc.rect(0, fy, 4, FTR_H, "F");

      const midY = fy + FTR_H / 2 + 1.2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...C.lime);
      doc.text(`Total Records: ${totalRecords}`, M + 6, midY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 228, 238);
      doc.text("KLASECO Attendance System", pageW / 2, midY, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.lime);
      doc.text(`Page ${pageNum}`, pageW - M - 4, midY, { align: "right" });
    }

    // ════════════════════════════════════════
    // DRAW PAGE 1 — header
    // ════════════════════════════════════════
    drawHeader();

    // ── Stat cards
    const CARDS    = [
      { label: "TOTAL RECORDS", value: String(totalRecords)   },
      { label: "TEACHERS",      value: String(uniqueTeachers) },
      { label: "DAYS COVERED",  value: String(uniqueDates)    },
      { label: "TIMED OUT",     value: String(withTimeOut)    },
    ];
    const CARD_GAP = 3;
    const CARD_Y   = HDR_H + 3;
    const CARD_H   = 17;
    const CARD_W   = (pageW - M * 2 - CARD_GAP * (CARDS.length - 1)) / CARDS.length;

    CARDS.forEach((card, i) => {
      const cx = M + i * (CARD_W + CARD_GAP);

      doc.setFillColor(...C.tealLight);
      doc.roundedRect(cx, CARD_Y, CARD_W, CARD_H, 2, 2, "F");

      doc.setFillColor(...C.lime);
      doc.roundedRect(cx, CARD_Y, 2.5, CARD_H, 1, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...C.teal);
      doc.text(card.value, cx + 7, CARD_Y + 10);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...C.textMid);
      doc.text(card.label, cx + 7, CARD_Y + 14.5);
    });

    // ── Section heading + underline
    const SEC_Y = CARD_Y + CARD_H + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.textMid);
    doc.text("ATTENDANCE RECORDS", M, SEC_Y);
    doc.setDrawColor(...C.lime);
    doc.setLineWidth(0.8);
    doc.line(M, SEC_Y + 1.5, M + 44, SEC_Y + 1.5);

    // ════════════════════════════════════════
    // TABLE
    // ════════════════════════════════════════
    const HEADERS = ["Time In", "Time Out", "Room", "Teacher", "Program", "Subject", "Date"];

    let currentPage = 1;

    doc.autoTable({
      startY: SEC_Y + 5,
      // top margin on subsequent pages = HDR_H + gap so table starts below header
      margin: { left: M, right: M, top: HDR_H + 2, bottom: FTR_H + 2 },
      head: [HEADERS],
      body: dataRows,
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: { top: 3.5, right: 5, bottom: 3.5, left: 5 },
        textColor: C.textDark,
        lineColor: C.border,
        lineWidth: 0.15,
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: C.teal,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
        cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
        minCellHeight: 10,
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      bodyStyles:         { fillColor: C.white  },
      columnStyles: {
        0: { cellWidth: 24, halign: "center" },   // Time In
        1: { cellWidth: 24, halign: "center" },   // Time Out
        2: { cellWidth: 18, halign: "center" },   // Room
        3: { cellWidth: "auto"               },   // Teacher — flex
        4: { cellWidth: 24, halign: "center" },   // Program (wider → no wrap)
        5: { cellWidth: 27, halign: "center" },   // Subject
        6: { cellWidth: 28, halign: "center" },   // Date
      },
      didDrawPage: (data) => {
        // On pages after the first, redraw the header band so it's not blank
        if (data.pageNumber > currentPage) {
          currentPage = data.pageNumber;
          drawHeader();
        }
        // Footer on every page
        drawFooter(data.pageNumber);
      },
    });

    const dateSlug = now.toISOString().slice(0, 10);
    doc.save(`KLASECO_Attendance_${room}_${dateSlug}.pdf`);
    attendanceToast("PDF exported!", "ok");
  }

  // =========================
  // PICKER MENU
  // =========================
  function buildPickerMenu(anchor, items, onChoose, allLabel, activeValue) {
    if (!anchor) return;

    // Remove any existing open menu
    document.querySelectorAll(".att-picker-menu").forEach((m) => m.remove());

    const menu = document.createElement("div");
    menu.className = "att-picker-menu";
    menu.style.position = "absolute";
    menu.style.zIndex = "99999";
    menu.style.minWidth = "220px";
    menu.style.maxWidth = "320px";
    menu.style.background = "#fff";
    menu.style.borderRadius = "14px";
    menu.style.boxShadow = "0 16px 40px rgba(0,0,0,0.18)";
    menu.style.padding = "8px";
    menu.style.border = "1px solid rgba(15, 23, 42, 0.08)";
    menu.style.fontFamily = "system-ui, sans-serif";

    function addItem(label, value) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.width = "100%";
      btn.style.textAlign = "left";
      btn.style.padding = "10px 10px";
      btn.style.borderRadius = "10px";
      btn.style.border = "0";
      btn.style.background = (value === activeValue) ? "rgba(0,0,0,0.06)" : "transparent";
      btn.style.cursor = "pointer";
      btn.style.fontWeight = "700";
      btn.style.color = "#0f172a";

      btn.addEventListener("mouseenter", () => (btn.style.background = "rgba(0,0,0,0.08)"));
      btn.addEventListener("mouseleave", () => (btn.style.background = (value === activeValue) ? "rgba(0,0,0,0.06)" : "transparent"));

      btn.addEventListener("click", () => {
        onChoose(value);
        close();
      });

      menu.appendChild(btn);
    }

    addItem(allLabel, null);
    items.forEach((i) => addItem(i, i));

    // ✅ position:fixed so scroll never shifts the menu
    menu.style.position = "fixed";
    menu.style.maxHeight = "260px";
    menu.style.overflowY = "auto";
    menu.style.overflowX = "hidden";

    if (!document.getElementById("att-picker-scroll-style")) {
      const scrollStyle = document.createElement("style");
      scrollStyle.id = "att-picker-scroll-style";
      scrollStyle.textContent = [
        ".att-picker-menu::-webkit-scrollbar { width: 6px; }",
        ".att-picker-menu::-webkit-scrollbar-track { background: rgba(232,238,240,0.95); border-radius: 999px; }",
        ".att-picker-menu::-webkit-scrollbar-thumb { background: rgba(184,248,111,0.95); border-radius: 999px; }",
        ".att-picker-menu::-webkit-scrollbar-thumb:hover { background: rgba(164,226,93,0.98); }"
      ].join(" ");
      document.head.appendChild(scrollStyle);
    }

    function positionMenu() {
      const rect = anchor.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const menuH = Math.min(260, items.length * 40 + 50);
      if (spaceBelow < menuH && rect.top > spaceBelow) {
        menu.style.top = (rect.top - menuH - 6) + "px";
      } else {
        menu.style.top = (rect.bottom + 6) + "px";
      }
      menu.style.left = rect.left + "px";
    }

    document.body.appendChild(menu);
    positionMenu();

    const onScroll = () => positionMenu();
    const onResize = () => positionMenu();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    const onDoc = (e) => {
      if (!menu.contains(e.target) && e.target !== anchor) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };

    function close() {
      if (menu.parentNode) menu.remove();
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    }

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
  }

  function uniqueDatesFromRows() {
    const set = new Set();
    getAttendanceRealRows().forEach((row) => {
      const d = rowDateValue(row);
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(d);
    });
    return Array.from(set).sort().reverse();
  }

  function uniqueTeachersFromRows() {
    const set = new Set();
    getAttendanceRealRows().forEach((row) => {
      const t = rowTeacherValue(row);
      if (t) set.add(t);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  // =========================
  // LOAD FROM DB
  // =========================
  async function loadAttendanceFromDB(roomOrNull) {
    if (!attTableBody) return;

    try {
        const qs = new URLSearchParams();
        if (roomOrNull) qs.set("room", roomOrNull);

        // 1. Get the absolute origin (e.g., https://klaseco.com)
        const baseUrl = window.location.origin;
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        // 2. Build the URL using the clean API path (no .php) to match .htaccess
        // Example: https://klaseco.com/api/attendance_summary
        const cleanApiPath = ATT_API_URL.replace(/\.php$/, "");
        const url = `${cleanBase}/${cleanApiPath}${qs.toString() ? "?" + qs.toString() : ""}`;

        const res = await fetch(url, {
            cache: "no-store",
            credentials: "same-origin",
            headers: {
                'X-Requested-With': 'XMLHttpRequest' // Standard for identifying AJAX calls
            }
        });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || !data.ok) {
        console.error("[ATT] API error:", { status: res.status, data });
        attTableBody.innerHTML = "";
        refreshAttendanceEmptyState();

        if (res.status === 401 || res.status === 403) {
          attendanceToast("Attendance API blocked (login required).", "warn");
        }
        return;
      }

      const rows = Array.isArray(data.rows) ? data.rows : [];
      
      // ✅ ARRANGE: Ensure rows are sorted by newest date and time first
      rows.sort((a, b) => {
          const dateTimeA = new Date(`${a.date} ${a.time_in}`);
          const dateTimeB = new Date(`${b.date} ${b.time_in}`);
          return dateTimeB - dateTimeA; 
      });

      attTableBody.innerHTML = "";

      rows.forEach((r) => {
        const tr = document.createElement("tr");

        const dateISO = normalizeText(r.date);
        if (dateISO) tr.setAttribute("data-date", dateISO);

        // ✅ Updated columns: Added Room Number (td:nth-child(3)) and Subject Code
        tr.innerHTML = `
  <td>${escapeHtml(r.time_in || "—")}</td>
  <td>${escapeHtml(r.time_out || "—")}</td>
  <td><span class="troom">${escapeHtml(r.room_code || "—")}</span></td> <td><span class="tname">${escapeHtml(r.teacher_name || "—")}</span></td>
  <td><span class="tprogram">${escapeHtml(r.program || "—")}</span></td>
  <td><span class="tsubject">${escapeHtml(r.subject_code || "—")}</span></td>
  <td>${escapeHtml(dateISO || "—")}</td>
`;

        attTableBody.appendChild(tr);
      });

      applyAttendanceFiltersAndLimit();
      refreshAttendanceEmptyState();
    } catch (err) {
      console.error("[ATT] Network error:", err);
      attTableBody.innerHTML = "";
      refreshAttendanceEmptyState();
    }
  }

  // =========================
  // INIT
  // =========================
  document.addEventListener("DOMContentLoaded", () => {
    const attendanceSection = document.getElementById("attendance");
    if (!attendanceSection) return;

    // Table body
    attTableBody = attendanceSection.querySelector("tbody");
    if (!attTableBody) return;

    // Filter DOM
    const rowsSelect = attendanceSection.querySelector("#rowsSelect");
    const searchInput = attendanceSection.querySelector(".search input");
    const resetBtn = attendanceSection.querySelector(".btn-reset:not(.back-btn)");
    const exportBtn = attendanceSection.querySelector(".btn-export");
    const pdfBtn    = attendanceSection.querySelector(".btn-pdf");

    const byLabel = (txt) =>
      Array.from(attendanceSection.querySelectorAll(".field"))
        .find((f) => normalizeText(f.querySelector("label")?.textContent).toLowerCase() === txt)
        ?.querySelector(".pill-light") || null;

    const dateBtn = byLabel("date");
    const teacherBtn = byLabel("teacher");

    if (!rowsSelect || !searchInput || !resetBtn || !exportBtn || !dateBtn || !teacherBtn) return;

    // Room selection DOM (optional)
    const roomSelectPanel = document.getElementById("attendanceRoomSelect"); // exists on academicadmin.php
    const attendanceContent = document.getElementById("attendanceContent");  // exists on academicadmin.php
    const roomButtons = attendanceSection.querySelectorAll(".room-btn");     // exists on academicadmin.php
    const backToRoomBtn = document.getElementById("backToRoomBtn");          // exists on academicadmin.php
    const selectedRoomTitle = document.getElementById("selectedRoomTitle");  // exists on academicadmin.php

    const hasRoomPicker = !!(roomSelectPanel && attendanceContent && roomButtons.length);

    // initial state
    attState.rowsLimit = rowsSelect.value || "all";
    dateBtn.textContent = "All dates";
    teacherBtn.textContent = "All teachers";

    // Filters
    rowsSelect.addEventListener("change", () => {
      attState.rowsLimit = rowsSelect.value;
      applyAttendanceFiltersAndLimit();
    });

    dateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      buildPickerMenu(
        dateBtn,
        uniqueDatesFromRows(),
        (picked) => {
          attState.selectedDate = picked;
          dateBtn.textContent = picked || "All dates";
          applyAttendanceFiltersAndLimit();
        },
        "All dates",
        attState.selectedDate
      );
    });

    teacherBtn.addEventListener("click", (e) => {
      e.preventDefault();
      buildPickerMenu(
        teacherBtn,
        uniqueTeachersFromRows(),
        (picked) => {
          attState.selectedTeacher = picked;
          teacherBtn.textContent = picked || "All teachers";
          applyAttendanceFiltersAndLimit();
        },
        "All teachers",
        attState.selectedTeacher
      );
    });

    searchInput.addEventListener("input", () => {
      attState.searchQuery = normalizeText(searchInput.value).toLowerCase();
      applyAttendanceFiltersAndLimit();
    });

    resetBtn.addEventListener("click", () => {
      attState.selectedDate = null;
      attState.selectedTeacher = null;
      attState.searchQuery = "";
      attState.rowsLimit = "all";

      searchInput.value = "";
      rowsSelect.value = "all";
      dateBtn.textContent = "All dates";
      teacherBtn.textContent = "All teachers";

      applyAttendanceFiltersAndLimit();
    });

    exportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      exportAttendanceCSV(attendanceSection);
    });

    if (pdfBtn) {
      pdfBtn.addEventListener("click", (e) => {
        e.preventDefault();
        exportAttendancePDF(attendanceSection);
      });
    }

    // Auto-reapply if rows change later
    const mo = new MutationObserver(() => applyAttendanceFiltersAndLimit());
    mo.observe(attTableBody, { childList: true, subtree: true });

    // =========================
    // ROOM PICKER MODE (Academic Admin)
    // =========================
    function showRoomSelect() {
      attState.selectedRoom = null;

      if (roomSelectPanel) roomSelectPanel.classList.remove("hidden");
      if (attendanceContent) attendanceContent.classList.add("hidden");
      if (selectedRoomTitle) selectedRoomTitle.textContent = "ATTENDANCE (RFID & Biometric)";

      attState.selectedDate = null;
      attState.selectedTeacher = null;
      attState.searchQuery = "";
      attState.rowsLimit = "all";

      searchInput.value = "";
      rowsSelect.value = "all";
      dateBtn.textContent = "All dates";
      teacherBtn.textContent = "All teachers";

      attTableBody.innerHTML = "";
      refreshAttendanceEmptyState();
    }

    function showAttendanceForRoom(room) {
      attState.selectedRoom = room;

      if (roomSelectPanel) roomSelectPanel.classList.add("hidden");
      if (attendanceContent) attendanceContent.classList.remove("hidden");
      if (selectedRoomTitle) selectedRoomTitle.textContent = `ATTENDANCE (RFID & Biometric) — ${room}`;

      attState.selectedDate = null;
      attState.selectedTeacher = null;
      attState.searchQuery = "";
      attState.rowsLimit = rowsSelect.value || "all";

      dateBtn.textContent = "All dates";
      teacherBtn.textContent = "All teachers";
      searchInput.value = "";

      loadAttendanceFromDB(room);
    }

    if (hasRoomPicker) {
      roomButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const room = btn.getAttribute("data-room");
          if (!room) return;
          showAttendanceForRoom(room);
        });
      });

      if (backToRoomBtn) backToRoomBtn.addEventListener("click", showRoomSelect);

      // Start on room select
      showRoomSelect();
      return;
    }

    // =========================
    // NO ROOM PICKER MODE (Admin Monitoring)
    // =========================
    loadAttendanceFromDB(null);
    // =========================
    // ✅ AUTO-REFRESH (Added)
    // =========================
    const REFRESH_INTERVAL = 30000; // 30 seconds
    
    setInterval(() => {
      // Only refresh if we are NOT on the room selection screen
      // and NOT currently looking at a dropdown menu
      const isRoomPickerVisible = roomSelectPanel && !roomSelectPanel.classList.contains("hidden");
      const isMenuOpen = !!document.querySelector(".att-picker-menu");

      if (!isRoomPickerVisible && !isMenuOpen) {
        console.log("[ATT] Auto-refreshing attendance data...");
        loadAttendanceFromDB(attState.selectedRoom);
      }
    }, REFRESH_INTERVAL);
  });
  
  // =========================
  // OVERVIEW COUNTS (Present Today + Time-ins Today)
  // =========================
  async function loadOverviewCounts() {
    const presentEl = document.getElementById('overview-present-count');
    const timeinEl  = document.getElementById('overview-timein-count');
    if (!presentEl && !timeinEl) return; // not on this page

    try {
      const baseUrl    = window.location.origin.replace(/\/$/, '');
      const url        = `${baseUrl}/api/attendance_summary`;

      const res  = await fetch(url, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) return;

      const rows  = Array.isArray(data.rows) ? data.rows : [];

      // Today's date as "YYYY-MM-DD"
      const today = new Date();
      const yyyy  = today.getFullYear();
      const mm    = String(today.getMonth() + 1).padStart(2, '0');
      const dd    = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // Filter only today's rows
      const todayRows = rows.filter(r => r.date === todayStr);

      // Time-ins Today = count of rows that have a time_in value
      const timeInsCount = todayRows.filter(r => r.time_in && r.time_in !== '—').length;

      // Present Today = unique teachers who have at least one record today
      const presentTeachers = new Set(
        todayRows
          .filter(r => r.teacher_name && r.teacher_name !== '—')
          .map(r => r.teacher_name.trim())
      );

      if (timeinEl)  timeinEl.textContent  = timeInsCount;
      if (presentEl) presentEl.textContent = presentTeachers.size;

    } catch (err) {
      console.error('[OVERVIEW] Failed to load attendance counts:', err);
    }
  }

  // Run on load
  document.addEventListener('DOMContentLoaded', () => {
    loadOverviewCounts();
    // Refresh every 30 seconds to stay in sync with attendance auto-refresh
    setInterval(loadOverviewCounts, 30000);
  });
}());