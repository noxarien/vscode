const trackedGameSets = {
  current: [
    { placeId: 72955595879933, label: "FRI Matt's Cars", url: "https://www.roblox.com/games/72955595879933/FRI-Matts-Cars" },
    { placeId: 13196289331, label: "QA Site 2", url: "https://www.roblox.com/games/13196289331/QA-Site-2" },
    { placeId: 13532792960, label: "QA Site 1", url: "https://www.roblox.com/games/13532792960/QA-Site-1" },
    { placeId: 91350978889564, label: "Development Server 2", url: "https://www.roblox.com/games/91350978889564/Development-Server-2" },
    { placeId: 14988246303, label: "QA Site 3", url: "https://www.roblox.com/games/14988246303/QA-Site-3" },
    { placeId: 120686709439283, label: "Rewrite P2", url: "https://www.roblox.com/games/120686709439283/Rewrite-P2" }
  ],
  erlc: [
    { placeId: 105003372185174, label: "Stretch It", url: "https://www.roblox.com/private-games/105003372185174/stretch-it" },
    { placeId: 102020166197995, label: "Dev2026", url: "https://www.roblox.com/private-games/102020166197995/dev2026" },
    { placeId: 99728472165803, label: "Buildspace", url: "https://www.roblox.com/private-games/99728472165803/buildspace" },
    { placeId: 11492250544, label: "Additional Testing", url: "https://www.roblox.com/private-games/11492250544/additional-testing" },
    { placeId: 8253868136, label: "Alternate Testing Site", url: "https://www.roblox.com/private-games/8253868136/alternate-testing-site" },
    { placeId: 90482280215411, label: "Top Secret Feature Testing", url: "https://www.roblox.com/private-games/90482280215411/top-secret-feature-testing" },
    { placeId: 109182134486328, label: "Midnight Development", url: "https://www.roblox.com/private-games/109182134486328/midnight-development" },
    { placeId: 72732640780295, label: "House Work Map", url: "https://www.roblox.com/private-games/72732640780295/house-work-map-" },
    { placeId: 108239219272617, label: "JeezPeasAndEsses Testing", url: "https://www.roblox.com/private-games/108239219272617/jeezpeasandesses-testing" }
  ]
};

const trackedGroupRules = {
  qaTeam: {
    groupId: 32038636,
    name: "First Response Interactive QA Team"
  },
  fri: {
    groupId: 12187674,
    name: "First Response Interactive"
  }
};

const robloxBatchSize = 100;

const caches = new Map();
const studioSessions = new Map();
const gameSessions = new Map();
const gameTimelineByPlace = new Map();
const personPresenceSessions = new Map();
const personTimelineByUser = new Map();

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function presenceLabel(type) {
  if (type === 3) return "In Studio";
  if (type === 2) return "In Game";
  if (type === 1) return "Online";
  return "Offline";
}

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function robloxJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "user-agent": "RobloxStatusDashboard/1.0",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Roblox API failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function getUniverseIds(trackedGames) {
  const entries = await Promise.all(trackedGames.map(async (game) => {
    const data = await robloxJson(`https://apis.roblox.com/universes/v1/places/${game.placeId}/universe`);
    return [game.placeId, data.universeId];
  }));

  return new Map(entries);
}

async function getGroupRoles(groupId) {
  const data = await robloxJson(`https://groups.roblox.com/v1/groups/${groupId}/roles`);
  return data.roles || [];
}

async function getRoleMembers(groupId, roleId) {
  let cursor = "";
  const members = [];

  while (true) {
    const suffix = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const data = await robloxJson(`https://groups.roblox.com/v1/groups/${groupId}/roles/${roleId}/users?limit=100&sortOrder=Asc${suffix}`);
    members.push(...(data.data || []));

    if (!data.nextPageCursor) {
      break;
    }

    cursor = data.nextPageCursor;
  }

  return members;
}

