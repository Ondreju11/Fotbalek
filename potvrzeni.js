(function () {
  const summaryEl = document.getElementById("confirm-summary");
  const messageEl = document.getElementById("confirm-message");
  const submitBtn = document.getElementById("confirmSubmitBtn");

  const PENDING_SUBMISSION_KEY = "fotbalek_pending_submission_v1";
  const DRAFT_KEY = "fotbalek_registration_draft_v1";

  let supabaseClient = null;
  let tableName = "registrations";
  let payload = null;

  init();

  function init() {
    const config = window.APP_CONFIG || {};

    if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      setMessage(
        "Aplikace není nakonfigurovaná. Doplň SUPABASE_URL a SUPABASE_ANON_KEY do config.js.",
        "error"
      );
      submitBtn.disabled = true;
      return;
    }

    tableName = config.TABLE_NAME || tableName;
    supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    payload = loadPendingPayload();

    if (!payload) {
      setMessage("Nenašel jsem data k potvrzení. Vrať se na registrační formulář.", "error");
      submitBtn.disabled = true;
      return;
    }

    renderSummary(payload);
    submitBtn.addEventListener("click", handleConfirmSubmit);
  }

  function normalizeText(value) {
    return (value || "").trim().replace(/\s+/g, " ");
  }

  function normalizeEmail(value) {
    return (value || "").trim().toLowerCase();
  }

  function isValidPayload(data) {
    if (!data || typeof data !== "object") {
      return false;
    }

    const type = data.registration_type;
    const email = normalizeEmail(data.contact_email);
    if ((type !== "team" && type !== "individual") || !email) {
      return false;
    }

    if (type === "individual") {
      return Boolean(normalizeText(data.player_one_name));
    }

    const playerOne = normalizeText(data.player_one_name);
    const hasTeamName = Boolean(normalizeText(data.team_name)) || Boolean(data.team_name_pending);
    const hasPlayerTwo = Boolean(normalizeText(data.player_two_name)) || Boolean(data.player_two_pending);
    return Boolean(playerOne && hasTeamName && hasPlayerTwo);
  }

  function loadPendingPayload() {
    try {
      const raw = window.sessionStorage.getItem(PENDING_SUBMISSION_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!isValidPayload(parsed)) {
        return null;
      }

      return parsed;
    } catch (err) {
      console.error("Načtení čekající registrace selhalo.", err);
      return null;
    }
  }

  function setMessage(text, kind) {
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (kind) {
      messageEl.classList.add(kind);
    }
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function rowHtml(label, value) {
    return `<div class="confirm-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
  }

  function renderSummary(data) {
    const rows = [];
    const isTeam = data.registration_type === "team";

    rows.push(rowHtml("Typ registrace", isTeam ? "Tým (2 hráči)" : "Jednotlivec (1 hráč)"));

    if (isTeam) {
      rows.push(
        rowHtml("Název týmu", data.team_name_pending ? "Doplníme později" : data.team_name || "-")
      );
      rows.push(rowHtml("Hráč 1", data.player_one_name || "-"));
      rows.push(
        rowHtml("Hráč 2", data.player_two_pending ? "Doplním na místě" : data.player_two_name || "-")
      );
    } else {
      rows.push(rowHtml("Jméno hráče", data.player_one_name || "-"));
    }

    rows.push(rowHtml("Kontaktní e-mail", data.contact_email || "-"));
    summaryEl.innerHTML = rows.join("");
  }

  function getFriendlyInsertError(err) {
    const rawMessage = String(err?.message || "");
    const rawDetails = String(err?.details || "");
    const rawHint = String(err?.hint || "");
    const joined = `${rawMessage} ${rawDetails} ${rawHint}`.toLowerCase();

    if (
      joined.includes("team_name_pending") ||
      joined.includes("player_two_pending") ||
      joined.includes("contact_email") ||
      joined.includes("registration_shape")
    ) {
      return (
        "Databáze není po posledních změnách aktualizovaná. " +
        "V Supabase spusť aktuální soubor supabase.sql a zkus odeslání znovu."
      );
    }

    if (joined.includes("row-level security") || joined.includes("policy")) {
      return "V Supabase chybí insert policy pro anon. Spusť aktuální supabase.sql.";
    }

    return "Registraci se nepodařilo uložit. Zkus to znovu nebo kontaktuj pořadatele.";
  }

  function cleanupAfterSubmit() {
    try {
      window.sessionStorage.removeItem(PENDING_SUBMISSION_KEY);
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      console.error("Mazání pomocných dat selhalo.", err);
    }
  }

  async function handleConfirmSubmit() {
    if (!supabaseClient || !payload) {
      return;
    }

    setMessage("");
    submitBtn.disabled = true;
    submitBtn.textContent = "Odesílám...";

    try {
      const { error } = await supabaseClient.from(tableName).insert(payload);
      if (error) {
        throw error;
      }

      cleanupAfterSubmit();
      window.location.replace("./?status=submitted");
    } catch (err) {
      setMessage(getFriendlyInsertError(err), "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Potvrdit a odeslat";
      console.error(err);
    }
  }
})();
