// analytics.js
document.addEventListener("DOMContentLoaded", () => {
    const analyticsSection = document.getElementById("analytics");
    if (!analyticsSection) return;

    // ==============================
    // ELEMENT REFERENCES
    // ==============================
    const rangeTabs = analyticsSection.querySelectorAll(".analytics-range-tabs .range-tab");
    
    // KPIs
    const kpiTotalTeachersEl   = document.getElementById("kpiTotalTeachers");
    const kpiAttendanceRateEl  = document.getElementById("kpiAttendanceRate");
    const kpiAttendanceCountEl = document.getElementById("kpiAttendanceCount");
    const kpiOpenMaintenanceEl = document.getElementById("kpiOpenMaintenance");

    // Minis
    const miniPresentTodayEl   = document.getElementById("miniPresentToday");
    const miniAbsentTodayEl    = document.getElementById("miniAbsentToday");
    const miniResolvedTodayEl  = document.getElementById("miniResolvedToday");

    // Side summary
    const sideActiveTeachersEl      = document.getElementById("sideActiveTeachers");
    const sideInactiveTeachersEl    = document.getElementById("sideInactiveTeachers");
    const sideOpenMaintenanceEl     = document.getElementById("sideOpenMaintenance");
    const sideResolvedMaintenanceEl = document.getElementById("sideResolvedMaintenance");

    // Chart container
    const chartPlaceholderEl = analyticsSection.querySelector(".chart-placeholder");

    // ✅ API PATH UPDATE
    const API_ANALYTICS = "api/get_analytics_stats.php";

    // ==============================
    // RENDER SVG LINE CHART
    // ==============================
    /**
 * Renders a high-end SVG Line Chart for teacher attendance trends.
 * Features: Centering logic, smooth Bézier curves, gradient area fills, 
 * and integer-based Y-axis scaling.
 */
function renderAttendanceLineChart(chartData) {
    if (!chartPlaceholderEl) return;

    if (!chartData || chartData.length === 0) {
        chartPlaceholderEl.innerHTML = "<span>No activity data for this range</span>";
        return;
    }

    const count = chartData.length;
    chartPlaceholderEl.innerHTML = "";

    // 1. Extract and Parse Data
    const presentData = chartData.map(d => parseInt(d.present) || 0);
    const absentData  = chartData.map(d => parseInt(d.absent) || 0);
    const totalData   = chartData.map(d => parseInt(d.total) || 0);

    // 2. Scale the Y-Axis (Ensuring whole numbers for teacher counts)
    const rawMax = Math.max(...totalData, ...presentData, ...absentData, 5);
    const maxVal = Math.ceil(rawMax / 5) * 5; // Rounds up to nearest 5 for clean steps

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    
    // ViewBox: 110x70 provides space for Y-axis numbers and bottom labels
    svg.setAttribute("viewBox", "0 0 110 70");
    svg.setAttribute("preserveAspectRatio", "none"); 
    svg.style.width = "100%";
    svg.style.height = "100%";

    // Define Gradients in SVG Defs
    const defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML = `
        <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00b894" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#00b894" stop-opacity="0"/>
        </linearGradient>
    `;
    svg.appendChild(defs);

    const margin = { top: 10, right: 10, bottom: 20, left: 15 };
    const w = 110 - margin.left - margin.right;
    const h = 70 - margin.top - margin.bottom;

    // Centering logic for single-day vs multi-day
    const getX = (i) => {
        if (count === 1) return margin.left + (w / 2);
        return margin.left + (i / (count - 1)) * w;
    };
    const getY = (v) => margin.top + (h - (v / maxVal) * h);

    // 3. Draw Y-AXIS SCALE (Whole Integers)
    for (let i = 0; i <= 5; i++) {
        const val = Math.round((maxVal / 5) * i);
        const y = getY(val);

        const text = document.createElementNS(svgNS, "text");
        text.setAttribute("x", margin.left - 5);
        text.setAttribute("y", y + 1.5); 
        text.setAttribute("font-size", "3.5");
        text.setAttribute("fill", "#94a3b8");
        text.setAttribute("text-anchor", "end");
        text.setAttribute("font-family", "'Fredoka', sans-serif");
        text.textContent = val;
        svg.appendChild(text);

        const hGridLine = document.createElementNS(svgNS, "line");
        hGridLine.setAttribute("x1", margin.left);
        hGridLine.setAttribute("y1", y);
        hGridLine.setAttribute("x2", margin.left + w);
        hGridLine.setAttribute("y2", y);
        hGridLine.setAttribute("stroke", "rgba(148, 163, 184, 0.1)");
        hGridLine.setAttribute("stroke-width", "0.2");
        svg.appendChild(hGridLine);
    }

    // 4. Draw X-AXIS Day Labels
    chartData.forEach((d, i) => {
        const x = getX(i);
        const isLongRange = count > 7;
        const shouldShowLabel = !isLongRange || (i % 5 === 0) || (i === count - 1);

        if (shouldShowLabel) {
            const dateObj = new Date(d.day);
            const labelText = !isLongRange 
                ? dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                : dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

            const text = document.createElementNS(svgNS, "text");
            text.setAttribute("x", x);
            text.setAttribute("y", margin.top + h + 12); 
            text.setAttribute("font-size", "3.5");
            text.setAttribute("fill", "#94a3b8");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-family", "'Inter', sans-serif");
            text.textContent = labelText;
            svg.appendChild(text);
        }
    });

    // 5. Function to Generate Smooth Bézier Curves
    function getCurvePath(data) {
        if (data.length < 2) return "";
        let path = `M ${getX(0)} ${getY(data[0])}`;
        for (let i = 0; i < data.length - 1; i++) {
            const x1 = getX(i), y1 = getY(data[i]);
            const x2 = getX(i + 1), y2 = getY(data[i + 1]);
            const cx = (x1 + x2) / 2;
            path += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
        }
        return path;
    }

    // 6. Draw Area Fill (Gradient) for Present Data
    if (count > 1) {
        const areaPathData = getCurvePath(presentData) + 
            ` L ${getX(count - 1)} ${margin.top + h} L ${getX(0)} ${margin.top + h} Z`;
        const area = document.createElementNS(svgNS, "path");
        area.setAttribute("d", areaPathData);
        area.setAttribute("fill", "url(#fillGradient)");
        svg.appendChild(area);
    }

    // 7. Draw Trend Lines (Curves)
    function drawTrend(data, color, width) {
        if (data.length < 2) return;
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", getCurvePath(data));
        path.setAttribute("stroke", color);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-width", width);
        path.setAttribute("stroke-linecap", "round");
        svg.appendChild(path);
    }

    drawTrend(totalData, "#3498db", "0.6"); // Expected
    drawTrend(absentData, "#e74c3c", "1");   // Absent
    drawTrend(presentData, "#00b894", "2");  // Present

    // 8. Add Data Circles (Always visible)
    chartData.forEach((d, i) => {
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", getX(i));
        circle.setAttribute("cy", getY(presentData[i]));
        circle.setAttribute("r", "1.2");
        circle.setAttribute("fill", "#00b894");
        circle.setAttribute("stroke", "#ffffff");
        circle.setAttribute("stroke-width", "0.4");
        svg.appendChild(circle);
    });

    chartPlaceholderEl.appendChild(svg);
}

    // ==============================
    // MAIN REFRESH FUNCTION (FETCH)
    // ==============================
    async function refreshAnalytics(rangeKey = "today") {
        try {
            // Updated to point to the 'api/' folder
            const response = await fetch(`${API_ANALYTICS}?range=${rangeKey}`);
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.status !== 'success') throw new Error(data.message || "Unknown error");

            // Extract data with fallbacks
            const teachers = data.teachers || { total: 0, active: 0, inactive: 0 };
            const maintenance = data.maintenance || { open_total: 0, resolved_period: 0 };
            const attendance = data.attendance || { total_records: 0, present_count: 0, absent_count: 0 };

            // Update KPI Values
            if (kpiTotalTeachersEl) kpiTotalTeachersEl.textContent = teachers.total;
            if (kpiOpenMaintenanceEl) kpiOpenMaintenanceEl.textContent = maintenance.open_total;
            if (kpiAttendanceCountEl) kpiAttendanceCountEl.textContent = attendance.total_records;
            
            if (kpiAttendanceRateEl) {
                const totalT = parseInt(teachers.total) || 0;
                const rate = totalT > 0 ? (attendance.present_count / totalT) * 100 : 0;
                kpiAttendanceRateEl.textContent = `${rate.toFixed(1)}%`;
            }

            // Update Mini Cards
            if (miniPresentTodayEl) miniPresentTodayEl.textContent = attendance.present_count;
            if (miniAbsentTodayEl) miniAbsentTodayEl.textContent = attendance.absent_count;
            if (miniResolvedTodayEl) miniResolvedTodayEl.textContent = maintenance.resolved_period;

            // Update Side Summary
            if (sideActiveTeachersEl) sideActiveTeachersEl.textContent = teachers.active;
            if (sideInactiveTeachersEl) sideInactiveTeachersEl.textContent = teachers.inactive;
            if (sideOpenMaintenanceEl) sideOpenMaintenanceEl.textContent = maintenance.open_total;
            if (sideResolvedMaintenanceEl) sideResolvedMaintenanceEl.textContent = maintenance.resolved_period;

            // Render Chart
            renderAttendanceLineChart(data.chart || []);

        } catch (error) {
            console.error("Analytics Fetch Error:", error);
            if (chartPlaceholderEl) {
                chartPlaceholderEl.innerHTML = `<span style="color: #e74c3c; font-size: 0.8rem;">${error.message}. Check console.</span>`;
            }
        }
    }

    // ==============================
    // RANGE TAB HANDLING
    // ==============================
    function setActiveRangeTab(targetBtn) {
        rangeTabs.forEach((btn) => btn.classList.remove("active"));
        if (targetBtn) targetBtn.classList.add("active");
    }

    rangeTabs.forEach((btn) => {
        btn.addEventListener("click", () => {
            const rangeKey = btn.dataset.range || "today";
            setActiveRangeTab(btn);
            refreshAnalytics(rangeKey);
        });
    });

    // Sidebar navigation trigger
    const analyticsNavBtn = document.querySelector('.menu-item[data-section="analytics"]');
    if (analyticsNavBtn) {
        analyticsNavBtn.addEventListener("click", () => {
            const todayBtn = [...rangeTabs].find(b => b.dataset.range === 'today');
            if (todayBtn) setActiveRangeTab(todayBtn);
            refreshAnalytics("today");
        });
    }

    // Initial load
    refreshAnalytics("today");
});