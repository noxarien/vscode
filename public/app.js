const gamesGrid = document.querySelector("#gamesGrid");
const peopleSections = document.querySelector("#peopleSections");
const totalPlaying = document.querySelector("#totalPlaying");
const studioCount = document.querySelector("#studioCount");
const onlineCount = document.querySelector("#onlineCount");
const experienceCount = document.querySelector("#experienceCount");
const activeGameCount = document.querySelector("#activeGameCount");
const refreshLabel = document.querySelector("#refreshLabel");
const refreshButton = document.querySelector("#refreshButton");
const gameTemplate = document.querySelector("#gameTemplate");
const personTemplate = document.querySelector("#personTemplate");
const sectionTemplate = document.querySelector("#sectionTemplate");
const timelineDialog = document.querySelector("#timelineDialog");
const timelineEyebrow = document.querySelector("#timelineEyebrow");
const timelineTitle = document.querySelector("#timelineTitle");
const timelineSubtitle = document.querySelector("#timelineSubtitle");
const timelineList = document.querySelector("#timelineList");
const timelineClose = document.querySelector("#timelineClose");
const deployedApiOrigin = "https://vscode-mocha.vercel.app";
const trackerKey = document.body.dataset.tracker || "current";
const presenceStorageKey = `fri-observed-presence-${trackerKey}-v1`;
const maxStoredTimelineEntries = 120;
let latestGames = [];
let latestPeople = [];
let activeStudioUserId = null;
let activeStudioRange = "1d";

const studioRanges = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000
};

const numberFormatter = new Intl.NumberFormat();
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});
const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric"
});
const shortTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit"
});
const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short"
});

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const requestTimeoutMs = 12_000;

function apiBaseUrl() {
  if (window.location.protocol === "file:") {
    return `${deployedApiOrigin}/api/dashboard`;
  }

  return new URL("/api/dashboard", window.location.href).toString();
}

