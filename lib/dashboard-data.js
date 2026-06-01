const staticGames = [
  { placeId: 13532792960, label: "S1 Testing", url: "https://www.roblox.com/games/13532792960/Dev-Testing" },
  { placeId: 13196289331, label: "S2 Testing", url: "https://www.roblox.com/games/13196289331/FRI-S2-Testing" },
  { placeId: 133470628457954, label: "Rewrite (Noxies Version)", url: "https://www.roblox.com/games/133470628457954/Rewirte" },
  { placeId: 94464403538690, label: "Private Servers", url: "https://www.roblox.com/games/94464403538690/Private-Servers" },
  { placeId: 14988246303, url: "https://www.roblox.com/games/14988246303/FRI-Test-Site-3" },
  { placeId: 91350978889564, url: "https://www.roblox.com/games/91350978889564/FRI-Future-Build" },
  { placeId: 72955595879933, url: "https://www.roblox.com/games/72955595879933/FRI-Matts-Cars" },
  { placeId: 132325494141617, url: "https://www.roblox.com/games/132325494141617/Alt-Walworth-Test" }
];

const extraGames = [
  { placeId: 13270316066, url: "https://www.roblox.com/games/13270316066/First-Response-Interactive-Vehicle-Testing" },
  { placeId: 132829000582274, url: "https://www.roblox.com/games/132829000582274/WALWORTH-SITE-67" },
  { placeId: 92873181221027, url: "https://www.roblox.com/games/92873181221027/BUILDING" },
  { placeId: 13488895113, url: "https://www.roblox.com/games/13488895113/Walworth-County" }
];

const trackedGroups = [
  { groupId: 32038636, name: "First Response Interactive QA Team" },
  { groupId: 12187674, name: "First Response Interactive" },
  { groupId: 865041055, name: "FRI Development Operations" }
];

const orderedPlaceIds = [...staticGames, ...extraGames].map((game) => game.placeId);

