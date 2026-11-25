(() => {
  const requiredElement = (id) => {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Required thought detective element not found: #${id}`);
    }
    return element;
  };

  const form = requiredElement("thought-detective-form");
  if (!(form instanceof HTMLFormElement)) {
    throw new TypeError("The thought detective form is not an HTML form.");
  }

  const panels = Array.from(form.querySelectorAll("[data-step-panel]"));
  const progress = requiredElement("case-progress");
  const progressFill = requiredElement("case-progress-fill");
  const stepCount = requiredElement("case-step-count");
  const backButton = requiredElement("case-back");
  const nextButton = requiredElement("case-next");
  const finishButton = requiredElement("case-finish");
  const resultSection = requiredElement("case-result");
  const resultTitle = requiredElement("case-result-title");
  const resultList = requiredElement("case-result-list");
  const errorMessage = requiredElement("case-error");
  const copyButton = requiredElement("case-copy");
  const copyStatus = requiredElement("case-copy-status");
  const contextPrompt = requiredElement("case-context-prompt");
  const evidencePrompts = requiredElement("case-evidence-prompts");
  const emotionGuidance = requiredElement("case-emotion-guidance");
  const conviction = requiredElement("case-conviction");
  const convictionValue = requiredElement("case-conviction-value");
  const convictionPrompt = requiredElement("case-conviction-prompt");

  if (panels.length !== 5) {
    throw new Error(`Expected 5 thought detective steps, found ${panels.length}.`);
  }
  if (!(conviction instanceof HTMLInputElement) || !(convictionValue instanceof HTMLOutputElement)) {
    throw new TypeError("The conviction control or its output has an unexpected element type.");
  }

  const caseLabels = {
    mistake: "Помилка чи невдача",
    criticism: "Критика",
    conflict: "Конфлікт чи непорозуміння",
    uncertainty: "Невизначеність",
    other: "Інша ситуація"
  };
  const emotionLabels = {
    anxiety: "Тривога",
    sadness: "Сум",
    anger: "Злість",
    guilt: "Провина",
    other: ""
  };
  const casePrompts = {
    mistake: [
      "Що саме не вийшло так, як хотілося?",
      "Що було під твоїм контролем, а що — ні?"
    ],
    criticism: [
      "Що саме було сказано, якщо відокремити слова від висновків?",
      "Які ще пояснення можуть бути в цих слів?"
    ],
    conflict: [
      "Що ти знаєш про ситуацію напевно?",
      "Якої частини історії ти можеш поки не знати?"
    ],
    uncertainty: [
      "Що вже відомо, а що поки залишається невідомим?",
      "Який маленький крок може додати ясності?"
    ],
    other: [
      "Які факти ти помічаєш?",
      "Якої інформації може бракувати?"
    ]
  };
  const caseIntros = {
    mistake: "Опиши, що саме сталося. Спробуй відділити подію від оцінки себе.",
    criticism: "Згадай, що саме було сказано. Можна описати без імен і подробиць.",
    conflict: "Опиши ситуацію так, як ти її пам’ятаєш. Достатньо того, що вже відомо.",
    uncertainty: "Що саме зараз здається невизначеним? Можна почати з того, що вже відомо.",
    other: "Опиши ситуацію так, як пам’ятаєш її. Можна без імен і подробиць."
  };
  const emotionMessages = {
    anxiety: "Тривогу можна помітити без потреби негайно її усувати.",
    sadness: "Суму можна визнати й дати собі час — не обов’язково шукати рішення одразу.",
    anger: "Злість може сигналізувати, що щось важливе для тебе. Можна дослідити її без осуду.",
    guilt: "Почуття провини — це почуття, а не остаточний висновок про тебе.",
    other: "Будь-яке почуття можна помітити без оцінки й без потреби його змінювати."
  };
  const convictionMessages = {
    low: "Що змушує тебе вважати цю думку можливою? Чи є щось, що ти ще не врахував(-ла)?",
    middle: "Які частини цієї думки — факти, а які можуть бути припущеннями?",
    high: "Не потрібно змушувати себе сумніватися. Якої інформації може бракувати? Що б ти сказав(-ла) близькій людині?"
  };
  const textFields = [
    { id: "case-situation", label: "Ситуація" },
    { id: "case-first-thought", label: "Перша думка" },
    { id: "case-supporting-facts", label: "Що ніби підтверджує думку" },
    { id: "case-other-facts", label: "Що може показувати інший бік" },
    { id: "case-balanced-view", label: "Інший погляд" },
    { id: "case-next-step", label: "Маленький наступний крок" }
  ];

  let currentStep = 0;
  let summaryText = "";

  const getRoute = () => selectedValue("mode") === "deep"
    ? panels.map((_, index) => index)
    : [0, 1, 4];

  const selectedValue = (name) => {
    const selected = form.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : "";
  };

  const updateGuidance = () => {
    const caseType = selectedValue("caseType") || "other";
    const mode = selectedValue("mode") || "quick";
    const emotion = selectedValue("emotion") || "other";
    const confidence = Number(conviction.value);
    const prompts = casePrompts[caseType] || casePrompts.other;
    const visiblePromptCount = mode === "deep" ? prompts.length : 1;
    const reframeHeading = requiredElement("case-reframe-title");
    const reframeIntro = requiredElement("case-reframe-intro");

    contextPrompt.textContent = caseIntros[caseType] || caseIntros.other;
    reframeHeading.textContent = mode === "deep" ? "Знайди інший погляд" : "Сформулюй інший погляд";
    reframeIntro.textContent = mode === "deep"
      ? "Не обов’язково бути позитивним(-ою). Спробуй лише сформулювати думку, яка враховує більше обставин."
      : "Спираючись на ситуацію й першу думку, спробуй знайти ще одне можливе пояснення. Можна відповісти одним реченням.";
    emotionGuidance.textContent = emotionMessages[emotion] || emotionMessages.other;
    convictionPrompt.textContent = confidence <= 2
      ? convictionMessages.low
      : confidence >= 4
        ? convictionMessages.high
        : convictionMessages.middle;
    convictionValue.value = `${conviction.value} із 5`;
    convictionValue.textContent = `${conviction.value} із 5`;

    evidencePrompts.replaceChildren();
    prompts.slice(0, visiblePromptCount).forEach((prompt) => {
      const item = document.createElement("li");
      item.textContent = prompt;
      evidencePrompts.append(item);
    });

    updateStep(false);
  };

  const updateStep = (moveFocus) => {
    const route = getRoute();
    currentStep = Math.min(currentStep, route.length - 1);
    const activePanel = route[currentStep];

    panels.forEach((panel, index) => {
      panel.hidden = index !== activePanel;
    });

    const visibleStep = currentStep + 1;
    const isLastStep = currentStep === route.length - 1;
    stepCount.textContent = `Крок ${visibleStep} із ${route.length}`;
    progress.setAttribute("aria-valuenow", String(visibleStep));
    progress.setAttribute("aria-valuemax", String(route.length));
    progressFill.style.width = `${(visibleStep / route.length) * 100}%`;
    backButton.disabled = currentStep === 0;
    nextButton.hidden = isLastStep;
    nextButton.classList.toggle("hidden", isLastStep);
    finishButton.hidden = !isLastStep;
    finishButton.classList.toggle("hidden", !isLastStep);

    if (moveFocus) {
      const heading = panels[activePanel].querySelector("h2");
      if (heading instanceof HTMLElement) {
        heading.focus();
      }
    }
  };

  const clearResult = () => {
    if (!resultSection.hidden) {
      resultSection.hidden = true;
      summaryText = "";
      copyStatus.textContent = "";
      errorMessage.textContent = "";
      errorMessage.hidden = true;
    }
  };

  const renderResult = () => {
    const mode = selectedValue("mode") || "quick";
    const caseType = selectedValue("caseType") || "other";
    const entries = [
      { label: "Формат", value: mode === "deep" ? "Докладніше" : "Швидко" },
      { label: "Тип ситуації", value: caseLabels[caseType] || caseLabels.other }
    ];

    const includedFields = mode === "deep"
      ? textFields
      : textFields.filter(({ id }) => !["case-supporting-facts", "case-other-facts"].includes(id));

    if (mode === "deep") {
      const emotion = selectedValue("emotion") || "other";
      entries.push(
        { label: "Почуття", value: emotionLabels[emotion] || "" },
        { label: "Наскільки переконливою здається думка", value: `${conviction.value} із 5` }
      );
    }

    includedFields.forEach((field) => {
      const input = requiredElement(field.id);
      const value = input.value.trim();
      if (value) {
        entries.push({ label: field.label, value });
      }
    });

    resultList.replaceChildren();
    entries.forEach((entry) => {
      if (!entry.value) {
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.className = "border-b border-purple-100 pb-3 last:border-b-0 last:pb-0";

      const label = document.createElement("dt");
      label.className = "text-sm font-semibold text-purple-800";
      label.textContent = entry.label;

      const value = document.createElement("dd");
      value.className = "mt-1 whitespace-pre-wrap leading-7 text-slate-700";
      value.textContent = entry.value;

      wrapper.append(label, value);
      resultList.append(wrapper);
    });

    summaryText = entries
      .filter((entry) => entry.value)
      .map((entry) => `${entry.label}: ${entry.value}`)
      .join("\n\n");

    resultSection.hidden = false;
    copyStatus.textContent = "";
    errorMessage.textContent = "";
    errorMessage.hidden = true;
    resultTitle.focus();
    resultSection.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  form.addEventListener("input", () => {
    clearResult();
    updateGuidance();
  });

  form.addEventListener("change", () => {
    clearResult();
    updateGuidance();
  });

  backButton.addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep -= 1;
      updateStep(true);
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentStep < getRoute().length - 1) {
      currentStep += 1;
      updateStep(true);
    }
  });

  finishButton.addEventListener("click", renderResult);

  copyButton.addEventListener("click", async () => {
    if (!summaryText) {
      errorMessage.textContent = "Спочатку сформуй картку справи.";
      errorMessage.hidden = false;
      return;
    }

    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      errorMessage.textContent = "Копіювання недоступне в цьому браузері. Виділи текст картки й скопіюй його вручну.";
      errorMessage.hidden = false;
      return;
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      copyStatus.textContent = "Картку скопійовано.";
      errorMessage.textContent = "";
      errorMessage.hidden = true;
    } catch (error) {
      console.error("Could not copy the thought detective summary.", error);
      errorMessage.textContent = "Не вдалося скопіювати картку. Виділи текст і скопіюй його вручну.";
      errorMessage.hidden = false;
    }
  });

  form.addEventListener("reset", () => {
    window.requestAnimationFrame(() => {
      currentStep = 0;
      summaryText = "";
      resultList.replaceChildren();
      resultSection.hidden = true;
      copyStatus.textContent = "";
      errorMessage.textContent = "";
      errorMessage.hidden = true;
      updateGuidance();
      updateStep(false);
    });
  });

  updateGuidance();
  updateStep(false);
})();
