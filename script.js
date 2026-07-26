const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const navigation = document.querySelector("[data-nav]");

function initializeIcons() {
  if (window.lucide) {
    window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }
}

initializeIcons();

window.addEventListener("load", initializeIcons, { once: true });

function setMenu(open) {
  navigation.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "關閉導覽選單" : "開啟導覽選單");
  const icon = menuToggle.querySelector("svg");
  if (icon) {
    icon.outerHTML = `<i data-lucide="${open ? "x" : "menu"}" aria-hidden="true"></i>`;
    initializeIcons();
  }
}

menuToggle.addEventListener("click", () => {
  setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
});

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

document.addEventListener("click", (event) => {
  if (!header.contains(event.target) && navigation.classList.contains("is-open")) {
    setMenu(false);
  }
});

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}, { passive: true });

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px" });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const observedSections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...navigation.querySelectorAll("a[href^='#']")];
const sectionObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

  if (!visible) return;

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
  });
}, { threshold: [0.25, 0.55], rootMargin: "-72px 0px -45%" });

observedSections.forEach((section) => sectionObserver.observe(section));

const lessonSteps = [
  {
    phase: "準備進攻",
    title: "選擇一個有效戰區",
    description: "只有預備區內的就緒單位可以執行一般進攻。你不能攻擊自己已控制的戰區。",
    notes: ["單位必須處於就緒狀態", "進攻後立即進入戰鬥階段"],
    boardState: "ready"
  },
  {
    phase: "進攻宣告",
    title: "移入戰區，戰鬥立即開始",
    description: "先鋒機甲從我方預備區進入天穹裂口，成為進攻者；原本佔區的暗影守衛成為防守者。",
    notes: ["每個戰區最多 1 名進攻者與 1 名防守者", "戰鬥結束前不能開始下一個主階段行動"],
    boardState: "attack"
  },
  {
    phase: "1 / 能力步驟",
    title: "先計算，再觸發攻守能力",
    description: "套用物品、領土與被動加成，再讓 On Attack 與 On Defend 進入效果堆疊。防守者的效果會先結算。",
    notes: ["攻擊效果先入堆疊，防守效果後入", "堆疊採後進先出，因此 On Defend 先結算"],
    boardState: "attack"
  },
  {
    phase: "2–3 / 反制與確認",
    title: "防守方有第一個回應機會",
    description: "防守方可先開啟反制堆疊，雙方之後交替回應。全部反制由最後加入者開始結算，再確認攻守目標仍然有效。",
    notes: ["Counter、翻開領土與可支付的啟動能力都能回應", "任一攻守單位失效時，會跳過戰鬥傷害"],
    boardState: "counter"
  },
  {
    phase: "4 / 戰鬥傷害",
    title: "雙方同時交換傷害",
    description: "先鋒機甲造成 4 點，摧毀 3 HP 的守軍；就緒的暗影守衛同時造成 2 點，先鋒機甲保留 2 點暫時傷害。",
    notes: ["嘗試造成戰鬥傷害的存活單位會橫置", "暫時傷害在回合結束時重置"],
    boardState: "damage"
  },
  {
    phase: "5 / 結算",
    title: "進攻者獨存，取得戰區控制",
    description: "暗影守衛進入墓地，先鋒機甲留在天穹裂口。回合結束計分時，它會依 2 點影響力為你取得 2 VP。",
    notes: ["若雙方都存活，進攻者會回到原處", "戰鬥結束後回到主階段"],
    boardState: "resolved"
  }
];

let lessonIndex = 0;
const attacker = document.querySelector("#attacker-unit");
const defender = document.querySelector("#defender-unit");
const playerStaging = document.querySelector("#player-staging");
const duelSlot = document.querySelector("#duel-slot");
const activeZone = document.querySelector("[data-zone='beta']");
const enemyGrave = document.querySelector("#enemy-grave");
const zoneStatus = document.querySelector("#zone-status");
const lessonStepLabel = document.querySelector("#lesson-step-label");
const lessonProgressBar = document.querySelector("#lesson-progress-bar");
const lessonPhase = document.querySelector("#lesson-phase");
const lessonTitle = document.querySelector("#lesson-title");
const lessonDescription = document.querySelector("#lesson-description");
const lessonNotes = document.querySelector("#lesson-notes");
const previousButton = document.querySelector("[data-demo-prev]");
const nextButton = document.querySelector("[data-demo-next]");

function resetUnitClasses() {
  attacker.classList.remove("is-in-zone", "is-damaged", "is-exhausted");
  defender.classList.remove("is-in-zone", "is-damaged", "is-defeated");
  activeZone.classList.remove("is-player-controlled", "is-countering");
  enemyGrave.classList.remove("has-card");
}

function renderBoardState(state) {
  resetUnitClasses();

  if (state === "ready") {
    playerStaging.append(attacker);
    document.querySelector(".field-console").append(defender);
    zoneStatus.textContent = "由對手控制";
    return;
  }

  duelSlot.append(attacker, defender);
  attacker.classList.add("is-in-zone");
  defender.classList.add("is-in-zone");

  if (state === "counter") {
    activeZone.classList.add("is-countering");
  } else {
    activeZone.classList.remove("is-countering");
  }

  if (state === "damage") {
    attacker.classList.add("is-damaged", "is-exhausted");
    defender.classList.add("is-damaged", "is-defeated");
  }

  if (state === "resolved") {
    defender.classList.add("is-defeated");
    attacker.classList.add("is-damaged", "is-exhausted");
    activeZone.classList.add("is-player-controlled");
    enemyGrave.classList.add("has-card");
    zoneStatus.textContent = "由我方控制 · 2 INF";
  } else {
    zoneStatus.textContent = "戰鬥進行中";
  }
}

