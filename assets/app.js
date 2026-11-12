/* ==========================================================================
   Agent Lab — app logic
   Vanilla JS, no build step. State lives in localStorage.
   ========================================================================== */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STORAGE_KEY = "agentlab.state.v1";
  const UNIT_IDS = ["m1", "m2", "m3", "m4", "m5", "capstone", "m7"];

  const UNITS = [
    { id: "m1", label: "The agent loop", short: "Module 01", shortLabel: "Loop", route: "#/module/1" },
    { id: "m2", label: "Set up your lab", short: "Module 02", shortLabel: "Setup", route: "#/module/2" },
    { id: "m3", label: "Your first agent", short: "Module 03", shortLabel: "Agent", route: "#/module/3" },
    { id: "m4", label: "Skills", short: "Module 04", shortLabel: "Skills", route: "#/module/4" },
    { id: "m5", label: "Tools & permissions", short: "Module 05", shortLabel: "Tools", route: "#/module/5" },
    { id: "capstone", label: "Onboarding Scout", short: "Capstone", shortLabel: "Mission", route: "#/capstone" },
    { id: "m7", label: "Evaluate & ship", short: "Module 07", shortLabel: "Ship", route: "#/module/7" }
  ];

  const ROUTES = {
    overview: { view: "view-overview", nav: "overview", crumb: "Overview", title: "Overview" },
    "module/1": { view: "view-m1", nav: "m1", crumb: "Module 01 · The agent loop", title: "The agent loop" },
    "module/2": { view: "view-m2", nav: "m2", crumb: "Module 02 · Set up your lab", title: "Set up your lab" },
    "module/3": { view: "view-m3", nav: "m3", crumb: "Module 03 · Your first agent", title: "Your first agent" },
    "module/4": { view: "view-m4", nav: "m4", crumb: "Module 04 · Skills", title: "Skills" },
    "module/5": { view: "view-m5", nav: "m5", crumb: "Module 05 · Tools & permissions", title: "Tools & permissions" },
    capstone: { view: "view-capstone", nav: "capstone", crumb: "Capstone · Onboarding Scout", title: "Onboarding Scout" },
    "module/7": { view: "view-m7", nav: "m7", crumb: "Module 07 · Evaluate & ship", title: "Evaluate & ship" },
    studio: { view: "view-studio", nav: "studio", crumb: "Build studio", title: "Build studio" },
    resources: { view: "view-resources", nav: "resources", crumb: "Resource shelf", title: "Resource shelf" }
  };

  const VIEW_ROUTES = {
    "view-overview": { route: "#/overview", key: "overview" },
    "view-m1": { route: "#/module/1", key: "module/1" },
    "view-m2": { route: "#/module/2", key: "module/2" },
    "view-m3": { route: "#/module/3", key: "module/3" },
    "view-m4": { route: "#/module/4", key: "module/4" },
    "view-m5": { route: "#/module/5", key: "module/5" },
    "view-capstone": { route: "#/capstone", key: "capstone" },
    "view-m7": { route: "#/module/7", key: "module/7" },
    "view-studio": { route: "#/studio", key: "studio" },
    "view-resources": { route: "#/resources", key: "resources" }
  };

  const defaultState = {
    name: "",
    theme: null,
    completed: {},
    quiz: {},
    brief: { job: "", inputs: "", tools: "", boundaries: "", proof: "" },
    capstone: { steps: {}, audit: {}, reflection: "" },
    studio: { agent: null, skill: null },
    lastRoute: null
  };

  let state = loadState();
  let simTimers = [];
  let toastTimer = null;
  let briefSaveTimer = null;
  let searchIndex = [];
  let searchResults = [];
  let searchSelected = 0;
  let lastFocused = null;

  /* ------------------------------------------------------------------ */
  /* State                                                              */
  /* ------------------------------------------------------------------ */

  function loadState() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch (_) {
      saved = {};
    }
    return {
      ...defaultState,
      ...saved,
      completed: { ...(saved.completed || {}) },
      quiz: { ...(saved.quiz || {}) },
      brief: { ...defaultState.brief, ...(saved.brief || {}) },
      capstone: {
        ...defaultState.capstone,
        ...(saved.capstone || {}),
        steps: { ...((saved.capstone && saved.capstone.steps) || {}) },
        audit: { ...((saved.capstone && saved.capstone.audit) || {}) }
      },
      studio: {
        agent: (saved.studio && saved.studio.agent) || null,
        skill: (saved.studio && saved.studio.skill) || null
      }
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      /* Storage can be unavailable (private mode, file:// restrictions). */
    }
  }

  function slugify(value, fallback) {
    const slug = String(value || "")
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || fallback || "my-agent";
  }

  function yamlString(value) {
    return '"' + String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }

  function completedCount() {
    return UNITS.filter((unit) => Boolean(state.completed[unit.id])).length;
  }

  function nextUnit() {
    return UNITS.find((unit) => !state.completed[unit.id]) || null;
  }

  function missionDoneCount() {
    let count = 0;
    for (let i = 1; i <= 8; i += 1) {
      if (state.capstone.steps[String(i)]) count += 1;
    }
    return count;
  }

  /* ------------------------------------------------------------------ */
  /* Toast / copy / download                                            */
  /* ------------------------------------------------------------------ */

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
        /* fall through */
      }
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      area.style.pointerEvents = "none";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ------------------------------------------------------------------ */
  /* Theme                                                              */
  /* ------------------------------------------------------------------ */

  function syncThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", state.theme === "light" ? "#f3f0e7" : "#0b0f14");
  }

  function initTheme() {
    const prefersLight =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    if (state.theme !== "light" && state.theme !== "dark") {
      state.theme = prefersLight ? "light" : "dark";
    }
    document.documentElement.dataset.theme = state.theme;
    syncThemeColor();

    const toggle = $("#theme-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        state.theme = state.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = state.theme;
        syncThemeColor();
        saveState();
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Routing                                                            */
  /* ------------------------------------------------------------------ */

  function routeKeyFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    return raw || "overview";
  }

  function route() {
    const key = routeKeyFromHash();
    const def = ROUTES[key] || ROUTES.overview;

    $$(".view").forEach((view) => {
      view.classList.toggle("is-active", view.id === def.view);
    });

    $$(".nav-item[data-route]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.route === def.nav);
    });

    const crumb = $("#crumb-current");
    if (crumb) crumb.textContent = def.crumb;
    document.title = `${def.title} — Agent Lab`;

    closeNav();

    const main = $("#main");
    if (main) {
      main.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function navigateTo(routeHash, targetId) {
    if (location.hash !== routeHash) {
      location.hash = routeHash;
    } else {
      route();
    }
    if (targetId) {
      setTimeout(() => {
        const target = document.getElementById(targetId);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 140);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Progress                                                           */
  /* ------------------------------------------------------------------ */

  function updateProgress() {
    const count = completedCount();
    const total = UNITS.length;
    const pct = Math.round((count / total) * 100);
    const next = nextUnit();

    const ring = $("#ring-value");
    if (ring) {
      const circumference = 2 * Math.PI * 19;
      ring.style.strokeDasharray = String(circumference);
      ring.style.strokeDashoffset = String(circumference * (1 - count / total));
    }
    const pctLabel = $("#ring-percent");
    if (pctLabel) pctLabel.textContent = `${pct}%`;
    const countLabel = $("#progress-count");
    if (countLabel) countLabel.textContent = `${count} of ${total}`;

    const sidebarContinue = $("#sidebar-continue");
    if (sidebarContinue) {
      sidebarContinue.textContent = next ? "Continue learning →" : "Review the guide →";
    }

    const badge = $("#overview-progress-badge");
    if (badge) badge.textContent = `${count} of ${total} complete`;

    const fill = $("#overview-progress-fill");
    if (fill) fill.style.width = `${pct}%`;

    const progressCopy = $("#overview-progress-copy");
    if (progressCopy) progressCopy.textContent = overviewCopy(count, next);

    const unitsWrap = $("#progress-units");
    if (unitsWrap) {
      unitsWrap.innerHTML = UNITS.map((unit, index) => {
        const done = Boolean(state.completed[unit.id]);
        return `<div class="progress-unit${done ? " is-done" : ""}"><b>${String(index + 1).padStart(2, "0")}</b>${unit.shortLabel}</div>`;
      }).join("");
    }

    $$(".nav-state[data-state]").forEach((marker) => {
      const unit = UNITS.find((item) => item.id === marker.dataset.state);
      marker.classList.toggle("is-done", Boolean(unit && state.completed[unit.id]));
    });

    const topContinue = $("#top-continue");
    if (topContinue) {
      topContinue.href = next ? next.route : "#/overview";
      topContinue.textContent = next ? `Continue: ${next.short}` : "Review the guide";
    }

    const overviewContinue = $("#overview-continue");
    if (overviewContinue) {
      overviewContinue.href = next ? next.route : "#/overview";
      overviewContinue.innerHTML = `${next ? `Continue: ${next.label}` : "Review the guide"} <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>`;
    }

    const graduation = $("#graduation-status");
    if (graduation) {
      graduation.textContent = `${count} of ${total} units complete · capstone ${state.completed.capstone ? "complete" : "not complete"}`;
    }

    syncCompleteButtons();
  }

  function overviewCopy(count, next) {
    const firstName = (state.name || "").trim().split(/\s+/)[0] || "";
    if (count === 0) {
      return firstName
        ? `${firstName}, start with the agent loop. It takes about 15 minutes.`
        : "Start with the agent loop. It takes about 15 minutes.";
    }
    if (!next) {
      return firstName
        ? `${firstName}, you’ve completed every unit. Revisit the capstone or build something new in the studio.`
        : "You’ve completed every unit. Revisit the capstone or build something new in the studio.";
    }
    return firstName
      ? `${firstName}, you’re ${count} of ${UNITS.length} through. Next up: ${next.label}.`
      : `You’re ${count} of ${UNITS.length} through. Next up: ${next.label}.`;
  }

  function syncCompleteButtons() {
    $$("[data-complete]").forEach((button) => {
      const id = button.dataset.complete;
      if (!button.dataset.label) {
        button.dataset.label = button.textContent.trim();
      }
      const done = Boolean(state.completed[id]);
      button.classList.toggle("is-complete", done);
      button.setAttribute("aria-pressed", String(done));
      button.textContent = done
        ? id === "capstone"
          ? "Mission complete ✓"
          : "Completed ✓"
        : button.dataset.label;
    });
  }

  function initCompletionButtons() {
    $$("[data-complete]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.complete;
        if (id === "capstone") {
          const doneSteps = missionDoneCount();
          if (!state.completed.capstone && doneSteps < 8) {
            showToast(`Check all 8 mission steps first — ${doneSteps} of 8 done.`);
            return;
          }
          state.completed.capstone = !state.completed.capstone;
          saveState();
          updateProgress();
          showToast(
            state.completed.capstone
              ? "Mission complete. You shipped Onboarding Scout."
              : "Mission marked incomplete."
          );
          return;
        }

        state.completed[id] = !state.completed[id];
        saveState();
        updateProgress();
        const unit = UNITS.find((item) => item.id === id);
        if (state.completed[id]) {
          showToast(
            completedCount() === UNITS.length
              ? "Everything complete. Your certificate is ready."
              : `${unit ? unit.short : "Module"} complete.`
          );
        } else {
          showToast(`${unit ? unit.short : "Module"} marked incomplete.`);
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Navigation / mobile                                                */
  /* ------------------------------------------------------------------ */

  function openNav() {
    const sidebar = $("#sidebar");
    const scrim = $("#mobile-scrim");
    const menu = $("#menu-btn");
    if (sidebar) sidebar.classList.add("is-open");
    if (scrim) scrim.hidden = false;
    if (menu) menu.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
  }

  function closeNav() {
    const sidebar = $("#sidebar");
    const scrim = $("#mobile-scrim");
    const menu = $("#menu-btn");
    if (sidebar) sidebar.classList.remove("is-open");
    if (scrim) scrim.hidden = true;
    if (menu) menu.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  function initNav() {
    const menu = $("#menu-btn");
    const close = $("#sidebar-close");
    const scrim = $("#mobile-scrim");
    if (menu) {
      menu.addEventListener("click", () => {
        const sidebar = $("#sidebar");
        if (sidebar && sidebar.classList.contains("is-open")) closeNav();
        else openNav();
      });
    }
    if (close) close.addEventListener("click", closeNav);
    if (scrim) scrim.addEventListener("click", closeNav);
    $$(".side-nav a").forEach((link) => link.addEventListener("click", closeNav));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) closeNav();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Quizzes                                                            */
  /* ------------------------------------------------------------------ */

  function initQuizzes() {
    $$(".quiz-feedback").forEach((feedback) => feedback.setAttribute("aria-live", "polite"));
    $$(".quiz").forEach((quiz) => {
      const questions = $$(".quiz-q", quiz);

      questions.forEach((question) => {
        const qid = question.dataset.q;
        const answer = Number(question.dataset.answer);
        const explanation = question.dataset.explanation || "";
        const options = $$(".quiz-option", question);
        const feedback = $(".quiz-feedback", question);

        options.forEach((option, index) => {
          option.setAttribute("aria-pressed", "false");
          option.addEventListener("click", () => {
            if (question.classList.contains("is-correct")) return;

            options.forEach((item) => item.classList.remove("is-wrong", "is-correct"));

            if (index === answer) {
              state.quiz[qid] = index;
              saveState();
              markCorrect(question, options, feedback, explanation, index);
              syncQuizScore(quiz);
            } else {
              option.classList.add("is-wrong");
              option.setAttribute("aria-pressed", "true");
              state.quiz[qid] = index;
              saveState();
              paintFeedback(feedback, "Not quite. Read the question again and try another option.", "wrong");
            }
          });
        });

        const saved = state.quiz[qid];
        if (typeof saved === "number" && saved >= 0 && saved < options.length) {
          if (saved === answer) {
            markCorrect(question, options, feedback, explanation, saved);
          } else {
            options[saved].classList.add("is-wrong");
            options[saved].setAttribute("aria-pressed", "true");
            paintFeedback(feedback, "Not quite. Read the question again and try another option.", "wrong");
          }
        }
      });

      syncQuizScore(quiz);
    });
  }

  function markCorrect(question, options, feedback, explanation, correctIndex) {
    question.classList.add("is-correct");
    options.forEach((option, index) => {
      option.classList.add("is-locked");
      option.disabled = true;
      option.setAttribute("aria-pressed", String(index === correctIndex));
      if (index === correctIndex) option.classList.add("is-correct");
    });
    paintFeedback(feedback, explanation ? `Correct. ${explanation}` : "Correct.", "correct");
  }

  function paintFeedback(feedback, message, kind) {
    if (!feedback) return;
    feedback.hidden = false;
    feedback.classList.remove("is-correct", "is-wrong");
    feedback.classList.add(kind === "correct" ? "is-correct" : "is-wrong");
    feedback.textContent = message;
  }

  function syncQuizScore(quiz) {
    const total = $$(".quiz-q", quiz).length;
    const correct = $$(".quiz-q.is-correct", quiz).length;
    const score = $("[data-quiz-score]", quiz);
    if (score) score.textContent = `${correct} / ${total}`;
  }

  /* ------------------------------------------------------------------ */
  /* Agent loop simulator                                               */
  /* ------------------------------------------------------------------ */

  const SIM_STEPS = [
    { title: "Goal", log: "Goal received: make this repository legible for a new engineer." },
    { title: "Plan", log: "Plan: map the entry points, trace one request, compare docs to code." },
    { title: "Act", log: "Act: glob(\"src/**\") → read(\"src/index.ts\") → grep(\"auth\") → read(\"src/middleware/auth.ts\")." },
    { title: "Observe", log: "Observe: auth trusts an x-user-id header; docs claim JWT. Drift found." },
    { title: "Verify", log: "Verify: cross-check tests and docs. Cite paths. Mark inferred claims." },
    { title: "Answer", log: "Answer: write ONBOARDING.md with a reading order, risks and three first tasks." }
  ];

  function initSimulator() {
    const run = $("#run-loop");
    const reset = $("#reset-loop");
    if (run) run.addEventListener("click", runSimulator);
    if (reset) reset.addEventListener("click", resetSimulator);
    resetSimulator();
  }

  function resetSimulator() {
    simTimers.forEach((timer) => clearTimeout(timer));
    simTimers = [];
    const nodes = $$(".loop-node");
    nodes.forEach((node) => node.classList.remove("is-active", "is-done"));
    const log = $("#sim-log");
    if (log) {
      log.innerHTML = '<div class="sim-log-line"><span class="sim-prompt">›</span> Ready. Press “Run the loop” to start the simulation.</div>';
    }
    const status = $("#sim-status");
    if (status) {
      status.textContent = "idle";
      status.className = "sim-status";
    }
    const run = $("#run-loop");
    if (run) {
      run.disabled = false;
      run.innerHTML = '<svg class="icon"><use href="#i-play"/></svg> Run the loop';
    }
  }

  function runSimulator() {
    simTimers.forEach((timer) => clearTimeout(timer));
    simTimers = [];
    const nodes = $$(".loop-node");
    const log = $("#sim-log");
    const status = $("#sim-status");
    const run = $("#run-loop");

    nodes.forEach((node) => node.classList.remove("is-active", "is-done"));
    if (log) log.innerHTML = "";
    if (status) {
      status.textContent = "running";
      status.className = "sim-status is-running";
    }
    if (run) run.disabled = true;

    SIM_STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        nodes.forEach((node, nodeIndex) => {
          node.classList.toggle("is-active", nodeIndex === index);
          node.classList.toggle("is-done", nodeIndex < index);
        });

        if (log) {
          const line = document.createElement("div");
          line.className = "sim-log-line";
          const prompt = document.createElement("span");
          prompt.className = "sim-prompt";
          prompt.textContent = "›";
          line.appendChild(prompt);
          line.appendChild(document.createTextNode(` ${step.log}`));
          log.appendChild(line);
          log.scrollTop = log.scrollHeight;
        }

        if (index === SIM_STEPS.length - 1) {
          if (status) {
            status.textContent = "complete";
            status.className = "sim-status is-done";
          }
          if (run) {
            run.disabled = false;
            run.innerHTML = '<svg class="icon"><use href="#i-play"/></svg> Run again';
          }
        }
      }, 650 + index * 950);
      simTimers.push(timer);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Brief form                                                         */
  /* ------------------------------------------------------------------ */

  function initBrief() {
    $$("[data-brief]").forEach((field) => {
      field.value = state.brief[field.dataset.brief] || "";
      field.addEventListener("input", () => {
        state.brief[field.dataset.brief] = field.value;
        saveState();
        flashBriefSaved();
      });
    });

    const toStudio = $("#brief-to-studio");
    if (toStudio) {
      toStudio.addEventListener("click", () => {
        const brief = state.brief;
        if (!brief.job.trim()) {
          showToast("Write the job first — it becomes the agent description.");
          return;
        }
        const current = readAgentFields();
        current.description = brief.job.trim();
        current.role = [
          "You are a focused agent with one job.",
          "",
          `Job: ${brief.job.trim()}`,
          brief.inputs.trim() ? `Inputs: ${brief.inputs.trim()}` : "",
          brief.tools.trim() ? `Tools: ${brief.tools.trim()}` : "",
          brief.boundaries.trim() ? `Boundaries: ${brief.boundaries.trim()}` : ""
        ].filter(Boolean).join("\n");
        current.output = brief.proof.trim();
        writeAgentFields(current);
        state.studio.agent = readAgentFields();
        saveState();
        renderAgentPreview();
        switchStudioTab("agent");
        location.hash = "#/studio";
        showToast("Brief loaded into the Agent Builder.");
      });
    }
  }

  function flashBriefSaved() {
    const el = $("#brief-save-state");
    if (!el) return;
    el.textContent = "Saved locally";
    el.classList.add("is-saved");
    clearTimeout(briefSaveTimer);
    briefSaveTimer = setTimeout(() => el.classList.remove("is-saved"), 1400);
  }

  /* ------------------------------------------------------------------ */
  /* Permission lab                                                     */
  /* ------------------------------------------------------------------ */

  function wildcardMatch(pattern, value) {
    if (pattern === "*") return true;
    const escaped = String(pattern).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`).test(String(value));
  }

  const PERMISSION_RULES = [
    { action: "*", resource: "*", effect: "ask" },
    { action: "read", resource: "*", effect: "allow" },
    { action: "edit", resource: "*", effect: "deny" },
    { action: "edit", resource: "ONBOARDING.md", effect: "allow" },
    { action: "shell", resource: "*", effect: "ask" },
    { action: "shell", resource: "git status", effect: "allow" },
    { action: "skill", resource: "repo-onboarding", effect: "allow" },
    { action: "webfetch", resource: "*", effect: "deny" }
  ];

  const PERMISSION_ACTIONS = [
    { label: "read src/index.ts", action: "read", resource: "src/index.ts" },
    { label: "edit src/index.ts", action: "edit", resource: "src/index.ts" },
    { label: "edit ONBOARDING.md", action: "edit", resource: "ONBOARDING.md" },
    { label: "skill repo-onboarding", action: "skill", resource: "repo-onboarding" },
    { label: "shell git status", action: "shell", resource: "git status" },
    { label: "shell rm -rf .", action: "shell", resource: "rm -rf ." },
    { label: "webfetch example.com", action: "webfetch", resource: "https://example.com" },
    { label: "subagent reviewer", action: "subagent", resource: "reviewer" }
  ];

  function initPermissionLabs() {
    $$("[data-permission-lab]").forEach((lab) => {
      let rules = PERMISSION_RULES.map((rule) => ({ ...rule }));
      let selected = 0;

      const actionsEl = $("[data-pl-actions]", lab);
      const rulesEl = $("[data-pl-rules]", lab);
      const resultEl = $("[data-pl-result]", lab);

      function evaluate() {
        const action = PERMISSION_ACTIONS[selected];
        let matched = -1;

        rules.forEach((rule, index) => {
          if (wildcardMatch(rule.action, action.action) && wildcardMatch(rule.resource, action.resource)) {
            matched = index;
          }
        });

        const effect = matched >= 0 ? rules[matched].effect : "ask";
        const matchedRule = matched >= 0 ? rules[matched] : null;

        $$(".pl-rule", rulesEl).forEach((row, index) => {
          row.classList.toggle("is-match", index === matched);
        });

        if (resultEl) {
          resultEl.className = `pl-result is-${effect}`;
          resultEl.innerHTML = matchedRule
            ? `<span class="pl-result-label">Result</span><p><strong>${effect}</strong> — rule ${matched + 1} (${matchedRule.action} ${matchedRule.resource} → ${matchedRule.effect}) matched last and wins.</p>`
            : `<span class="pl-result-label">Result</span><p><strong>${effect}</strong> — no rule matched; the default applies.</p>`;
        }
      }

      function renderActions() {
        if (!actionsEl) return;
        actionsEl.innerHTML = "";
        PERMISSION_ACTIONS.forEach((action, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `pl-action${index === selected ? " is-active" : ""}`;
          button.textContent = action.label;
          button.addEventListener("click", () => {
            selected = index;
            renderActions();
            evaluate();
          });
          actionsEl.appendChild(button);
        });
      }

      function renderRules() {
        if (!rulesEl) return;
        rulesEl.innerHTML = "";
        rules.forEach((rule, index) => {
          const row = document.createElement("div");
          row.className = "pl-rule";

          const order = document.createElement("span");
          order.className = "pl-rule-order";
          order.textContent = String(index + 1).padStart(2, "0");

          const main = document.createElement("div");
          main.className = "pl-rule-main";
          const action = document.createElement("span");
          action.className = "pl-rule-action";
          action.textContent = rule.action;
          const resource = document.createElement("span");
          resource.className = "pl-rule-resource";
          resource.textContent = rule.resource;
          const effect = document.createElement("span");
          effect.className = `pl-rule-effect ${rule.effect}`;
          effect.textContent = rule.effect;
          main.append(action, resource, effect);

          const up = document.createElement("button");
          up.type = "button";
          up.className = "pl-move";
          up.textContent = "↑";
          up.disabled = index === 0;
          up.setAttribute("aria-label", `Move rule ${index + 1} up`);
          up.addEventListener("click", () => {
            if (index === 0) return;
            [rules[index - 1], rules[index]] = [rules[index], rules[index - 1]];
            renderRules();
            evaluate();
          });

          const down = document.createElement("button");
          down.type = "button";
          down.className = "pl-move";
          down.textContent = "↓";
          down.disabled = index === rules.length - 1;
          down.setAttribute("aria-label", `Move rule ${index + 1} down`);
          down.addEventListener("click", () => {
            if (index === rules.length - 1) return;
            [rules[index + 1], rules[index]] = [rules[index], rules[index + 1]];
            renderRules();
            evaluate();
          });

          row.append(order, main, up, down);
          rulesEl.appendChild(row);
        });
      }

      renderActions();
      renderRules();
      evaluate();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Primitive picker                                                   */
  /* ------------------------------------------------------------------ */

  function initPickers() {
    $$(".picker-feedback").forEach((feedback) => feedback.setAttribute("aria-live", "polite"));
    $$("[data-picker]").forEach((picker) => {
      const cards = $$("[data-picker-card]", picker);
      const score = $("[data-picker-score]", picker);

      cards.forEach((card) => {
        const answer = card.dataset.answer;
        const explanation = card.dataset.explanation || "";
        const feedback = $(".picker-feedback", card);
        const options = $$("[data-choice]", card);

        options.forEach((option) => {
          option.addEventListener("click", () => {
            if (card.classList.contains("is-correct")) return;
            options.forEach((item) => item.classList.remove("is-correct", "is-wrong"));

            if (option.dataset.choice === answer) {
              option.classList.add("is-correct");
              card.classList.add("is-correct");
              if (feedback) {
                feedback.hidden = false;
                feedback.className = "picker-feedback is-correct";
                feedback.textContent = `Correct. ${explanation}`;
              }
            } else {
              option.classList.add("is-wrong");
              if (feedback) {
                feedback.hidden = false;
                feedback.className = "picker-feedback is-wrong";
                feedback.textContent = "Not quite. Try another primitive.";
              }
            }

            if (score) {
              const correct = cards.filter((item) => item.classList.contains("is-correct")).length;
              score.textContent = `${correct} / ${cards.length}`;
            }
          });
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mission                                                            */
  /* ------------------------------------------------------------------ */

  function initMission() {
    $$("[data-capstone-step]").forEach((checkbox) => {
      const step = checkbox.dataset.capstoneStep;
      checkbox.checked = Boolean(state.capstone.steps[step]);
      checkbox.addEventListener("change", () => {
        state.capstone.steps[step] = checkbox.checked;
        if (!checkbox.checked && state.completed.capstone) {
          state.completed.capstone = false;
          updateProgress();
          showToast("Mission reopened — one of the required steps is unchecked.");
        }
        saveState();
        syncMission();
      });
    });

    const reflection = $("#capstone-reflection");
    if (reflection) {
      reflection.value = state.capstone.reflection || "";
      reflection.addEventListener("input", () => {
        state.capstone.reflection = reflection.value;
        saveState();
      });
    }

    syncMission();
  }

  function initMissionKit() {
    const button = $("#download-mission-kit");
    if (!button) return;

    button.addEventListener("click", () => {
      const files = [
        { path: "AGENTS.md", selector: "#code-agents-md" },
        { path: ".opencode/skills/repo-onboarding/SKILL.md", selector: "#code-skill-capstone" },
        { path: ".opencode/agents/onboarding-scout.md", selector: "#code-scout" },
        { path: ".opencode/commands/onboard.md", selector: "#code-onboard-command" }
      ];

      const parts = [
        "# Onboarding Scout — mission kit",
        "",
        "Copy each file below into the target repository, then run `/onboard` in OpenCode.",
        "The agent writes ONBOARDING.md; it should not modify anything else.",
        ""
      ];

      files.forEach((file, index) => {
        const source = $(file.selector);
        parts.push(`## ${index + 1}. \`${file.path}\``, "", "```md", source ? source.textContent.trim() : "", "```", "");
      });

      parts.push(
        "## Verify",
        "",
        "- Open every cited path in ONBOARDING.md.",
        "- Confirm only ONBOARDING.md was written.",
        "- Run an independent reviewer over the brief.",
        "- Score the result with the Agent Lab mission rubric.",
        ""
      );

      downloadText("onboarding-scout-kit.md", parts.join("\n"));
      showToast("Mission kit downloaded.");
    });
  }

  function syncMission() {
    const done = missionDoneCount();
    const total = 8;

    $$(".mission-step[data-step]").forEach((step) => {
      step.classList.toggle("is-done", Boolean(state.capstone.steps[step.dataset.step]));
    });

    const count = $("#mission-count");
    if (count) count.textContent = `${done} / ${total} steps`;

    const fill = $("#mission-progress-fill");
    if (fill) fill.style.width = `${(done / total) * 100}%`;

    const note = $("#mission-finish-note");
    if (note) note.textContent = `${done} of ${total} steps complete.`;
  }

  /* ------------------------------------------------------------------ */
  /* Audit                                                              */
  /* ------------------------------------------------------------------ */

  function initAudit() {
    $$("#audit-scorecard [data-audit-row]").forEach((row) => {
      const key = row.dataset.auditRow;
      $$("[data-score]", row).forEach((button) => {
        button.addEventListener("click", () => {
          state.capstone.audit[key] = Number(button.dataset.score);
          saveState();
          syncAudit();
        });
      });
    });
    syncAudit();
  }

  function syncAudit() {
    const scorecard = $("#audit-scorecard");
    if (!scorecard) return;

    let total = 0;
    let scored = 0;

    $$("[data-audit-row]", scorecard).forEach((row) => {
      const key = row.dataset.auditRow;
      const score = state.capstone.audit[key];
      if (typeof score === "number") {
        total += score;
        scored += 1;
      }
      $$("[data-score]", row).forEach((button) => {
        const active = Number(button.dataset.score) === score;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    });

    const scoreEl = $("#audit-score");
    if (scoreEl) scoreEl.textContent = `${total} / 12`;

    const pct = Math.round((total / 12) * 100);
    const percentEl = $("#audit-percent");
    if (percentEl) percentEl.textContent = `${pct}%`;

    const ring = $(".audit-ring", scorecard);
    if (ring) ring.style.setProperty("--pct", String(pct));

    const feedback = $("#audit-feedback");
    if (feedback) {
      if (scored === 0) {
        feedback.textContent = "Score each criterion to see feedback.";
      } else if (total >= 10) {
        feedback.textContent = "Ship it. You’ve built a trustworthy onboarding agent.";
      } else if (total >= 7) {
        feedback.textContent = "Solid. Tighten citations and run the reviewer once more.";
      } else {
        feedback.textContent = "Not yet. Re-read the quality bar and iterate before marking complete.";
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Studio                                                             */
  /* ------------------------------------------------------------------ */

  const AGENT_PRESETS = {
    onboarding: {
      name: "onboarding-scout",
      description: "Produces a cited, read-only onboarding brief for a repository",
      mode: "primary",
      model: "",
      role: "You are Onboarding Scout, a read-only codebase guide.\n\nYour single job: produce a trustworthy onboarding brief for the repository in the current workspace.\n\n- Read before you conclude. Cite file paths for every factual claim.\n- Label claims as Observed or Inferred.\n- Never invent files, functions, commands, or behavior.\n- Prefer code over docs when they disagree. Report the drift.\n- Do not modify anything except ONBOARDING.md.\n- Do not run shell commands. Do not fetch the web.\n- Keep the brief under 1,200 words.",
      output: "Write ONBOARDING.md with: Snapshot, Start here, Entry points, Architecture, Data and config, Conventions, Risks and drift, First tasks, Open questions.",
      edit: "deny",
      shell: "deny",
      web: "deny",
      skills: "repo-onboarding",
      outputFile: "ONBOARDING.md",
      steps: "24"
    },
    reviewer: {
      name: "citation-reviewer",
      description: "Reviews a document against a repository for accuracy",
      mode: "subagent",
      model: "",
      role: "You are Citation Reviewer, an independent verifier.\n\nReview the document against the repository. Check every cited path. Flag unsupported claims, invented files, missing risks, and stale docs. Report critical issues first. Do not edit anything.",
      output: "List findings in severity order. For each finding: the claim, the evidence, the cited path (if any), and the fix. If there are no critical issues, say so plainly.",
      edit: "deny",
      shell: "deny",
      web: "deny",
      skills: "",
      outputFile: "",
      steps: "16"
    },
    release: {
      name: "release-captain",
      description: "Drafts categorized release notes from merged changes",
      mode: "primary",
      model: "",
      role: "You are Release Captain, a release-notes editor.\n\nYour job: turn merged changes into clear, categorized release notes for humans.\n\n- Read the git history and the project's release policy before writing.\n- Group changes by user impact, not by commit order.\n- Never invent a change or a contributor.\n- Ask before writing the final file if the version bump is ambiguous.\n- Keep the notes concise and link to the relevant files or commits.",
      output: "Write RELEASE_NOTES.md with: Highlights, Breaking changes, Features, Fixes, Internal changes, Upgrade notes, and Contributors.",
      edit: "deny",
      shell: "ask",
      web: "deny",
      skills: "release-notes",
      outputFile: "RELEASE_NOTES.md",
      steps: "20"
    }
  };

  const SKILL_PRESETS = {
    onboarding: {
      id: "repo-onboarding",
      name: "Repo Onboarding",
      description: "Produce a cited onboarding brief for an unfamiliar codebase",
      when: "Use when a new engineer needs to understand a repository, or when the user asks for an onboarding guide, architecture map, or first-task plan.",
      workflow: "Start with a shallow inventory: README, package manifest, top-level folders, docs, tests, and configuration.\nFind the entry points with glob and grep. Do not assume a framework from the file names.\nTrace one request or command end to end: entry point, handler, service, data access, and one test.\nIdentify conventions: naming, validation, error handling, config, tests, and generated code.\nFind risks: auth shortcuts, secrets, unsafe defaults, stale docs, and missing tests.\nCompare docs to code and report drift with both paths.\nWrite ONBOARDING.md using the output contract.\nVerify every cited path and remove any claim you cannot support.",
      output: "ONBOARDING.md with: Snapshot, Start here, Entry points, Architecture, Data and config, Conventions, Risks and drift, First tasks, Open questions.",
      quality: "Every factual claim cites a path.\nLabel each claim as Observed or Inferred.\nNever invent files, functions, commands, or behavior.\nPrefer code over docs when they disagree; flag the drift.\nStop after reading 30 files and list what remains.\nKeep the brief under 1,200 words.",
      references: true
    },
    release: {
      id: "release-notes",
      name: "Release Notes",
      description: "Turn merged changes into categorized release notes",
      when: "Use when preparing a release, changelog, or upgrade note from a range of commits.",
      workflow: "Read the release policy and the previous release notes.\nCollect merged changes since the last tag.\nGroup changes by user impact: breaking, feature, fix, internal.\nRewrite commit messages into user-facing language.\nFlag migrations, deprecations, and upgrade steps.\nAsk for approval on the version bump before writing files.\nWrite the notes and verify every linked change.",
      output: "Release notes with: Highlights, Breaking changes, Features, Fixes, Internal changes, Upgrade notes, Contributors.",
      quality: "Every change is traceable to a commit or PR.\nNo invented features or contributors.\nBreaking changes come first.\nUpgrade steps are explicit.\nThe version bump is approved before writing.",
      references: true
    },
    audit: {
      id: "source-audit",
      name: "Source Audit",
      description: "Audit sources for a decision-ready research brief",
      when: "Use when a research brief needs a provenance and confidence check before it is shared.",
      workflow: "List every source used in the brief.\nFor each source, record the author, publisher, date, and whether it is primary or secondary.\nCheck whether the claim is supported by the source or merely adjacent to it.\nFlag stale, anonymous, or conflict-of-interest sources.\nIdentify claims that need a second independent source.\nRank the remaining claims by confidence: high, medium, low.\nReturn a short audit table and the top three fixes.",
      output: "A source audit table plus: high-confidence claims, claims needing a second source, and recommended fixes.",
      quality: "Every source has a date and a publisher.\nPrimary sources are preferred.\nNo claim is marked high-confidence without direct support.\nConflicts of interest are disclosed.\nThe audit is short enough to act on.",
      references: false
    }
  };

  function agentField(name) {
    return $(`[data-agent-field="${name}"]`);
  }

  function skillField(name) {
    return $(`[data-skill-field="${name}"]`);
  }

  function readAgentFields() {
    const read = (name) => {
      const field = agentField(name);
      return field ? field.value : "";
    };
    return {
      name: read("name"),
      description: read("description"),
      mode: read("mode"),
      model: read("model"),
      role: read("role"),
      output: read("output"),
      edit: read("edit"),
      shell: read("shell"),
      web: read("web"),
      skills: read("skills"),
      outputFile: read("outputFile"),
      steps: read("steps")
    };
  }

  function writeAgentFields(values) {
    if (!values) return;
    Object.keys(values).forEach((key) => {
      const field = agentField(key);
      if (field) field.value = values[key] == null ? "" : values[key];
    });
  }

  function readSkillFields() {
    const read = (name) => {
      const field = skillField(name);
      return field ? field.value : "";
    };
    const references = skillField("references");
    return {
      id: read("id"),
      name: read("name"),
      description: read("description"),
      when: read("when"),
      workflow: read("workflow"),
      output: read("output"),
      quality: read("quality"),
      references: references ? references.checked : false
    };
  }

  function writeSkillFields(values) {
    if (!values) return;
    Object.keys(values).forEach((key) => {
      const field = skillField(key);
      if (!field) return;
      if (key === "references") field.checked = Boolean(values[key]);
      else field.value = values[key] == null ? "" : values[key];
    });
  }

  function buildAgentMarkdown(values) {
    const name = slugify(values.name, "my-agent");
    const description = values.description.trim() || "A focused agent for this repository";
    const mode = ["primary", "subagent", "all"].includes(values.mode) ? values.mode : "primary";

    const rules = [
      { action: "*", resource: "*", effect: "ask" },
      { action: "read", resource: "*", effect: "allow" },
      { action: "glob", resource: "*", effect: "allow" },
      { action: "grep", resource: "*", effect: "allow" }
    ];

    values.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean)
      .forEach((skill) => rules.push({ action: "skill", resource: skill, effect: "allow" }));

    if (values.edit === "deny") {
      rules.push({ action: "edit", resource: "*", effect: "deny" });
      if (values.outputFile.trim()) {
        rules.push({ action: "edit", resource: values.outputFile.trim(), effect: "allow" });
      }
    } else {
      rules.push({ action: "edit", resource: "*", effect: values.edit });
    }

    rules.push({ action: "shell", resource: "*", effect: values.shell });
    rules.push({ action: "webfetch", resource: "*", effect: values.web });
    rules.push({ action: "websearch", resource: "*", effect: values.web });

    const frontmatter = [
      `description: ${yamlString(description)}`,
      `mode: ${mode}`
    ];
    if (values.model.trim()) frontmatter.push(`model: ${values.model.trim()}`);
    if (values.steps && Number(values.steps) > 0) frontmatter.push(`steps: ${Number(values.steps)}`);

    frontmatter.push("permissions:");
    rules.forEach((rule) => {
      frontmatter.push(`  - action: ${yamlString(rule.action)}`);
      frontmatter.push(`    resource: ${yamlString(rule.resource)}`);
      frontmatter.push(`    effect: ${rule.effect}`);
    });

    const body = [
      values.role.trim() || "You are a focused agent. Do the job described above and show your work.",
      values.output.trim() ? `## Output contract\n${values.output.trim()}` : ""
    ].filter(Boolean).join("\n\n");

    return `---\n${frontmatter.join("\n")}\n---\n\n${body}\n`;
  }

  function buildSkillMarkdown(values) {
    const id = slugify(values.id, "my-skill");
    const name = values.name.trim() || id;
    const description = values.description.trim() || "A reusable procedure for this task";
    const steps = values.workflow
      .split("\n")
      .map((step) => step.trim())
      .filter(Boolean)
      .map((step, index) => `${index + 1}. ${step}`)
      .join("\n");
    const quality = values.quality
      .split("\n")
      .map((rule) => rule.trim())
      .filter(Boolean)
      .map((rule) => `- ${rule}`)
      .join("\n");

    let markdown = `---\nname: ${yamlString(name)}\ndescription: ${yamlString(description)}\n---\n\n`;
    markdown += `## When to use\n${values.when.trim() || "Use when the task matches this procedure."}\n\n`;
    markdown += `## Workflow\n${steps || "1. Add the steps for this procedure."}\n\n`;
    markdown += `## Output contract\n${values.output.trim() || "Describe the expected output."}\n\n`;
    markdown += `## Quality bar\n${quality || "- Add the quality rules for this procedure."}\n`;

    if (values.references) {
      markdown += `\n## References\n- \`references/output-example.md\` — a worked example of the output contract.\n`;
    }

    return markdown;
  }

  function renderAgentPreview() {
    const values = readAgentFields();
    const markdown = buildAgentMarkdown(values);
    const preview = $("#agent-preview");
    if (preview) preview.textContent = markdown;
    const filename = $("#agent-filename");
    if (filename) filename.textContent = `.opencode/agents/${slugify(values.name, "my-agent")}.md`;
  }

  function renderSkillPreview() {
    const values = readSkillFields();
    const markdown = buildSkillMarkdown(values);
    const preview = $("#skill-preview");
    if (preview) preview.textContent = markdown;
    const filename = $("#skill-filename");
    if (filename) filename.textContent = `.opencode/skills/${slugify(values.id, "my-skill")}/SKILL.md`;
  }

  function switchStudioTab(name) {
    $$("[data-studio-tab]").forEach((tab) => {
      const active = tab.dataset.studioTab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    $$("[data-studio-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.studioPanel !== name;
    });
  }

  function initStudio() {
    if (state.studio.agent) writeAgentFields(state.studio.agent);
    if (state.studio.skill) writeSkillFields(state.studio.skill);

    $$("[data-agent-field]").forEach((field) => {
      const handler = () => {
        state.studio.agent = readAgentFields();
        saveState();
        renderAgentPreview();
      };
      field.addEventListener("input", handler);
      field.addEventListener("change", handler);
    });

    $$("[data-skill-field]").forEach((field) => {
      const handler = () => {
        state.studio.skill = readSkillFields();
        saveState();
        renderSkillPreview();
      };
      field.addEventListener("input", handler);
      field.addEventListener("change", handler);
    });

    state.studio.agent = readAgentFields();
    state.studio.skill = readSkillFields();
    saveState();
    renderAgentPreview();
    renderSkillPreview();

    $$("[data-studio-tab]").forEach((tab) => {
      tab.addEventListener("click", () => switchStudioTab(tab.dataset.studioTab));
    });

    $$("[data-agent-preset]").forEach((button) => {
      button.addEventListener("click", () => {
        const preset = AGENT_PRESETS[button.dataset.agentPreset];
        if (!preset) return;
        writeAgentFields(preset);
        state.studio.agent = readAgentFields();
        saveState();
        renderAgentPreview();
        switchStudioTab("agent");
        showToast("Agent recipe loaded.");
      });
    });

    $$("[data-skill-preset]").forEach((button) => {
      button.addEventListener("click", () => {
        const preset = SKILL_PRESETS[button.dataset.skillPreset];
        if (!preset) return;
        writeSkillFields(preset);
        state.studio.skill = readSkillFields();
        saveState();
        renderSkillPreview();
        switchStudioTab("skill");
        showToast("Skill recipe loaded.");
      });
    });

    const loadBrief = $("#load-brief");
    if (loadBrief) {
      loadBrief.addEventListener("click", () => {
        const brief = state.brief;
        if (!brief.job.trim()) {
          showToast("Write the job first — it becomes the agent description.");
          return;
        }
        const current = readAgentFields();
        current.description = brief.job.trim();
        current.role = [
          "You are a focused agent with one job.",
          "",
          `Job: ${brief.job.trim()}`,
          brief.inputs.trim() ? `Inputs: ${brief.inputs.trim()}` : "",
          brief.tools.trim() ? `Tools: ${brief.tools.trim()}` : "",
          brief.boundaries.trim() ? `Boundaries: ${brief.boundaries.trim()}` : ""
        ].filter(Boolean).join("\n");
        current.output = brief.proof.trim();
        writeAgentFields(current);
        state.studio.agent = readAgentFields();
        saveState();
        renderAgentPreview();
        switchStudioTab("agent");
        showToast("Brief loaded.");
      });
    }

    const downloadAgent = $("#download-agent");
    if (downloadAgent) {
      downloadAgent.addEventListener("click", () => {
        const values = readAgentFields();
        downloadText(`${slugify(values.name, "my-agent")}.md`, buildAgentMarkdown(values));
        showToast("Agent file downloaded.");
      });
    }

    const downloadSkill = $("#download-skill");
    if (downloadSkill) {
      downloadSkill.addEventListener("click", () => {
        const values = readSkillFields();
        downloadText("SKILL.md", buildSkillMarkdown(values));
        showToast("SKILL.md downloaded.");
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Name / reset                                                       */
  /* ------------------------------------------------------------------ */

  function initNameAndReset() {
    const sidebarContinue = $("#sidebar-continue");
    if (sidebarContinue) {
      sidebarContinue.addEventListener("click", () => {
        const next = nextUnit();
        location.hash = next ? next.route : "#/overview";
      });
    }

    const name = $("#learner-name");
    if (name) {
      name.value = state.name || "";
      name.addEventListener("input", () => {
        state.name = name.value;
        saveState();
      });
      name.addEventListener("blur", updateProgress);
    }

    const save = $("#save-name");
    if (save) {
      save.addEventListener("click", () => {
        state.name = name ? name.value.trim() : state.name;
        saveState();
        updateProgress();
        showToast(state.name ? `Thanks, ${state.name.split(/\s+/)[0]}.` : "Name cleared.");
      });
    }

    const reset = $("#reset-progress");
    if (reset) {
      reset.addEventListener("click", () => {
        const ok = window.confirm(
          "Reset all progress, quiz answers, the mission checklists, the audit and the studio? This cannot be undone."
        );
        if (!ok) return;
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (_) {
          /* ignore */
        }
        location.hash = "#/overview";
        location.reload();
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Tabs / copy / scroll                                               */
  /* ------------------------------------------------------------------ */

  function initTabs() {
    $$("[data-tabs]").forEach((group) => {
      const tabs = $$("[data-tab]", group);
      const panels = $$("[data-panel]", group);
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.forEach((item) => {
            const active = item === tab;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-selected", String(active));
          });
          panels.forEach((panel) => {
            panel.classList.toggle("is-active", panel.dataset.panel === tab.dataset.tab);
          });
        });
      });
    });
  }

  function initCopyButtons() {
    $$("[data-copy-target], [data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const selector = button.dataset.copyTarget;
        const direct = button.dataset.copy;
        const target = selector ? $(selector) : null;
        const text = direct || (target ? target.textContent : "");
        if (!text) return;

        const ok = await copyText(text);
        if (!ok) {
          showToast("Copy failed. Select the text and copy it manually.");
          return;
        }

        if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
        button.textContent = "Copied";
        button.classList.add("is-copied");
        setTimeout(() => {
          button.textContent = button.dataset.originalText;
          button.classList.remove("is-copied");
        }, 1500);
      });
    });
  }

  function initScrollButtons() {
    $$("[data-scroll]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Search                                                             */
  /* ------------------------------------------------------------------ */

  function buildSearchIndex() {
    const entries = [];

    $$(".view").forEach((view) => {
      const mapping = VIEW_ROUTES[view.id];
      if (!mapping) return;
      const def = ROUTES[mapping.key];
      const meta = def ? def.crumb : "";

      const h1 = view.querySelector("h1");
      if (h1) {
        entries.push({
          title: view.id === "view-overview" ? "Overview — Build agents that do real work" : h1.textContent.trim(),
          type: view.id === "view-studio" || view.id === "view-resources" ? "Toolkit" : view.id === "view-overview" ? "Start" : "Module",
          route: mapping.route,
          target: null,
          meta
        });
      }

      $$("h2", view).forEach((h2) => {
        const section = h2.closest("section[id], article[id]");
        entries.push({
          title: h2.textContent.trim(),
          type: "Section",
          route: mapping.route,
          target: section ? section.id : null,
          meta
        });
      });
    });

    $$("#resource-grid .resource-card").forEach((card) => {
      const heading = card.querySelector("h3");
      if (!heading) return;
      entries.push({
        title: heading.textContent.trim(),
        type: "Resource",
        route: "#/resources",
        target: null,
        meta: "Resource shelf"
      });
    });

    const seen = new Set();
    searchIndex = entries.filter((entry) => {
      const key = `${entry.title}|${entry.route}|${entry.target || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function openSearch() {
    const modal = $("#search-modal");
    const input = $("#search-input");
    if (!modal || !input) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    const shell = $(".app-shell");
    if (shell) shell.inert = true;
    input.value = "";
    renderSearch("");
    setTimeout(() => input.focus(), 30);
  }

  function closeSearch() {
    const modal = $("#search-modal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    const shell = $(".app-shell");
    if (shell) shell.inert = false;
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function renderSearch(query) {
    const results = $("#search-results");
    if (!results) return;
    const q = query.trim().toLowerCase();

    searchResults = (q
      ? searchIndex.filter((entry) => `${entry.title} ${entry.type} ${entry.meta}`.toLowerCase().includes(q))
      : searchIndex.filter((entry) => ["Start", "Module", "Toolkit"].includes(entry.type))
    ).slice(0, 12);

    searchSelected = 0;
    results.innerHTML = "";

    if (!searchResults.length) {
      const hint = document.createElement("p");
      hint.className = "search-hint";
      hint.textContent = "No matches. Try “skill”, “permissions”, “Ollama”, or “capstone”.";
      results.appendChild(hint);
      return;
    }

    if (!q) {
      const hint = document.createElement("p");
      hint.className = "search-hint";
      hint.textContent = "Jump to a module or toolkit page";
      results.appendChild(hint);
    }

    searchResults.forEach((entry, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `search-result${index === 0 ? " is-selected" : ""}`;

      const type = document.createElement("span");
      type.className = "sr-type";
      type.textContent = entry.type;

      const title = document.createElement("span");
      title.className = "sr-title";
      title.textContent = entry.title;

      const meta = document.createElement("span");
      meta.className = "sr-meta";
      meta.textContent = entry.meta;

      button.append(type, title, meta);
      button.addEventListener("click", () => activateSearchResult(entry));
      results.appendChild(button);
    });
  }

  function updateSearchSelection() {
    const buttons = $$(".search-result", $("#search-results"));
    buttons.forEach((button, index) => {
      button.classList.toggle("is-selected", index === searchSelected);
    });
    const selected = buttons[searchSelected];
    if (selected) selected.scrollIntoView({ block: "nearest" });
  }

  function activateSearchResult(entry) {
    closeSearch();
    navigateTo(entry.route, entry.target);
  }

  function initSearch() {
    const trigger = $("#search-trigger");
    const close = $("#search-close");
    const input = $("#search-input");
    const modal = $("#search-modal");
    if (trigger) trigger.addEventListener("click", openSearch);
    if (close) close.addEventListener("click", closeSearch);
    if (input) {
      input.addEventListener("input", () => renderSearch(input.value));
      input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (searchResults.length) {
            searchSelected = (searchSelected + 1) % searchResults.length;
            updateSearchSelection();
          }
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          if (searchResults.length) {
            searchSelected = (searchSelected - 1 + searchResults.length) % searchResults.length;
            updateSearchSelection();
          }
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (searchResults[searchSelected]) activateSearchResult(searchResults[searchSelected]);
        }
      });
    }
    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeSearch();
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Certificate                                                        */
  /* ------------------------------------------------------------------ */

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let offsetY = 0;
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y + offsetY);
        line = word;
        offsetY += lineHeight;
      } else {
        line = test;
      }
    });
    if (line) ctx.fillText(line, x, y + offsetY);
    return offsetY;
  }

  function drawCertificate(name, date) {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = "#f5f1e6";
    ctx.fillRect(0, 0, 1400, 900);

    ctx.strokeStyle = "rgba(120, 108, 86, 0.10)";
    ctx.lineWidth = 1;
    for (let x = 70; x < 1400; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, 48);
      ctx.lineTo(x, 852);
      ctx.stroke();
    }
    for (let y = 70; y < 900; y += 42) {
      ctx.beginPath();
      ctx.moveTo(48, y);
      ctx.lineTo(1352, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "#d4cbb8";
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, 1304, 804);

    ctx.fillStyle = "#c7f36b";
    ctx.fillRect(48, 48, 1304, 12);

    ctx.fillStyle = "#527a00";
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText("AGENT / LAB", 100, 120);
    ctx.fillStyle = "#7a8490";
    ctx.font = '500 13px "Inter", sans-serif';
    ctx.fillText("OPENCODE FIELD GUIDE", 100, 143);

    ctx.fillStyle = "#11161c";
    ctx.font = '600 64px "Space Grotesk", sans-serif';
    ctx.fillText("Certificate of Completion", 100, 235);

    ctx.fillStyle = "#527a00";
    ctx.fillRect(100, 263, 92, 4);

    ctx.fillStyle = "#11161c";
    let nameSize = 72;
    ctx.font = `600 ${nameSize}px "Space Grotesk", sans-serif`;
    while (nameSize > 36 && ctx.measureText(name).width > 1180) {
      nameSize -= 2;
      ctx.font = `600 ${nameSize}px "Space Grotesk", sans-serif`;
    }
    ctx.fillText(name, 100, 380);

    ctx.strokeStyle = "#cfc6b4";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 412);
    ctx.lineTo(1300, 412);
    ctx.stroke();

    ctx.fillStyle = "#4f5a66";
    ctx.font = '400 24px "Inter", sans-serif';
    wrapCanvasText(
      ctx,
      "has completed all seven units of Agent Lab and shipped a working Onboarding Scout agent: a read-only, skill-enabled agent that turns an unfamiliar repository into a cited onboarding brief.",
      100,
      462,
      1100,
      36
    );

    const stats = [
      ["7", "UNITS"],
      ["1", "CAPSTONE"],
      ["1", "REUSABLE SKILL"]
    ];
    stats.forEach(([value, label], index) => {
      const x = 100 + index * 260;
      ctx.fillStyle = "#527a00";
      ctx.font = '600 34px "Space Grotesk", sans-serif';
      ctx.fillText(value, x, 626);
      ctx.fillStyle = "#7a8490";
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText(label, x, 650);
    });

    ctx.fillStyle = "#7a8490";
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText("DATE", 100, 742);
    ctx.fillStyle = "#11161c";
    ctx.font = '500 20px "Inter", sans-serif';
    ctx.fillText(date, 100, 770);

    ctx.fillStyle = "#7a8490";
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText("SIGNATURE", 1030, 742);
    ctx.strokeStyle = "#b8ae9b";
    ctx.beginPath();
    ctx.moveTo(1030, 782);
    ctx.lineTo(1280, 782);
    ctx.stroke();
    ctx.fillStyle = "#11161c";
    ctx.font = '600 28px "Space Grotesk", sans-serif';
    ctx.fillText("Agent Lab", 1030, 772);

    ctx.beginPath();
    ctx.arc(1225, 178, 58, 0, Math.PI * 2);
    ctx.fillStyle = "#e5efca";
    ctx.fill();
    ctx.strokeStyle = "#9dbb55";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#527a00";
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("FIELD", 1225, 172);
    ctx.fillText("TESTED", 1225, 190);
    ctx.textAlign = "left";

    return canvas.toDataURL("image/png");
  }

  function openCertificate() {
    if (completedCount() < UNITS.length) {
      showToast("Complete all seven units — including the capstone — to unlock your certificate.");
      return;
    }
    const image = $("#cert-image");
    const download = $("#cert-download");
    const modal = $("#cert-modal");
    if (!image || !download || !modal) return;

    const name = (state.name || "").trim() || "Agent Builder";
    const date = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const dataUrl = drawCertificate(name, date);
    if (!dataUrl) {
      showToast("Could not draw the certificate in this browser.");
      return;
    }

    image.src = dataUrl;
    download.href = dataUrl;
    download.download = "agent-lab-certificate.png";
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    const shell = $(".app-shell");
    if (shell) shell.inert = true;
    const close = $("#cert-close");
    if (close) setTimeout(() => close.focus(), 30);
  }

  function closeCertificate() {
    const modal = $("#cert-modal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    const shell = $(".app-shell");
    if (shell) shell.inert = false;
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function initCertificate() {
    const open = $("#open-cert");
    const close = $("#cert-close");
    const dismiss = $("#cert-dismiss");
    const modal = $("#cert-modal");
    if (open) open.addEventListener("click", openCertificate);
    if (close) close.addEventListener("click", closeCertificate);
    if (dismiss) dismiss.addEventListener("click", closeCertificate);
    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeCertificate();
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Resources filter                                                   */
  /* ------------------------------------------------------------------ */

  function initResourceFilters() {
    const grid = $("#resource-grid");
    const search = $("#resource-search");
    const empty = $("#resource-empty");
    const clear = $("#clear-resource-filters");
    if (!grid) return;

    let activeFilter = "all";

    function syncFilterChips() {
      $$("[data-filter]", $("#resource-filters")).forEach((item) => {
        item.classList.toggle("is-active", item.dataset.filter === activeFilter);
      });
    }

    function apply() {
      const query = search ? search.value.trim().toLowerCase() : "";
      let visible = 0;

      $$(".resource-card", grid).forEach((card) => {
        const categories = (card.dataset.category || "").split(/\s+/);
        const haystack = `${card.dataset.search || ""} ${card.textContent}`.toLowerCase();
        const categoryMatch = activeFilter === "all" || categories.includes(activeFilter);
        const queryMatch = !query || haystack.includes(query);
        const show = categoryMatch && queryMatch;
        card.hidden = !show;
        if (show) visible += 1;
      });

      if (empty) empty.hidden = visible !== 0;
    }

    $$("[data-filter]", $("#resource-filters") || document).forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        syncFilterChips();
        apply();
      });
    });

    if (search) {
      search.addEventListener("input", () => {
        // Search should span the whole shelf, even if a category was selected.
        if (search.value.trim()) {
          activeFilter = "all";
          syncFilterChips();
        }
        apply();
      });
    }

    if (clear) {
      clear.addEventListener("click", () => {
        activeFilter = "all";
        if (search) search.value = "";
        syncFilterChips();
        apply();
      });
    }

    apply();
  }

  /* ------------------------------------------------------------------ */
  /* Global keys                                                        */
  /* ------------------------------------------------------------------ */

  function initSkipLink() {
    const skip = $(".skip-link");
    if (!skip) return;
    skip.addEventListener("click", (event) => {
      event.preventDefault();
      const main = $("#main");
      if (main) {
        main.focus({ preventScroll: true });
        main.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function initGlobalKeys() {
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (
        event.key === "/" &&
        !typing &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !document.body.classList.contains("modal-open")
      ) {
        event.preventDefault();
        openSearch();
        return;
      }

      if (event.key === "Escape") {
        const searchModal = $("#search-modal");
        const certModal = $("#cert-modal");
        if (searchModal && !searchModal.hidden) closeSearch();
        else if (certModal && !certModal.hidden) closeCertificate();
        else closeNav();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                               */
  /* ------------------------------------------------------------------ */

  function init() {
    $$(".icon").forEach((icon) => icon.setAttribute("aria-hidden", "true"));
    initTheme();
    initNav();
    initBrief();
    initQuizzes();
    initSimulator();
    initPermissionLabs();
    initPickers();
    initMission();
    initMissionKit();
    initAudit();
    initStudio();
    initNameAndReset();
    initTabs();
    initCopyButtons();
    initScrollButtons();
    initSearch();
    initCertificate();
    initResourceFilters();
    initSkipLink();
    initGlobalKeys();
    initCompletionButtons();

    if (!location.hash) {
      history.replaceState(null, "", "#/overview");
    }

    buildSearchIndex();
    updateProgress();
    route();

    window.addEventListener("hashchange", route);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
