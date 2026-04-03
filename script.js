/* ════════════════════════════════════════════════════════
   CHRONO — Frontend Logic
   All API calls go to Flask backend at localhost:5000
   ════════════════════════════════════════════════════════ */

const API_URL = "https://your-render-name.onrender.com";

// ── Live clock ──────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  document.getElementById("liveClock").textContent = `${h}:${m}:${s}`;
}
updateClock();
setInterval(updateClock, 1000);

// ── Home button ─────────────────────────────────────────
function goHome() {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  document.querySelector('.tab[data-tab="convert"]').classList.add("active");
  document.getElementById("tab-convert").classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Tab switching ───────────────────────────────────────
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ── Op button toggles (arithmetic) ─────────────────────
let currentOp = "add";
document.querySelectorAll("#tab-arithmetic .op-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("#tab-arithmetic .op-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentOp = btn.dataset.op;
  });
});

let currentAdjOp = "add";
document.querySelectorAll(".op-selector.linear .op-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".op-selector.linear .op-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentAdjOp = btn.dataset.adjop;
  });
});

// ── API helper ──────────────────────────────────────────
async function apiPost(_endpoint, body) {
  const res = await fetch(`${API_URL}/api/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

function showLoading(elId) {
  document.getElementById(elId).innerHTML =
    `<div style="padding:1rem; color:var(--text-muted); display:flex; gap:.6rem; align-items:center"><span class="spinner"></span>Calculating…</div>`;
}

function showError(elId, msg) {
  document.getElementById(elId).innerHTML =
    `<div class="error-card"><span>⚠</span> ${msg}</div>`;
}

function fmt(n, dec = 4) {
  if (Number.isInteger(n)) return n.toLocaleString();
  return parseFloat(n.toFixed(dec)).toLocaleString(undefined, {
    maximumFractionDigits: dec,
  });
}

// ── UNIT CONVERSION ─────────────────────────────────────
const convMap = {
  hours_to_minutes: (v) => v * 60,
  hours_to_seconds: (v) => v * 3600,
  hours_to_ms: (v) => v * 3_600_000,
  minutes_to_hours: (v) => v / 60,
  minutes_to_seconds: (v) => v * 60,
  minutes_to_ms: (v) => v * 60_000,
  seconds_to_hours: (v) => v / 3600,
  seconds_to_minutes: (v) => v / 60,
  seconds_to_ms: (v) => v * 1000,
  ms_to_hours: (v) => v / 3_600_000,
  ms_to_minutes: (v) => v / 60_000,
  ms_to_seconds: (v) => v / 1000,
};

function swapUnits() {
  const fromSel = document.getElementById("convFromUnit");
  const toSel = document.getElementById("convToUnit");
  [fromSel.value, toSel.value] = [toSel.value, fromSel.value];
  updatePreview();
}

function updatePreview() {
  const value = parseFloat(document.getElementById("convValue").value);
  const from = document.getElementById("convFromUnit").value;
  const to = document.getElementById("convToUnit").value;
  const preview = document.getElementById("convToPreview");
  if (!preview) return;
  if (isNaN(value)) {
    preview.textContent = "—";
    return;
  }
  if (from === to) {
    preview.textContent = fmt(value);
    return;
  }
  const fn = convMap[`${from}_to_${to}`];
  if (fn) {
    preview.textContent = fmt(fn(value));
    preview.classList.remove("pop");
    void preview.offsetWidth;
    preview.classList.add("pop");
  }
}

document.getElementById("convValue")?.addEventListener("input", updatePreview);
document
  .getElementById("convFromUnit")
  ?.addEventListener("change", updatePreview);
document
  .getElementById("convToUnit")
  ?.addEventListener("change", updatePreview);

async function calcConvert() {
  const from = document.getElementById("convFromUnit").value;
  const to = document.getElementById("convToUnit").value;
  const value = parseFloat(document.getElementById("convValue").value);

  if (isNaN(value))
    return showError("resultConvert", "Please enter a valid number.");
  if (from === to)
    return showError("resultConvert", "Please select two different units.");

  showLoading("resultConvert");
  try {
    const d = await apiPost("/convert", {
      calculation_type: `${from}_to_${to}`,
      value,
    });
    document.getElementById("resultConvert").innerHTML = `
      <div class="result-card-highlight">
        <div class="result-equation">
          <div>
            <div class="eq-from">${fmt(d.original_value)}</div>
            <div class="eq-units">${d.original_unit}</div>
          </div>
          <div class="eq-arrow">→</div>
          <div>
            <div class="eq-to">${fmt(d.converted_value)}</div>
            <div class="eq-units">${d.converted_unit}</div>
          </div>
        </div>
        <div class="result-badge-row">
          <span class="badge badge-from">Input: ${fmt(d.original_value)} ${d.original_unit}</span>
          <span class="badge badge-to">Result: ${fmt(d.converted_value)} ${d.converted_unit}</span>
        </div>
      </div>`;
  } catch (e) {
    showError("resultConvert", e.message + " — Is the Python backend running?");
  }
}

// ── TIME ARITHMETIC ─────────────────────────────────────
async function calcArithmetic() {
  const get = (id) => parseInt(document.getElementById(id).value || "0", 10);
  const payload = {
    operation: currentOp,
    h1: get("a-h"),
    m1: get("a-m"),
    s1: get("a-s"),
    ms1: get("a-ms"),
    h2: get("b-h"),
    m2: get("b-m"),
    s2: get("b-s"),
    ms2: get("b-ms"),
  };
  showLoading("resultArith");
  try {
    const d = await apiPost("/arithmetic", payload);
    const sign = d.result_negative ? "−" : "";
    const timeStr = `${sign}${String(d.hours).padStart(2, "0")}:${String(d.minutes).padStart(2, "0")}:${String(d.seconds).padStart(2, "0")}.${String(d.milliseconds).padStart(3, "0")}`;
    document.getElementById("resultArith").innerHTML = `
      <div class="result-card">
        <div class="result-headline">${timeStr}</div>
        <div class="result-sub">Result of ${currentOp === "add" ? "addition" : "subtraction"} (HH:MM:SS.ms)</div>
        <div class="result-grid">
          <div class="stat-chip">
            <span class="stat-label">Total Hours</span>
            <span class="stat-value">${fmt(d.total_hours)} h</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Total Minutes</span>
            <span class="stat-value">${fmt(d.total_minutes)} min</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Total Seconds</span>
            <span class="stat-value">${fmt(d.total_seconds)} s</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Negative Result</span>
            <span class="stat-value">${d.result_negative ? "Yes" : "No"}</span>
          </div>
        </div>
      </div>`;
  } catch (e) {
    showError("resultArith", e.message + " — Is the Python backend running?");
  }
}

// ── DATE DIFFERENCE ─────────────────────────────────────
async function calcDateDiff() {
  const d1 = document.getElementById("diffDate1").value;
  const d2 = document.getElementById("diffDate2").value;
  if (!d1 || !d2) return showError("resultDiff", "Please select both dates.");

  showLoading("resultDiff");
  try {
    const d = await apiPost("/date-difference", { date1: d1, date2: d2 });
    document.getElementById("resultDiff").innerHTML = `
      <div class="result-card">
        <div class="result-headline">${d.difference_in_days.toLocaleString()} days</div>
        <div class="result-sub">
          Between ${d.earlier_date} and ${d.later_date}
          &nbsp;→&nbsp; ${d.years}y ${d.months}m ${d.remaining_days}d
        </div>
        <div class="result-grid">
          <div class="stat-chip">
            <span class="stat-label">Days</span>
            <span class="stat-value">${d.difference_in_days.toLocaleString()}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Weeks</span>
            <span class="stat-value">${fmt(d.difference_in_weeks)}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Months</span>
            <span class="stat-value">${fmt(d.difference_in_months)}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Years</span>
            <span class="stat-value">${fmt(d.difference_in_years)}</span>
          </div>
        </div>
      </div>`;
  } catch (e) {
    showError("resultDiff", e.message + " — Is the Python backend running?");
  }
}

// ── DATE ADJUST ─────────────────────────────────────────
async function calcDateAdjust() {
  const date = document.getElementById("adjustDate").value;
  if (!date) return showError("resultAdjust", "Please select a starting date.");
  const years = parseInt(document.getElementById("adjYears").value || "0", 10);
  const months = parseInt(
    document.getElementById("adjMonths").value || "0",
    10,
  );
  const days = parseInt(document.getElementById("adjDays").value || "0", 10);

  showLoading("resultAdjust");
  try {
    const d = await apiPost("/date-adjust", {
      date,
      years,
      months,
      days,
      operation: currentAdjOp,
    });
    document.getElementById("resultAdjust").innerHTML = `
      <div class="result-card">
        <div class="result-headline">${d.result_date}</div>
        <div class="result-sub">
          ${currentAdjOp === "add" ? "Adding" : "Subtracting"} ${years}y ${months}m ${days}d
          from ${d.start_date} → ${d.day_of_week}
        </div>
        <div class="result-grid">
          <div class="stat-chip">
            <span class="stat-label">Result Date</span>
            <span class="stat-value">${d.result_date}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Day of Week</span>
            <span class="stat-value">${d.day_of_week}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Total Days Changed</span>
            <span class="stat-value">${d.total_days_changed.toLocaleString()}</span>
          </div>
        </div>
      </div>`;
  } catch (e) {
    showError("resultAdjust", e.message + " — Is the Python backend running?");
  }
}

// ── BIRTHDAY ─────────────────────────────────────────────
async function calcBirthday() {
  const birthdate = document.getElementById("birthDate").value;
  if (!birthdate)
    return showError("resultBirthday", "Please enter a birth date.");
  if (new Date(birthdate) > new Date())
    return showError("resultBirthday", "Birth date cannot be in the future.");

  showLoading("resultBirthday");
  try {
    const d = await apiPost("/birthday", { birthdate });
    const bdayBanner = d.is_birthday_today
      ? `<div class="bday-banner">🎉 Happy Birthday! Today is the special day! 🎉</div>`
      : "";
    document.getElementById("resultBirthday").innerHTML = `
      <div class="result-card">
        ${bdayBanner}
        <div class="result-headline">${d.age_years} years old</div>
        <div class="result-sub">
          Born ${d.birthdate} (${d.day_of_week_born}) · Next birthday: ${d.next_birthday} (turns ${d.next_age})
        </div>
        <div class="result-grid">
          <div class="stat-chip">
            <span class="stat-label">Exact Age</span>
            <span class="stat-value">${d.age_years}y ${d.age_months}m ${d.age_days}d</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Days Lived</span>
            <span class="stat-value">${d.total_days_lived.toLocaleString()}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Weeks Lived</span>
            <span class="stat-value">${d.total_weeks_lived.toLocaleString()}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Next Birthday</span>
            <span class="stat-value">${d.next_birthday}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Days Until B-Day</span>
            <span class="stat-value">${d.days_until_birthday}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Months Until</span>
            <span class="stat-value">${d.months_until_birthday} months</span>
          </div>
        </div>
      </div>`;
  } catch (e) {
    showError(
      "resultBirthday",
      e.message + " — Is the Python backend running?",
    );
  }
}

// ── Enter key support ───────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const active = document.querySelector(".tab-content.active").id;
  const map = {
    "tab-convert": calcConvert,
    "tab-arithmetic": calcArithmetic,
    "tab-date-diff": calcDateDiff,
    "tab-date-adjust": calcDateAdjust,
    "tab-birthday": calcBirthday,
  };
  if (map[active]) map[active]();
});
