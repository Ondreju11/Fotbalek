(function () {
  const form = document.getElementById("registration-form");
  const messageEl = document.getElementById("form-message");
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

  let supabaseClient = null;
  let tableName = "registrations";

  init();

  function init() {
    const config = window.APP_CONFIG || {};

    if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      setMessage(
        "Aplikace neni nakonfigurovana. Dopln SUPABASE_URL a SUPABASE_ANON_KEY do config.js.",
        "error"
      );
      submitBtn.disabled = true;
      return;
    }

    tableName = config.TABLE_NAME || tableName;
    supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    bindEvents();
    setFieldState(getSelectedType());
  }

  function bindEvents() {
    for (const input of typeInputs) {
      input.addEventListener("change", () => setFieldState(getSelectedType()));
    }

    teamNameLaterInput.addEventListener("change", applyTeamOptionalState);
    playerTwoLaterInput.addEventListener("change", applyTeamOptionalState);
    form.addEventListener("submit", handleSubmit);
  }

  function getSelectedType() {
    const selected = form.querySelector('input[name="registrationType"]:checked');
    return selected ? selected.value : "team";
  }

  function setFieldState(type) {
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
      applyTeamOptionalState();
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
  }

  function applyTeamOptionalState() {
    const isTeam = getSelectedType() === "team";
    if (!isTeam) {
      teamNameInput.disabled = false;
      playerTwoInput.disabled = false;
      teamNameInput.required = false;
      playerTwoInput.required = false;
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
  }

  function normalizeText(value) {
    return (value || "").trim().replace(/\s+/g, " ");
  }

  function normalizeEmail(value) {
    return (value || "").trim().toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
  }

  function setMessage(text, kind) {
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (kind) {
      messageEl.classList.add(kind);
    }
  }

  function buildPayload() {
    const type = getSelectedType();
    const contactEmail = normalizeEmail(contactEmailInput.value);

    if (!contactEmail || !isValidEmail(contactEmail)) {
      throw new Error("Vypln platny kontaktni email.");
    }

    if (type === "team") {
      const teamNameLater = teamNameLaterInput.checked;
      const playerTwoLater = playerTwoLaterInput.checked;

      const teamName = teamNameLater ? null : normalizeText(teamNameInput.value);
      const playerOne = normalizeText(playerOneInput.value);
      const playerTwo = playerTwoLater ? null : normalizeText(playerTwoInput.value);

      if (!playerOne) {
        throw new Error("Vypln jmeno hrace 1.");
      }
      if (!teamNameLater && !teamName) {
        throw new Error("Vypln nazev tymu nebo zaskrtni, ze ho doplnite pozdeji.");
      }
      if (!playerTwoLater && !playerTwo) {
        throw new Error("Vypln hrace 2 nebo zaskrtni, ze ho doplnis na miste.");
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
      throw new Error("Vypln jmeno hrace.");
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
      setMessage(err.message || "Formular obsahuje chybu.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Odesilam...";

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
      setFieldState("team");
      setMessage("Registrace byla ulozena. Dekujeme.", "success");
    } catch (err) {
      setMessage(
        "Registraci se nepodarilo ulozit. Zkus to znovu nebo kontaktuj poradatele.",
        "error"
      );
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Odeslat registraci";
    }
  }
})();