async function getTrackedStaff() {
  const [qaRoles, friRoles] = await Promise.all([
    getGroupRoles(trackedGroupRules.qaTeam.groupId),
    getGroupRoles(trackedGroupRules.fri.groupId)
  ]);

  const qaRankOneRoles = qaRoles.filter((role) => role.rank === 1);
  const friLeadershipRoles = friRoles.filter((role) => role.rank >= 251);

  const [qaMembersByRole, friMembersByRole] = await Promise.all([
    Promise.all(qaRankOneRoles.map(async (role) => ({
      role,
      members: await getRoleMembers(trackedGroupRules.qaTeam.groupId, role.id)
    }))),
    Promise.all(friLeadershipRoles.map(async (role) => ({
      role,
      members: await getRoleMembers(trackedGroupRules.fri.groupId, role.id)
    })))
  ]);

  const staffByUserId = new Map();

  for (const { members } of qaMembersByRole) {
    for (const member of members) {
      staffByUserId.set(member.userId, {
        userId: member.userId,
        name: member.displayName || member.username,
        role: "Tester",
        groupRoleRank: 1,
        section: "Testers",
        sectionOrder: 10_000,
        sectionType: "qa-testers",
        url: `https://www.roblox.com/users/${member.userId}/profile`
      });
    }
  }

  for (const { role, members } of friMembersByRole) {
    for (const member of members) {
      staffByUserId.set(member.userId, {
        userId: member.userId,
        name: member.displayName || member.username,
        role: role.name,
        groupRoleRank: role.rank,
        section: role.name,
        sectionOrder: 1000 - role.rank,
        sectionType: "fri-rank",
        url: `https://www.roblox.com/users/${member.userId}/profile`
      });
    }
  }

  return [...staffByUserId.values()].sort((a, b) => {
    return a.sectionOrder - b.sectionOrder || b.groupRoleRank - a.groupRoleRank || a.name.localeCompare(b.name);
  });
}

async function getGameData(trackedGames) {
  const universeIdsByPlace = await getUniverseIds(trackedGames);
  const orderedPlaceIds = trackedGames.map((game) => game.placeId);
  const games = trackedGames.map((game) => ({
    ...game,
    universeId: universeIdsByPlace.get(game.placeId) || null
  }));
  const universeIds = games.map((game) => game.universeId).filter(Boolean);
  const [data, iconData] = await Promise.all([
    robloxJson(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`),
    robloxJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(",")}&size=512x512&format=Png&isCircular=false`)
  ]);
  const gamesByUniverse = new Map((data.data || []).map((game) => [game.id, game]));
  const iconsByUniverse = new Map((iconData.data || []).map((icon) => [icon.targetId, icon.imageUrl]));

  return games.map((game) => {
    const roblox = gamesByUniverse.get(game.universeId);

    return {
      ...game,
      displayName: game.label || roblox?.name || "Unknown Roblox Experience",
      robloxName: roblox?.name || null,
      creator: roblox?.creator?.name || null,
      playing: roblox?.playing ?? 0,
      visits: roblox?.visits ?? 0,
      maxPlayers: roblox?.maxPlayers ?? null,
      updated: roblox?.updated || null,
      created: roblox?.created || null,
      thumbnailUrl: iconsByUniverse.get(game.universeId) || "",
      activeStaff: []
    };
  }).sort((a, b) => orderedPlaceIds.indexOf(a.placeId) - orderedPlaceIds.indexOf(b.placeId));
}

function updateStudioSessions(staffData) {
  const now = Date.now();
  const activeStudioUsers = new Set();

  for (const person of staffData) {
    if (person.presenceType === 3) {
      activeStudioUsers.add(person.userId);
      if (!studioSessions.has(person.userId)) {
        studioSessions.set(person.userId, now);
      }
    }
  }

  for (const userId of [...studioSessions.keys()]) {
    if (!activeStudioUsers.has(userId)) {
      studioSessions.delete(userId);
    }
  }
}

