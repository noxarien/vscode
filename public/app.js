const gamesGrid = document.querySelector("#gamesGrid");
const peopleGrid = document.querySelector("#peopleGrid");
const totalPlaying = document.querySelector("#totalPlaying");
const studioCount = document.querySelector("#studioCount");
const onlineCount = document.querySelector("#onlineCount");
const refreshLabel = document.querySelector("#refreshLabel");
const refreshButton = document.querySelector("#refreshButton");
const gameTemplate = document.querySelector("#gameTemplate");
const personTemplate = document.querySelector("#personTemplate");

const numberFormatter = new Intl.NumberFormat();
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

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

function setLoading() {
  gamesGrid.innerHTML = Array.from({ length: 8 }, () => `<article class="game-card skeleton"></article>`).join("");
  peopleGrid.innerHTML = Array.from({ length: 8 }, () => `<article class="person-card skeleton"></article>`).join("");
}

function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function activeTeamMarkup(game) {
  const staff = game.activeStaff || [];
  const playing = Number(game.playing || 0);

  if (!staff.length && playing > 0) {
    return `<em>${numberFormatter.format(playing)} ${pluralize(playing, "person", "people")} playing right now. Roblox is not showing which tracked staff member it is.</em>`;
  }

  if (!staff.length) {
    return `<em>No tracked team members confirmed here right now</em>`;
  }

  const staffMarkup = staff.map((person) => `
    <a href="${person.profileUrl}" target="_blank" rel="noreferrer" title="${person.name} · ${person.role}">
      <img src="${person.avatarUrl}" alt="${person.name}">
      <span>${person.name}</span>
    </a>
  `).join("");

  if (playing > staff.length) {
    const extraPlayers = playing - staff.length;
    return `${staffMarkup}<em>+ ${numberFormatter.format(extraPlayers)} other ${pluralize(extraPlayers, "player")} in this game</em>`;
  }

  return staffMarkup;
}

function renderGames(games) {
  gamesGrid.innerHTML = "";

  games.forEach((game, index) => {
    const node = gameTemplate.content.cloneNode(true);
    const updatedDate = game.updated ? new Date(game.updated) : null;
    const thumbnail = node.querySelector(".game-media img");
    thumbnail.src = game.thumbnailUrl;
    thumbnail.alt = `${game.displayName} Roblox thumbnail`;
    node.querySelector(".game-index").textContent = String(index + 1).padStart(2, "0");
    node.querySelector(".player-pill strong").textContent = numberFormatter.format(game.playing || 0);
    node.querySelector("h3").textContent = game.displayName;
    node.querySelector(".roblox-name").textContent = game.robloxName && game.robloxName !== game.displayName
      ? `Roblox name: ${game.robloxName}`
      : `By ${game.creator || "Roblox creator"}`;
    node.querySelector(".updated").innerHTML = updatedDate
      ? `<strong>${relativeTime(game.updated)}</strong><span>${dateFormatter.format(updatedDate)}</span>`
      : "<strong>Unknown</strong><span>No date returned</span>";
    node.querySelector(".max-players").textContent = game.maxPlayers ? numberFormatter.format(game.maxPlayers) : "Unknown";
    node.querySelector(".visits").textContent = numberFormatter.format(game.visits || 0);
    node.querySelector(".active-team-list").innerHTML = activeTeamMarkup(game);
    node.querySelector(".open-link").href = game.url;
    gamesGrid.append(node);
  });
}

function renderPeople(staff) {
  peopleGrid.innerHTML = "";

  staff.forEach((person) => {
    const presence = presenceDetails(person.presenceType);
    const node = personTemplate.content.cloneNode(true);
    const image = node.querySelector("img");
    image.src = person.avatarUrl;
    image.alt = `${person.name} Roblox avatar`;
    node.querySelector("h3").textContent = person.name;
    node.querySelector(".role").textContent = `${person.role} · @${person.robloxName}`;
    node.querySelector(".location").textContent = person.locationDetail || "Offline";
    const badge = node.querySelector(".presence-badge");
    badge.textContent = presence.label;
    badge.classList.add(presence.className);
    const link = node.querySelector("a");
    link.href = person.url;
    peopleGrid.append(node);
  });
}

async function loadDashboard({ showSkeleton = false } = {}) {
  if (showSkeleton) setLoading();
  refreshButton.disabled = true;
  refreshLabel.textContent = "Syncing Roblox";

  try {
    const response = await fetch(`/api/dashboard?time=${Date.now()}`);
    if (!response.ok) throw new Error("Dashboard API failed");
    const data = await response.json();
    const staffOnline = data.staff.filter((person) => person.presenceType > 0).length;
    const staffInStudio = data.staff.filter((person) => person.presenceType === 3).length;

    totalPlaying.textContent = numberFormatter.format(data.totalPlaying);
    studioCount.textContent = numberFormatter.format(staffInStudio);
    onlineCount.textContent = numberFormatter.format(staffOnline);
    renderGames(data.games);
    renderPeople(data.staff);
    refreshLabel.textContent = `Updated ${relativeTime(data.generatedAt)}`;
  } catch (error) {
    refreshLabel.textContent = "Roblox sync failed";
    gamesGrid.innerHTML = `<p class="empty-state">Could not load Roblox data right now. Try refreshing in a moment.</p>`;
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", () => loadDashboard());
loadDashboard({ showSkeleton: true });
setInterval(loadDashboard, 60_000);
