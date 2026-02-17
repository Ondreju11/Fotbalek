(function () {
  const form = document.getElementById("registration-form");
  const messageEl = document.getElementById("form-message");
  const submitBtn = document.getElementById("submitBtn");
  const teamFields = document.getElementById("team-fields");
  const individualFields = document.getElementById("individual-fields");
  const typeInputs = form.querySelectorAll('input[name="registrationType"]');

  const teamNameInput = document.getElementById("teamName");
  const playerOneInput = document.getElementById("playerOne");
  const playerTwoInput = document.getElementById("playerTwo");
  const individualNameInput = document.getElementById("individualName");

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

    teamNameInput.required = isTeam;
    playerOneInput.required = isTeam;
    playerTwoInput.required = isTeam;
    individualNameInput.required = !isTeam;

    if (isTeam) {
      individualNameInput.value = "";
    } else {
      teamNameInput.value = "";
      playerOneInput.value = "";
      playerTwoInput.value = "";
    }

    setMessage("");
  }

  function normalizeText(value) {
    return (value || "").trim().replace(/\s+/g, " ");
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

    if (type === "team") {
      const teamName = normalizeText(teamNameInput.value);
      const playerOne = normalizeText(playerOneInput.value);
      const playerTwo = normalizeText(playerTwoInput.value);

      if (!teamName || !playerOne || !playerTwo) {
        throw new Error("Vypln nazev tymu a oba hrace.");
      }

      return {
        registration_type: "team",
        team_name: teamName,
        player_one_name: playerOne,
        player_two_name: playerTwo
      };
    }

    const individualName = normalizeText(individualNameInput.value);
    if (!individualName) {
      throw new Error("Vypln jmeno hrace.");
    }

    return {
      registration_type: "individual",
      team_name: null,
      player_one_name: individualName,
      player_two_name: null
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
