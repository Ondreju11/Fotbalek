(function () {
  const form = document.getElementById("registration-form");
  const messageEl = document.getElementById("form-message");
  const draftNoteEl = document.getElementById("draft-note");
  const submitBtn = document.getElementById("submitBtn");
  const teamFields = document.getElementById("team-fields");
  const individualFields = document.getElementById("individual-fields");
  const typeInputs = form.querySelectorAll('input[name="registrationType"]');

  const teamNameInput = document.getElementById("teamName");
  const teamNameLaterInput = document.getElementById("teamNameLater");
  const playerOneInput = document.getElementById("playerOne");
  const playerTwoInput = document.getElementById("playerTwo");
  const playerTwoLaterInput = document.getElementById("playerTwoLater");
  const individualNameInput = document.getElementById("individualName");
  const contactEmailInput = document.getElementById("contactEmail");
  const adminExportKeyInput = document.getElementById("adminExportKey");
  const exportBtn = document.getElementById("exportBtn");
  const exportMessageEl = document.getElementById("export-message");

  let supabaseClient = null;
  let tableName = "registrations";

  const DRAFT_KEY = "fotbalek_registration_draft_v1";
  const ADMIN_KEY_STORAGE = "fotbalek_admin_export_key_v1";

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

    bindEvents();
    restoreDraft();
    restoreAdminExportKey();
    setFieldState(getSelectedType(), false);
  }

  function bindEvents() {
    for (const input of typeInputs) {
      input.addEventListener("change", () => setFieldState(getSelectedType()));
    }

    teamNameLaterInput.addEventListener("change", applyTeamOptionalState);
    playerTwoLaterInput.addEventListener("change", applyTeamOptionalState);
    teamNameInput.addEventListener("input", saveDraft);
    playerOneInput.addEventListener("input", saveDraft);
    playerTwoInput.addEventListener("input", saveDraft);
    individualNameInput.addEventListener("input", saveDraft);
    contactEmailInput.addEventListener("input", saveDraft);

    if (adminExportKeyInput) {
      adminExportKeyInput.addEventListener("input", handleAdminKeyInput);
    }
    if (exportBtn) {
      exportBtn.addEventListener("click", handleExportCsv);
    }

    form.addEventListener("submit", handleSubmit);
  }

  function getSelectedType() {
    const selected = form.querySelector('input[name="registrationType"]:checked');
    return selected ? selected.value : "team";
  }

  function setFieldState(type, persistDraft = true) {
    const isTeam = type === "team";

    teamFields.classList.toggle("hidden", !isTeam);
    teamFields.setAttribute("aria-hidden", String(!isTeam));
    individualFields.classList.toggle("hidden", isTeam);
    individualFields.setAttribute("aria-hidden", String(isTeam));

    playerOneInput.required = isTeam;
    individualNameInput.required = !isTeam;
    contactEmailInput.required = true;

    if (isTeam) {
      individualNameInput.value = "";
      applyTeamOptionalState(false);
    } else {
      teamNameInput.value = "";
      playerOneInput.value = "";
      playerTwoInput.value = "";
      teamNameLaterInput.checked = false;
      playerTwoLaterInput.checked = false;
      teamNameInput.disabled = false;
      playerTwoInput.disabled = false;
      teamNameInput.required = false;
      playerTwoInput.required = false;
    }

    setMessage("");
    if (persistDraft) {
      saveDraft();
    }
  }

  function applyTeamOptionalState(persistDraft = true) {
    const isTeam = getSelectedType() === "team";
    if (!isTeam) {
      teamNameInput.disabled = false;
      playerTwoInput.disabled = false;
      teamNameInput.required = false;
      playerTwoInput.required = false;
      if (persistDraft) {
        saveDraft();
      }
      return;
    }

    const teamNameLater = teamNameLaterInput.checked;
    const playerTwoLater = playerTwoLaterInput.checked;

    teamNameInput.disabled = teamNameLater;
    playerTwoInput.disabled = playerTwoLater;
    teamNameInput.required = !teamNameLater;
    playerTwoInput.required = !playerTwoLater;

    if (teamNameLater) {
      teamNameInput.value = "";
    }
    if (playerTwoLater) {
      playerTwoInput.value = "";
    }

    setMessage("");
    if (persistDraft) {
      saveDraft();
    }
  }

  function normalizeText(value) {
    return (value || "").trim().replace(/\s+/g, " ");
  }

  function normalizeEmail(value) {
    return (value || "").trim().toLowerCase();
  }

  function normalizeAdminKey(value) {
    return (value || "").trim();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
  }

  function setDraftNote(text) {
    if (!draftNoteEl) {
      return;
    }
    draftNoteEl.textContent = text || "";
  }

  function setMessage(text, kind) {
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (kind) {
      messageEl.classList.add(kind);
    }
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

  function setExportMessage(text, kind) {
    if (!exportMessageEl) {
      return;
    }

    exportMessageEl.textContent = text || "";
    exportMessageEl.classList.remove("error", "success");
    if (kind) {
      exportMessageEl.classList.add(kind);
    }
  }

  function getDraftData() {
    return {
      registrationType: getSelectedType(),
      teamName: teamNameInput.value,
      teamNameLater: teamNameLaterInput.checked,
      playerOne: playerOneInput.value,
      playerTwo: playerTwoInput.value,
      playerTwoLater: playerTwoLaterInput.checked,
      individualName: individualNameInput.value,
      contactEmail: contactEmailInput.value
    };
  }

  function hasDraftContent(draft) {
    if (!draft) {
      return false;
    }

    return Boolean(
      draft.registrationType === "individual" ||
        normalizeText(draft.teamName) ||
        draft.teamNameLater ||
        normalizeText(draft.playerOne) ||
        normalizeText(draft.playerTwo) ||
        draft.playerTwoLater ||
        normalizeText(draft.individualName) ||
        normalizeEmail(draft.contactEmail)
    );
  }

  function saveDraft() {
    try {
      const draft = getDraftData();
      if (!hasDraftContent(draft)) {
        window.localStorage.removeItem(DRAFT_KEY);
        setDraftNote("");
        return;
      }

      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftNote("Rozpracovaná data se ukládají automaticky.");
    } catch (err) {
      console.error("Uložení rozpracovaných dat selhalo.", err);
    }
  }

  function restoreDraft() {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        return;
      }

      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== "object") {
        return;
      }

      if (draft.registrationType === "team" || draft.registrationType === "individual") {
        const typeInput = form.querySelector(
          `input[name="registrationType"][value="${draft.registrationType}"]`
        );
        if (typeInput) {
          typeInput.checked = true;
        }
      }

      teamNameInput.value = draft.teamName || "";
      teamNameLaterInput.checked = Boolean(draft.teamNameLater);
      playerOneInput.value = draft.playerOne || "";
      playerTwoInput.value = draft.playerTwo || "";
      playerTwoLaterInput.checked = Boolean(draft.playerTwoLater);
      individualNameInput.value = draft.individualName || "";
      contactEmailInput.value = draft.contactEmail || "";

      if (hasDraftContent(draft)) {
        setDraftNote("Načtena rozpracovaná registrace.");
      }
    } catch (err) {
      window.localStorage.removeItem(DRAFT_KEY);
      console.error("Načtení rozpracovaných dat selhalo.", err);
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      console.error("Mazání rozpracovaných dat selhalo.", err);
    }
    setDraftNote("");
  }

  function buildConfirmationSummary(payload) {
    const isTeam = payload.registration_type === "team";
    const teamName = payload.team_name_pending ? "Doplníme později" : payload.team_name || "-";
    const playerTwo = payload.player_two_pending ? "Doplním na místě" : payload.player_two_name || "-";

    if (isTeam) {
      return [
        "Zkontroluj údaje před odesláním:",
        "",
        "Typ registrace: Tým (2 hráči)",
        `Název týmu: ${teamName}`,
        `Hráč 1: ${payload.player_one_name || "-"}`,
        `Hráč 2: ${playerTwo}`,
        `Kontaktní e-mail: ${payload.contact_email}`
      ].join("\n");
    }

    return [
      "Zkontroluj údaje před odesláním:",
      "",
      "Typ registrace: Jednotlivec (1 hráč)",
      `Jméno hráče: ${payload.player_one_name || "-"}`,
      `Kontaktní e-mail: ${payload.contact_email}`
    ].join("\n");
  }

  function restoreAdminExportKey() {
    if (!adminExportKeyInput) {
      return;
    }

    try {
      adminExportKeyInput.value = window.localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    } catch (err) {
      console.error("Načtení exportního klíče selhalo.", err);
    }
  }

  function handleAdminKeyInput() {
    if (!adminExportKeyInput) {
      return;
    }

    try {
      window.localStorage.setItem(ADMIN_KEY_STORAGE, adminExportKeyInput.value || "");
    } catch (err) {
      console.error("Uložení exportního klíče selhalo.", err);
    }
  }

  function csvEscape(value) {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function toCzechRegistrationType(value) {
    return value === "team" ? "Tým" : "Jednotlivec";
  }

  function boolToCz(value) {
    return value ? "Ano" : "Ne";
  }

  function createCsv(rows) {
    const header = [
      "Vytvořeno",
      "Typ registrace",
      "Kontaktní e-mail",
      "Název týmu",
      "Název týmu doplněn později",
      "Hráč 1",
      "Hráč 2",
      "Hráč 2 doplněn na místě"
    ];

    const lines = [header.map(csvEscape).join(",")];
    for (const row of rows) {
      lines.push(
        [
          row.created_at || "",
          toCzechRegistrationType(row.registration_type),
          row.contact_email || "",
          row.team_name || "",
          boolToCz(row.team_name_pending),
          row.player_one_name || "",
          row.player_two_name || "",
          boolToCz(row.player_two_pending)
        ]
          .map(csvEscape)
          .join(",")
      );
    }

    return lines.join("\r\n");
  }

  function downloadCsv(csvContent) {
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `registrace_${datePart}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExportCsv() {
    if (!supabaseClient || !exportBtn || !adminExportKeyInput) {
      return;
    }

    setExportMessage("");
    const adminKey = normalizeAdminKey(adminExportKeyInput.value);
    if (!adminKey) {
      setExportMessage("Zadej exportní klíč.", "error");
      return;
    }

    exportBtn.disabled = true;
    exportBtn.textContent = "Generuji CSV...";

    try {
      const { data, error } = await supabaseClient.rpc("export_registrations", {
        p_key: adminKey
      });

      if (error) {
        throw error;
      }

      const rows = Array.isArray(data) ? data : [];
      const csv = createCsv(rows);
      downloadCsv(csv);
      setExportMessage(`CSV staženo. Počet záznamů: ${rows.length}.`, "success");
    } catch (err) {
      const errText = String(err?.message || "");
      if (errText.includes("Neplatný exportní klíč")) {
        setExportMessage("Neplatný exportní klíč.", "error");
      } else {
        setExportMessage(
          "Export se nepodařil. Zkontroluj SQL migraci a nastavení exportního klíče.",
          "error"
        );
      }
      console.error(err);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = "Stáhnout CSV";
    }
  }

  function buildPayload() {
    const type = getSelectedType();
    const contactEmail = normalizeEmail(contactEmailInput.value);

    if (!contactEmail || !isValidEmail(contactEmail)) {
      throw new Error("Vyplň platný kontaktní e-mail.");
    }

    if (type === "team") {
      const teamNameLater = teamNameLaterInput.checked;
      const playerTwoLater = playerTwoLaterInput.checked;

      const teamName = teamNameLater ? null : normalizeText(teamNameInput.value);
      const playerOne = normalizeText(playerOneInput.value);
      const playerTwo = playerTwoLater ? null : normalizeText(playerTwoInput.value);

      if (!playerOne) {
        throw new Error("Vyplň jméno hráče 1.");
      }
      if (!teamNameLater && !teamName) {
        throw new Error("Vyplň název týmu nebo zaškrtni, že ho doplníte později.");
      }
      if (!playerTwoLater && !playerTwo) {
        throw new Error("Vyplň hráče 2 nebo zaškrtni, že ho doplníš na místě.");
      }

      return {
        registration_type: "team",
        contact_email: contactEmail,
        team_name: teamName,
        team_name_pending: teamNameLater,
        player_one_name: playerOne,
        player_two_name: playerTwo,
        player_two_pending: playerTwoLater
      };
    }

    const individualName = normalizeText(individualNameInput.value);
    if (!individualName) {
      throw new Error("Vyplň jméno hráče.");
    }

    return {
      registration_type: "individual",
      contact_email: contactEmail,
      team_name: null,
      team_name_pending: false,
      player_one_name: individualName,
      player_two_name: null,
      player_two_pending: false
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      setMessage(err.message || "Formulář obsahuje chybu.", "error");
      return;
    }

    if (!window.confirm(buildConfirmationSummary(payload))) {
      setMessage("Odeslání zrušeno. Údaje můžeš upravit.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Odesílám...";

    try {
      const { error } = await supabaseClient.from(tableName).insert(payload);
      if (error) {
        throw error;
      }

      form.reset();
      const defaultType = form.querySelector('input[name="registrationType"][value="team"]');
      if (defaultType) {
        defaultType.checked = true;
      }
      clearDraft();
      setFieldState("team", false);
      setMessage("Registrace byla uložena. Děkujeme.", "success");
    } catch (err) {
      setMessage(getFriendlyInsertError(err), "error");
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Odeslat registraci";
    }
  }
})();