async function fetchDashboardJson() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const requestUrl = new URL(apiBaseUrl());
    requestUrl.searchParams.set("tracker", trackerKey);
    requestUrl.searchParams.set("time", Date.now());
    const response = await fetch(requestUrl, {
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Dashboard API failed: ${response.status}`);
    }

    return response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function relativeTime(dateValue) {
  if (!dateValue) return "Unknown";

  const then = new Date(dateValue);
  const diffSeconds = Math.round((then.getTime() - Date.now()) / 1000);
  const divisions = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60]
  ];

  for (const [unit, seconds] of divisions) {
    if (Math.abs(diffSeconds) >= seconds || unit === "minute") {
      return relativeFormatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
}

function presenceDetails(type) {
  if (type === 3) return { label: "In Studio", className: "studio" };
  if (type === 2) return { label: "In Game", className: "ingame" };
  if (type === 1) return { label: "Online", className: "online" };
  return { label: "Offline", className: "offline" };
}

function personStateKey(person) {
  return [
    person.presenceType,
    person.activeGamePlaceId || "",
    person.activeUniverseId || "",
    person.locationDetail || ""
  ].join(":");
}

function readPresenceHistory() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(presenceStorageKey) || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function writePresenceHistory(history) {
  try {
    window.localStorage.setItem(presenceStorageKey, JSON.stringify(history));
  } catch {
    // Tracking still works for the current page when browser storage is unavailable.
  }
}

function mergePersistedPresence(data) {
  const now = new Date().toISOString();
  const history = readPresenceHistory();
  const activeUserIds = new Set(data.staff.map((person) => String(person.userId)));
  const timelinesByUser = new Map();

  for (const storedUserId of Object.keys(history)) {
    if (!activeUserIds.has(storedUserId)) {
      delete history[storedUserId];
    }
  }

  for (const person of data.staff) {
    const userId = String(person.userId);
    const serverTimeline = Array.isArray(person.timeline) ? person.timeline : [];
    const savedTimeline = Array.isArray(history[userId]?.timeline)
      ? history[userId].timeline
      : serverTimeline;
    const timeline = savedTimeline.map((entry) => ({ ...entry }));
    const stateKey = personStateKey(person);
    let activeEntry = [...timeline].reverse().find((entry) => !entry.endedAt) || null;
    const serverActiveEntry = [...serverTimeline].reverse().find((entry) => !entry.endedAt && (
      entry.stateKey === stateKey || (
        entry.presenceType === person.presenceType && entry.detail === person.locationDetail
      )
    ));

    if (activeEntry?.stateKey === stateKey) {
      if (serverActiveEntry && new Date(serverActiveEntry.startedAt) < new Date(activeEntry.startedAt)) {
        activeEntry.startedAt = serverActiveEntry.startedAt;
      }
      activeEntry.lastSeenAt = now;
      activeEntry.detail = person.locationDetail;
    } else {
      if (activeEntry) {
        activeEntry.endedAt = now;
        activeEntry.lastSeenAt = now;
      }

      activeEntry = {
        userId: person.userId,
        label: presenceDetails(person.presenceType).label,
        detail: person.locationDetail,
        startedAt: serverActiveEntry?.startedAt || now,
        lastSeenAt: now,
        endedAt: null,
        presenceType: person.presenceType,
        stateKey
      };
      timeline.push(activeEntry);
    }

    const trimmedTimeline = timeline.slice(-maxStoredTimelineEntries);
    person.timeline = trimmedTimeline;
    person.studioObservedStartedAt = person.presenceType === 3 ? activeEntry.startedAt : null;
    timelinesByUser.set(userId, trimmedTimeline);
    history[userId] = { timeline: trimmedTimeline, lastSeenAt: now };
  }

  for (const section of data.sections || []) {
    for (const person of section.people || []) {
      person.timeline = timelinesByUser.get(String(person.userId)) || person.timeline || [];
      const activeEntry = [...person.timeline].reverse().find((entry) => !entry.endedAt);
      person.studioObservedStartedAt = person.presenceType === 3 ? activeEntry?.startedAt || null : null;
    }
  }

  writePresenceHistory(history);
  return data;
}

function setLoading() {
  const gameCount = trackerKey === "erlc" ? 16 : 6;
  gamesGrid.innerHTML = Array.from({ length: gameCount }, () => `<article class="game-card skeleton"></article>`).join("");
  if (peopleSections) {
    peopleSections.innerHTML = Array.from({ length: 4 }, () => `
      <section class="people-section">
        <div class="people-section-heading skeleton"></div>
        <div class="people-grid">${Array.from({ length: 3 }, () => `<article class="person-card skeleton"></article>`).join("")}</div>
      </section>
    `).join("");
  }
}

function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function elapsedLabel(startValue, endValue = new Date().toISOString()) {
  if (!startValue) return "Unknown duration";

  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  const totalSeconds = Math.max(0, Math.round((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return "Less than 1m";
}

function plainRelativeTime(dateValue) {
  if (!dateValue) return "Unknown";

  return relativeTime(dateValue).replace("ago", "").trim();
}

function renderGames(games) {
  latestGames = games;
  gamesGrid.innerHTML = "";

  games.forEach((game, index) => {
    const node = gameTemplate.content.cloneNode(true);
    const updatedDate = game.updated ? new Date(game.updated) : null;
    node.querySelector(".game-index").textContent = String(index + 1).padStart(2, "0");
    node.querySelector("h3").textContent = game.displayName;
    node.querySelector(".updated").innerHTML = updatedDate
      ? `<strong>${relativeTime(game.updated)}</strong><span>${dateFormatter.format(updatedDate)}</span>`
      : "<strong>Unknown</strong><span>No date returned</span>";
    node.querySelector(".game-player-count").textContent = numberFormatter.format(game.playing || 0);
    const card = node.querySelector(".game-card");
    card.dataset.placeId = game.placeId;
    card.setAttribute("aria-label", `Open ${game.displayName} timeline`);
    gamesGrid.append(node);
  });
}

function timelineEntryMarkup(entry) {
  const started = entry.startedAt ? dateFormatter.format(new Date(entry.startedAt)) : "Unknown start";
  const ended = entry.endedAt ? dateFormatter.format(new Date(entry.endedAt)) : "Active now";
  const duration = elapsedLabel(entry.startedAt, entry.endedAt || new Date().toISOString());
  const status = entry.endedAt ? "Ended" : "Active";

  return `
    <article class="timeline-entry">
      <img src="${entry.avatarUrl}" alt="${entry.name} Roblox avatar" width="44" height="44">
      <div>
        <div class="timeline-entry-title">
          <a href="${entry.profileUrl}" target="_blank" rel="noreferrer">${entry.name}</a>
          <span>${status}</span>
        </div>
        <p>${entry.role}</p>
        <dl>
          <div><dt>Started</dt><dd>${started}</dd></div>
          <div><dt>Ended</dt><dd>${ended}</dd></div>
          <div><dt>Duration</dt><dd>${duration}</dd></div>
        </dl>
      </div>
    </article>
  `;
}

function personTimelineEntryMarkup(entry) {
  const started = entry.startedAt ? dateFormatter.format(new Date(entry.startedAt)) : "Unknown start";
  const ended = entry.endedAt ? dateFormatter.format(new Date(entry.endedAt)) : "Active now";
  const duration = elapsedLabel(entry.startedAt, entry.endedAt || new Date().toISOString());
  const status = entry.endedAt ? "Ended" : "Current";
  const presence = presenceDetails(entry.presenceType);

  return `
    <article class="timeline-entry person-timeline-entry">
      <span class="presence-badge ${presence.className}">${entry.label}</span>
      <div>
        <div class="timeline-entry-title">
          <strong>${entry.detail || entry.label}</strong>
          <span>${status}</span>
        </div>
        <dl>
          <div><dt>Started</dt><dd>${started}</dd></div>
          <div><dt>Ended</dt><dd>${ended}</dd></div>
          <div><dt>Duration</dt><dd>${duration}</dd></div>
        </dl>
      </div>
    </article>
  `;
}

function statusLine(person) {
  const presence = presenceDetails(person.presenceType);
  if (person.presenceType === 3) {
    return `${person.role} · In Studio`;
  }

  return `${person.role} · ${presence.label}`;
}

function lastOnlineLabel(person) {
  if (person.presenceType > 0) return "Now";

  const lastOnline = [...(person.timeline || [])].reverse().find((entry) => entry.presenceType > 0)?.endedAt;
  return lastOnline ? `${plainRelativeTime(lastOnline)} ago` : "Unknown";
}

function currentPresenceEntry(person) {
  return [...(person.timeline || [])].reverse().find((entry) => !entry.endedAt) || null;
}

function currentPresenceDuration(person) {
  const entry = currentPresenceEntry(person);
  return entry ? elapsedLabel(entry.startedAt) : "Not active";
}

function currentPresenceMetricLabel(person) {
  if (person.presenceType === 3) return "Current Studio Time";
  if (person.presenceType === 2) return "Current Game Time";
  if (person.presenceType === 1) return "Current Online Time";
  return "Current Status Time";
}

function buildStudioSegments(timeline, rangeKey) {
  const now = Date.now();
  const windowStart = now - studioRanges[rangeKey];
  const sourceEntries = timeline.length
    ? timeline
    : [{ presenceType: 0, startedAt: new Date(windowStart).toISOString(), endedAt: new Date(now).toISOString() }];

  return sourceEntries.map((entry) => {
    const start = Math.max(new Date(entry.startedAt).getTime(), windowStart);
    const end = Math.min(new Date(entry.endedAt || now).getTime(), now);

    if (end <= windowStart || start >= now || end <= start) {
      return "";
    }

    const left = ((start - windowStart) / (now - windowStart)) * 100;
    const width = Math.max(((end - start) / (now - windowStart)) * 100, 0.8);
    const visibleLeft = Math.min(left, 100 - width);
    const tooltipClass = visibleLeft > 65
      ? "tooltip-right"
      : visibleLeft < 35
        ? "tooltip-left"
        : "tooltip-center";
    const segmentPresence = presenceDetails(entry.presenceType);
    const className = `timeline-${segmentPresence.className}`;
    const label = segmentPresence.label;
    const exactStart = dateFormatter.format(new Date(entry.startedAt));
    const exactEnd = entry.endedAt
      ? dateFormatter.format(new Date(entry.endedAt))
      : `Active now (${dateFormatter.format(new Date())})`;
    const tooltip = `${label}\nStart: ${exactStart}\nEnd: ${exactEnd}\nDuration: ${elapsedLabel(entry.startedAt, entry.endedAt || new Date().toISOString())}`;

    return `<span class="${className} ${tooltipClass}" tabindex="0" style="left:${visibleLeft}%;width:${width}%;" data-tooltip="${tooltip}" title="${tooltip.replaceAll("\n", " | ")}" aria-label="${label}, ${exactStart} to ${exactEnd}"></span>`;
  }).join("");
}

function studioTicks(rangeKey) {
  const now = Date.now();
  const start = now - studioRanges[rangeKey];
  const offsets = [0, 0.25, 0.5, 0.75, 1];

  return offsets.map((offset) => {
    const date = new Date(start + (now - start) * offset);
    if (rangeKey === "1h") {
      return `<span><b>${shortTimeFormatter.format(date)}</b><b>${offset === 1 ? "Now" : "Today"}</b></span>`;
    }

    if (rangeKey === "1w") {
      return `<span><b>${shortDateFormatter.format(date)}</b><b>${weekdayFormatter.format(date)}</b></span>`;
    }

    return `<span><b>${shortDateFormatter.format(date)}</b><b>${shortTimeFormatter.format(date)}</b></span>`;
  }).join("");
}

function studioTrackerMarkup(person, rangeKey = activeStudioRange) {
  const presence = presenceDetails(person.presenceType);
  const timeline = person.timeline || [];

  return `
    <section class="studio-tracker">
      <div class="studio-profile">
        <img src="${person.avatarUrl}" alt="${person.displayName || person.name} Roblox avatar" width="48" height="48">
        <div>
          <strong>${person.displayName || person.name}</strong>
          <span>${statusLine(person)}</span>
        </div>
      </div>
      <div class="studio-status-row">
        <div>
          <p>Status</p>
          <strong>${presence.label}</strong>
          <span>Last online ${lastOnlineLabel(person)}</span>
        </div>
        <div class="range-toggle" aria-label="Timeline range">
          ${Object.keys(studioRanges).map((key) => `
            <button type="button" data-studio-range="${key}" aria-pressed="${key === rangeKey}">${key}</button>
          `).join("")}
        </div>
      </div>
      <div class="studio-stat-grid">
        <div><span>Last Online</span><strong>${lastOnlineLabel(person)}</strong></div>
        <div><span>${currentPresenceMetricLabel(person)}</span><strong>${currentPresenceDuration(person)}</strong></div>
        <div><span>Observed Changes</span><strong>${numberFormatter.format(timeline.length)}</strong></div>
      </div>
      <div class="studio-bar-card">
        <h3>Status timeline</h3>
        <div class="studio-chart-surface" aria-label="Observed Roblox status over time">
          <div class="studio-bar">
            <div class="studio-bar-track">${buildStudioSegments(timeline, rangeKey)}</div>
          </div>
          <div class="studio-ticks">${studioTicks(rangeKey)}</div>
        </div>
        <div class="timeline-legend" aria-label="Timeline colors">
          <span><i class="timeline-studio"></i>Studio</span>
          <span><i class="timeline-ingame"></i>In Game</span>
          <span><i class="timeline-online"></i>Online</span>
          <span><i class="timeline-offline"></i>Offline</span>
        </div>
      </div>
      <div class="studio-events">
        ${timeline.length ? timeline.slice().reverse().map(personTimelineEntryMarkup).join("") : `<p class="empty-state">No observed status history yet.</p>`}
      </div>
    </section>
  `;
}

function openTimeline(placeId) {
  const game = latestGames.find((entry) => String(entry.placeId) === String(placeId));
  if (!game) return;

  const timeline = [...(game.timeline || [])].reverse();
  timelineDialog.classList.remove("studio-dialog");
  timelineEyebrow.textContent = "Observed game timeline";
  timelineTitle.textContent = game.displayName;
  timelineSubtitle.textContent = timeline.length
    ? `${numberFormatter.format(timeline.length)} observed ${pluralize(timeline.length, "visit")} since this server started tracking.`
    : "No tracked support members have been observed in this game since this server started tracking.";
  timelineList.innerHTML = timeline.length
    ? timeline.map(timelineEntryMarkup).join("")
    : `<p class="empty-state">No timeline entries yet. Entries appear when a tracked support member is observed in this game.</p>`;
  timelineDialog.showModal();
}

function openPersonTimeline(userId) {
  const person = latestPeople.find((entry) => String(entry.userId) === String(userId));
  if (!person) return;

  activeStudioUserId = person.userId;
  activeStudioRange = "1d";
  timelineDialog.classList.add("studio-dialog");
  timelineEyebrow.textContent = "Studio tracker";
  timelineTitle.textContent = person.displayName || person.name;
  timelineSubtitle.textContent = statusLine(person);
  timelineList.innerHTML = studioTrackerMarkup(person, activeStudioRange);
  timelineDialog.showModal();
}

function presenceDurationLabel(person) {
  const entry = currentPresenceEntry(person);
  if (!entry) return person.locationDetail || "Offline";

  const presence = presenceDetails(person.presenceType);
  return `${presence.label} for ${elapsedLabel(entry.startedAt)}`;
}

function renderPeopleSections(sections) {
  latestPeople = sections.flatMap((section) => section.people || []);
  if (!peopleSections) return;

  peopleSections.innerHTML = "";

  sections.forEach((section) => {
    const sectionNode = sectionTemplate.content.cloneNode(true);
    sectionNode.querySelector("h3").textContent = section.name;
    sectionNode.querySelector("p").textContent = `${numberFormatter.format(section.people.length)} ${pluralize(section.people.length, "person", "people")}`;
    const grid = sectionNode.querySelector(".people-grid");

    section.people.forEach((person) => {
      const presence = presenceDetails(person.presenceType);
      const node = personTemplate.content.cloneNode(true);
      const image = node.querySelector("img");
      image.src = person.avatarUrl;
      image.alt = `${person.displayName || person.name} Roblox avatar`;
      node.querySelector("h3").textContent = person.displayName || person.name;
      node.querySelector(".role").textContent = `${person.role} · @${person.robloxName}`;
      node.querySelector(".location").textContent = person.presenceType > 0
        ? presenceDurationLabel(person)
        : person.locationDetail || "Offline";
      const badge = node.querySelector(".presence-badge");
      badge.textContent = presence.label;
      badge.classList.add(presence.className);
      const link = node.querySelector("a");
      link.href = person.url;
      const card = node.querySelector(".person-card");
      card.dataset.userId = person.userId;
      card.setAttribute("aria-label", `Open ${person.displayName || person.name} timeline`);
      grid.append(node);
    });

    peopleSections.append(sectionNode);
  });
}

async function loadDashboard({ showSkeleton = false } = {}) {
  if (showSkeleton) setLoading();
  refreshButton.disabled = true;
  refreshLabel.textContent = "Syncing Roblox";

  try {
    const data = mergePersistedPresence(await fetchDashboardJson());
    const staffOnline = data.staff.filter((person) => person.presenceType > 0).length;
    const staffInStudio = data.staff.filter((person) => person.presenceType === 3).length;

    totalPlaying.textContent = numberFormatter.format(data.totalPlaying);
    if (studioCount) studioCount.textContent = numberFormatter.format(staffInStudio);
    if (onlineCount) onlineCount.textContent = numberFormatter.format(staffOnline);
    if (experienceCount) experienceCount.textContent = numberFormatter.format(data.games.length);
    if (activeGameCount) {
      activeGameCount.textContent = numberFormatter.format(
        data.games.filter((game) => Number(game.playing || 0) > 0).length
      );
    }
    renderGames(data.games);
    renderPeopleSections(data.sections || []);
    refreshLabel.textContent = `Updated ${relativeTime(data.generatedAt)}`;
  } catch (error) {
    refreshLabel.textContent = "Roblox sync failed";
    gamesGrid.innerHTML = `<p class="empty-state">Could not load Roblox data right now. If this page is opened as a file, the deployed API must allow CORS from ${deployedApiOrigin}. If you still see this after redeploying, the API request is timing out or being blocked.</p>`;
    if (peopleSections) peopleSections.innerHTML = "";
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", () => loadDashboard());
timelineClose.addEventListener("click", () => timelineDialog.close());
timelineDialog.addEventListener("click", (event) => {
  const rangeButton = event.target.closest("[data-studio-range]");
  if (rangeButton) {
    const person = latestPeople.find((entry) => String(entry.userId) === String(activeStudioUserId));
    if (person && studioRanges[rangeButton.dataset.studioRange]) {
      activeStudioRange = rangeButton.dataset.studioRange;
      timelineList.innerHTML = studioTrackerMarkup(person, activeStudioRange);
    }
    return;
  }

  if (event.target === timelineDialog) {
    timelineDialog.close();
  }
});
gamesGrid.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    return;
  }

  const card = event.target.closest(".game-card");
  if (card) {
    openTimeline(card.dataset.placeId);
  }
});
gamesGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest(".game-card");
  if (card) {
    event.preventDefault();
    openTimeline(card.dataset.placeId);
  }
});
if (peopleSections) {
  peopleSections.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      return;
    }

    const card = event.target.closest(".person-card");
    if (card) {
      openPersonTimeline(card.dataset.userId);
    }
  });
  peopleSections.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const card = event.target.closest(".person-card");
    if (card) {
      event.preventDefault();
      openPersonTimeline(card.dataset.userId);
    }
  });
}
loadDashboard({ showSkeleton: true });
setInterval(loadDashboard, 60_000);