const staff = [
  { userId: 1534838663, name: "Noxarien", role: "Game Director", url: "https://www.roblox.com/users/1534838663/profile" },
  { userId: 1634477467, name: "Berks", role: "Game Creator", url: "https://www.roblox.com/users/1634477467/profile" },
  { userId: 1066269118, name: "Kyoto", role: "Manager", url: "https://www.roblox.com/users/1066269118/profile" },
  { userId: 553728148, name: "Darain", role: "Manager", url: "https://www.roblox.com/users/553728148/profile" },
  { userId: 1132319120, name: "Flash", role: "Developer", url: "https://www.roblox.com/users/1132319120/profile" },
  { userId: 982082574, name: "Matt", role: "Developer", url: "https://www.roblox.com/users/982082574/profile" },
  { userId: 1182441301, name: "Pizza", role: "Developer", url: "https://www.roblox.com/users/1182441301/profile" },
  { userId: 5810514920, name: "Infinate", role: "Developer", url: "https://www.roblox.com/users/5810514920/profile" },
  { userId: 672288263, name: "Decentclv", role: "Developer", url: "https://www.roblox.com/users/672288263/profile" },
  { userId: 2214498719, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/2214498719/profile" },
  { userId: 3488420529, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/3488420529/profile" },
  { userId: 6059684023, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/6059684023/profile" },
  { userId: 2001989572, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/2001989572/profile" },
  { userId: 1622836918, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/1622836918/profile" },
  { userId: 462244540, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/462244540/profile" },
  { userId: 1571357700, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/1571357700/profile" },
  { userId: 1638796352, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/1638796352/profile" },
  { userId: 3374628738, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/3374628738/profile" },
  { userId: 2261530653, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/2261530653/profile" },
  { userId: 9052640783, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/9052640783/profile" },
  { userId: 208541483, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/208541483/profile" },
  { userId: 930177859, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/930177859/profile" },
  { userId: 4660588589, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/4660588589/profile" },
  { userId: 3975107830, name: "QA Tester", role: "QA Tester", url: "https://www.roblox.com/users/3975107830/profile" }
];

let cache = { expiresAt: 0, payload: null };

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function robloxGameUrl(placeId, name = "") {
  const slug = String(name || "Roblox-Experience")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return `https://www.roblox.com/games/${placeId}/${slug}`;
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

async function getUniverseIds() {
  const games = [...staticGames, ...extraGames];
  const entries = await Promise.all(games.map(async (game) => {
    const data = await robloxJson(`https://apis.roblox.com/universes/v1/places/${game.placeId}/universe`);
    return [game.placeId, data.universeId];
  }));

  return new Map(entries);
}

async function getGroupGames() {
  const groupResults = await Promise.all(trackedGroups.map(async (group) => {
    const data = await robloxJson(`https://games.roblox.com/v2/groups/${group.groupId}/games?accessFilter=Public&limit=50&sortOrder=Asc`);

    return (data.data || []).map((game) => ({
      placeId: game.rootPlace?.id,
      universeId: game.id,
      url: robloxGameUrl(game.rootPlace?.id, game.name),
      groupName: group.name
    })).filter((game) => game.placeId && game.universeId);
  }));

  return groupResults.flat();
}

async function getTrackedGames() {
  const universeIdsByPlace = await getUniverseIds();
  const configuredGames = [...staticGames, ...extraGames].map((game) => ({
    ...game,
    universeId: universeIdsByPlace.get(game.placeId) || null
  }));
  const groupGames = await getGroupGames();
  const gamesByPlace = new Map();

  for (const game of groupGames) {
    gamesByPlace.set(game.placeId, game);
  }

  for (const game of configuredGames) {
    gamesByPlace.set(game.placeId, {
      ...gamesByPlace.get(game.placeId),
      ...game
    });
  }

  return [...gamesByPlace.values()];
}

async function getGameData() {
  const games = await getTrackedGames();
  const universeIds = games.map((game) => game.universeId).filter(Boolean);
  const [data, iconData] = await Promise.all([
    robloxJson(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`),
    robloxJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(",")}&size=512x512&format=Png&isCircular=false`)
  ]);
  const gamesByUniverse = new Map((data.data || []).map((game) => [game.id, game]));
  const iconsByUniverse = new Map((iconData.data || []).map((icon) => [icon.targetId, icon.imageUrl]));

  return games.map((game) => {
    const universeId = game.universeId;
    const roblox = gamesByUniverse.get(universeId);

    return {
      ...game,
      universeId,
      displayName: game.label || roblox?.name || "Unknown Roblox Experience",
      robloxName: roblox?.name || null,
      creator: roblox?.creator?.name || null,
      playing: roblox?.playing ?? 0,
      visits: roblox?.visits ?? 0,
      maxPlayers: roblox?.maxPlayers ?? null,
      updated: roblox?.updated || null,
      created: roblox?.created || null,
      groupName: game.groupName || roblox?.creator?.name || null,
      thumbnailUrl: iconsByUniverse.get(universeId) || ""
    };
  }).sort((a, b) => {
    const aOrder = orderedPlaceIds.indexOf(a.placeId);
    const bOrder = orderedPlaceIds.indexOf(b.placeId);
    const aRank = aOrder === -1 ? Number.MAX_SAFE_INTEGER : aOrder;
    const bRank = bOrder === -1 ? Number.MAX_SAFE_INTEGER : bOrder;

    return aRank - bRank || a.displayName.localeCompare(b.displayName);
  });
}

async function getStaffData() {
  const userIds = staff.map((person) => person.userId);
  const [presenceData, thumbnailData, userData] = await Promise.all([
    robloxJson("https://presence.roblox.com/v1/presence/users", {
      method: "POST",
      body: JSON.stringify({ userIds })
    }),
    robloxJson(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds.join(",")}&size=180x180&format=Png&isCircular=true`),
    robloxJson("https://users.roblox.com/v1/users", {
      method: "POST",
      body: JSON.stringify({ userIds, excludeBannedUsers: false })
    })
  ]);

  const presenceByUser = new Map((presenceData.userPresences || []).map((presence) => [presence.userId, presence]));
  const thumbnailByUser = new Map((thumbnailData.data || []).map((thumb) => [thumb.targetId, thumb.imageUrl]));
  const userById = new Map((userData.data || []).map((user) => [user.id, user]));

  return staff.map((person) => {
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
        name: person.name,
        role: person.role,
        avatarUrl: person.avatarUrl,
        profileUrl: person.url,
        matchSource: person.activeGameMatchSource
      }));

    return { ...game, activeStaff };
  });
}

function attachGameNamesToStaff(staffData, gamesData) {
  return staffData.map((person) => {
    if (person.presenceType !== 2) {
      return {
        ...person,
        activeGameName: null,
        activeGameUrl: null,
        activeGamePlaceId: null,
        activeGameMatchSource: null,
        locationDetail: person.presenceType === 3
          ? "Roblox Studio - exact project hidden by Roblox"
          : person.presenceType === 1
            ? "Online on Roblox"
            : "Offline"
      };
    }

    const { game, source } = findGameForPresence(person, gamesData);

    return {
      ...person,
      activeGameName: game?.displayName || null,
      activeGameUrl: game?.url || null,
      activeGamePlaceId: game?.placeId || null,
      activeGameMatchSource: source,
      locationDetail: game
        ? `Playing ${game.displayName}`
        : "In a Roblox game - exact game hidden by Roblox"
    };
  });
}

export async function buildDashboard() {
  if (cache.payload && Date.now() < cache.expiresAt) {
    return cache.payload;
  }

  const [rawGameData, rawStaffData] = await Promise.all([getGameData(), getStaffData()]);
  const staffData = attachGameNamesToStaff(rawStaffData, rawGameData);
  const gameData = attachStaffToGames(rawGameData, staffData);
  const payload = {
    generatedAt: new Date().toISOString(),
    totalPlaying: gameData.reduce((sum, game) => sum + Number(game.playing || 0), 0),
    games: gameData,
    staff: staffData
  };

  cache = { expiresAt: Date.now() + 30_000, payload };
  return payload;
}