function renderLesson() {
  const step = lessonSteps[lessonIndex];
  lessonStepLabel.textContent = `步驟 ${lessonIndex + 1} / ${lessonSteps.length}`;
  lessonProgressBar.style.width = `${((lessonIndex + 1) / lessonSteps.length) * 100}%`;
  lessonPhase.textContent = step.phase;
  lessonTitle.textContent = step.title;
  lessonDescription.textContent = step.description;
  lessonNotes.replaceChildren(...step.notes.map((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    return item;
  }));
  previousButton.disabled = lessonIndex === 0;
  nextButton.innerHTML = lessonIndex === lessonSteps.length - 1
    ? `重新演練 <i data-lucide="rotate-ccw" aria-hidden="true"></i>`
    : `下一步 <i data-lucide="arrow-right" aria-hidden="true"></i>`;
  renderBoardState(step.boardState);
  initializeIcons();
}

previousButton.addEventListener("click", () => {
  lessonIndex = Math.max(0, lessonIndex - 1);
  renderLesson();
});

nextButton.addEventListener("click", () => {
  lessonIndex = lessonIndex === lessonSteps.length - 1 ? 0 : lessonIndex + 1;
  renderLesson();
});

document.querySelector("[data-demo-reset]").addEventListener("click", () => {
  lessonIndex = 0;
  renderLesson();
});

renderLesson();

const scores = { you: 0, opponent: 0 };
const victoryDialog = document.querySelector("#victory-dialog");
const victoryTitle = document.querySelector("#victory-title");
const victoryMessage = document.querySelector("#victory-message");

function updateScores() {
  document.querySelectorAll("[data-player]").forEach((panel) => {
    const player = panel.dataset.player;
    const value = scores[player];
    panel.querySelector("[data-score-value]").textContent = value;
    panel.querySelector("[data-score-bar]").style.width = `${Math.min(100, (value / 20) * 100)}%`;
    const progress = panel.querySelector("[role='progressbar']");
    progress.setAttribute("aria-valuenow", String(value));
    progress.setAttribute("aria-valuetext", `${value} 勝利點`);
  });
}

document.querySelectorAll("[data-score-change]").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.closest("[data-player]");
    const player = panel.dataset.player;
    const previous = scores[player];
    scores[player] = Math.max(0, Math.min(30, previous + Number(button.dataset.scoreChange)));
    updateScores();

    if (previous < 20 && scores[player] >= 20) {
      const youWon = player === "you";
      victoryTitle.textContent = youWon ? "戰線已確立" : "對手掌控了戰線";
      victoryMessage.textContent = `${youWon ? "我方" : "對手"}率先達到 20 VP，贏得本局。`;
      victoryDialog.showModal();
      document.body.classList.add("dialog-open");
    }
  });
});

document.querySelector("[data-score-reset]").addEventListener("click", () => {
  scores.you = 0;
  scores.opponent = 0;
  updateScores();
});

document.querySelector("[data-close-victory]").addEventListener("click", () => victoryDialog.close());
victoryDialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));

const phaseTabs = [...document.querySelectorAll("[data-phase-tab]")];
const phasePanels = [...document.querySelectorAll("[data-phase-panel]")];

function selectPhase(selectedTab, focus = false) {
  const phase = selectedTab.dataset.phaseTab;
  phaseTabs.forEach((tab) => {
    const selected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  phasePanels.forEach((panel) => {
    panel.hidden = panel.dataset.phasePanel !== phase;
  });
  if (focus) selectedTab.focus();
}

phaseTabs.forEach((tab, tabIndex) => {
  tab.addEventListener("click", () => selectPhase(tab));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = tabIndex;
    if (event.key === "ArrowLeft") nextIndex = (tabIndex - 1 + phaseTabs.length) % phaseTabs.length;
    if (event.key === "ArrowRight") nextIndex = (tabIndex + 1) % phaseTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = phaseTabs.length - 1;
    selectPhase(phaseTabs[nextIndex], true);
  });
});

const glossarySearch = document.querySelector("[data-glossary-search]");
const glossaryEntries = [...document.querySelectorAll("[data-glossary-list] article")];
const noResults = document.querySelector("[data-no-results]");

glossarySearch.addEventListener("input", () => {
  const query = glossarySearch.value.trim().toLocaleLowerCase("zh-Hant");
  let visibleCount = 0;

  glossaryEntries.forEach((entry) => {
    const searchable = `${entry.dataset.search} ${entry.textContent}`.toLocaleLowerCase("zh-Hant");
    const visible = !query || searchable.includes(query);
    entry.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  noResults.hidden = visibleCount !== 0;
});

const quickDialog = document.querySelector("#quick-dialog");

document.querySelectorAll("[data-open-quick]").forEach((button) => {
  button.addEventListener("click", () => {
    setMenu(false);
    quickDialog.showModal();
    document.body.classList.add("dialog-open");
  });
});

document.querySelector("[data-close-dialog]").addEventListener("click", () => quickDialog.close());
quickDialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));

const cardDialog = document.querySelector("#card-dialog");
const cardDialogImage = document.querySelector("#card-dialog-image");
const cardDialogTitle = document.querySelector("#card-dialog-title");

document.querySelectorAll("[data-card-zoom]").forEach((button) => {
  button.addEventListener("click", () => {
    const image = button.querySelector("img");
    cardDialogImage.src = image.currentSrc || image.src;
    cardDialogImage.alt = image.alt;
    cardDialogTitle.textContent = button.dataset.cardName;
    cardDialog.showModal();
    document.body.classList.add("dialog-open");
  });
});

document.querySelector("[data-close-card]").addEventListener("click", () => cardDialog.close());
cardDialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));

[quickDialog, cardDialog, victoryDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) dialog.close();
  });
});