async function getStaffData() {
  const staff = await getTrackedStaff();
  const userIds = staff.map((person) => person.userId);
  const userIdBatches = chunk(userIds, robloxBatchSize);
  const [presenceBatches, thumbnailBatches, userBatches] = await Promise.all([
    Promise.all(userIdBatches.map((ids) => robloxJson("https://presence.roblox.com/v1/presence/users", {
      method: "POST",
      body: JSON.stringify({ userIds: ids })
    }))),
    Promise.all(userIdBatches.map((ids) => robloxJson(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids.join(",")}&size=180x180&format=Png&isCircular=true`))),
    Promise.all(userIdBatches.map((ids) => robloxJson("https://users.roblox.com/v1/users", {
      method: "POST",
      body: JSON.stringify({ userIds: ids, excludeBannedUsers: false })
    })))
  ]);

  const presenceByUser = new Map(presenceBatches.flatMap((batch) => (
    batch.userPresences || []
  )).map((presence) => [presence.userId, presence]));
  const thumbnailByUser = new Map(thumbnailBatches.flatMap((batch) => (
    batch.data || []
  )).map((thumb) => [thumb.targetId, thumb.imageUrl]));
  const userById = new Map(userBatches.flatMap((batch) => (
    batch.data || []
  )).map((user) => [user.id, user]));

  const hydratedStaff = staff.map((person) => {
    const presence = presenceByUser.get(person.userId) || {};
    const robloxUser = userById.get(person.userId) || {};

    return {
      ...person,
      robloxName: robloxUser.name || person.name,
      displayName: robloxUser.displayName || person.name,
      avatarUrl: thumbnailByUser.get(person.userId) || "",
      presenceType: presence.userPresenceType ?? 0,
      lastLocation: presence.lastLocation || "Offline",
      activePlaceId: presence.placeId || null,
      activeRootPlaceId: presence.rootPlaceId || null,
      activeUniverseId: presence.universeId || null
    };
  });

  updateStudioSessions(hydratedStaff);

  return hydratedStaff.map((person) => ({
    ...person,
    studioObservedStartedAt: studioSessions.get(person.userId) ? new Date(studioSessions.get(person.userId)).toISOString() : null
  }));
}

function findGameForPresence(person, gamesData) {
  if (person.activeUniverseId) {
    const universeMatch = gamesData.find((game) => game.universeId === person.activeUniverseId);
    if (universeMatch) return { game: universeMatch, source: "universe" };
  }

  if (person.activePlaceId || person.activeRootPlaceId) {
    const placeMatch = gamesData.find((game) => (
      game.placeId === person.activePlaceId || game.placeId === person.activeRootPlaceId
    ));
    if (placeMatch) return { game: placeMatch, source: "place" };
  }

  const locationName = normalizeName(person.lastLocation);
  if (locationName) {
    const nameMatch = gamesData.find((game) => (
      normalizeName(game.displayName) === locationName || normalizeName(game.robloxName) === locationName
    ));
    if (nameMatch) return { game: nameMatch, source: "location" };
  }

  return { game: null, source: null };
}

function attachStaffToGames(gamesData, staffData) {
  return gamesData.map((game) => {
    const activeStaff = staffData
      .filter((person) => person.presenceType === 2)
      .filter((person) => person.activeGamePlaceId === game.placeId)
      .map((person) => ({
        name: person.displayName || person.name,
        role: person.role,
        avatarUrl: person.avatarUrl,
        profileUrl: person.url
      }));

    return {
      ...game,
      activeStaff,
      timeline: gameTimelineByPlace.get(game.placeId) || []
    };
  });
}

function trimTimeline(placeId) {
  const timeline = gameTimelineByPlace.get(placeId) || [];
  if (timeline.length > 80) {
    gameTimelineByPlace.set(placeId, timeline.slice(timeline.length - 80));
  }
}

function updateGameTimelines(staffData) {
  const now = new Date().toISOString();
  const activeKeys = new Set();

  for (const person of staffData) {
    if (person.presenceType !== 2 || !person.activeGamePlaceId) {
      continue;
    }

    const sessionKey = `${person.userId}:${person.activeGamePlaceId}`;
    activeKeys.add(sessionKey);

    if (gameSessions.has(sessionKey)) {
      gameSessions.get(sessionKey).lastSeenAt = now;
      continue;
    }

    const entry = {
      userId: person.userId,
      placeId: person.activeGamePlaceId,
      name: person.displayName || person.name,
      role: person.role,
      avatarUrl: person.avatarUrl,
      profileUrl: person.url,
      startedAt: now,
      lastSeenAt: now,
      endedAt: null
    };

    gameSessions.set(sessionKey, entry);

    if (!gameTimelineByPlace.has(person.activeGamePlaceId)) {
      gameTimelineByPlace.set(person.activeGamePlaceId, []);
    }

    gameTimelineByPlace.get(person.activeGamePlaceId).push(entry);
    trimTimeline(person.activeGamePlaceId);
  }

  for (const [sessionKey, entry] of gameSessions.entries()) {
    if (!activeKeys.has(sessionKey)) {
      entry.endedAt = now;
      entry.lastSeenAt = now;
      gameSessions.delete(sessionKey);
    }
  }
}

function trimPersonTimeline(userId) {
  const timeline = personTimelineByUser.get(userId) || [];
  if (timeline.length > 120) {
    personTimelineByUser.set(userId, timeline.slice(timeline.length - 120));
  }
}

function updatePersonTimelines(staffData) {
  const now = new Date().toISOString();

  for (const person of staffData) {
    const stateKey = [
      person.presenceType,
      person.activeGamePlaceId || "",
      person.activeUniverseId || "",
      person.locationDetail || ""
    ].join(":");
    const activeSession = personPresenceSessions.get(person.userId);

    if (activeSession?.stateKey === stateKey) {
      activeSession.lastSeenAt = now;
      activeSession.detail = person.locationDetail;
      continue;
    }

    if (activeSession) {
      activeSession.endedAt = now;
      activeSession.lastSeenAt = now;
    }

    const entry = {
      userId: person.userId,
      label: presenceLabel(person.presenceType),
      detail: person.locationDetail,
      startedAt: now,
      lastSeenAt: now,
      endedAt: null,
      presenceType: person.presenceType,
      stateKey
    };

    personPresenceSessions.set(person.userId, entry);

    if (!personTimelineByUser.has(person.userId)) {
      personTimelineByUser.set(person.userId, []);
    }

    personTimelineByUser.get(person.userId).push(entry);
    trimPersonTimeline(person.userId);
  }
}

function attachGameNamesToStaff(staffData, gamesData) {
  return staffData.map((person) => {
    if (person.presenceType === 3) {
      return {
        ...person,
        activeGameName: null,
        activeGameUrl: null,
        activeGamePlaceId: null,
        activeGameMatchSource: null,
        locationDetail: "Roblox Studio - exact project hidden by Roblox",
        studioDurationLabel: person.studioObservedStartedAt
          ? "Observed in Studio since dashboard sync"
          : "Studio session just detected"
      };
    }

    if (person.presenceType !== 2) {
      return {
        ...person,
        activeGameName: null,
        activeGameUrl: null,
        activeGamePlaceId: null,
        activeGameMatchSource: null,
        studioDurationLabel: null,
        locationDetail: person.presenceType === 1 ? "Online on Roblox" : "Offline"
      };
    }

    const { game, source } = findGameForPresence(person, gamesData);

    return {
      ...person,
      activeGameName: game?.displayName || null,
      activeGameUrl: game?.url || null,
      activeGamePlaceId: game?.placeId || null,
      activeGameMatchSource: source,
      studioDurationLabel: null,
      locationDetail: game
        ? `Supporting ${game.displayName}`
        : "In a Roblox game - exact game hidden by Roblox"
    };
  });
}

function buildSections(staffData) {
  const sections = new Map();

  for (const person of staffData) {
    if (!sections.has(person.section)) {
      sections.set(person.section, {
        name: person.section,
        order: person.sectionOrder,
        people: []
      });
    }

    sections.get(person.section).people.push(person);
  }

  return [...sections.values()]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((section) => ({
      ...section,
      people: section.people.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name))
    }));
}

export async function buildDashboard({ tracker = "current" } = {}) {
  const trackerKey = trackedGameSets[tracker] ? tracker : "current";
  const trackedGames = trackedGameSets[trackerKey];
  const cache = caches.get(trackerKey);

  if (cache?.payload && Date.now() < cache.expiresAt) {
    return cache.payload;
  }

  const [rawGameData, rawStaffData] = await Promise.all([getGameData(trackedGames), getStaffData()]);
  let staffData = attachGameNamesToStaff(rawStaffData, rawGameData);
  updatePersonTimelines(staffData);
  staffData = staffData.map((person) => ({
    ...person,
    timeline: personTimelineByUser.get(person.userId) || []
  }));
  updateGameTimelines(staffData);
  const gameData = attachStaffToGames(rawGameData, staffData);
  const payload = {
    tracker: trackerKey,
    generatedAt: new Date().toISOString(),
    totalPlaying: gameData.reduce((sum, game) => sum + Number(game.playing || 0), 0),
    games: gameData,
    staff: staffData,
    sections: buildSections(staffData)
  };

  caches.set(trackerKey, { expiresAt: Date.now() + 30_000, payload });
  return payload;
}
