import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Spinner,
  Divider,
  Image,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Switch,
  Avatar,
  SimpleGrid,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";
import { useSearchParams } from "react-router-dom";

type GameStatus = "FINAL" | "UPCOMING" | "POSTPONED";

interface TeamRow {
  TEAM_ID: number;
  TEAM_NAME: string;
  TEAM_LOGO_URL?: string;
}

interface StandingRow {
  TeamID: number;
  TeamName: string;
  Conference: "East" | "West";
  Division: string;
  WINS: number;
  LOSSES: number;
  WinPCT: number;
}

interface Game {
  GAME_ID: number | string;
  GAME_DATE_EST: string; // YYYY-MM-DD
  GAME_TIME_EST?: string; // "7:30 PM"
  MATCHUP: string;
  STATUS: GameStatus;
  HOME_TEAM: string;
  AWAY_TEAM: string;
  HOME_PTS: number;
  AWAY_PTS: number;
}

interface RosterRow {
  TEAM_ID: number;
  TEAM_NAME: string;
  PLAYER_ID: number;
  PLAYER_NAME: string;
  JERSEY_NUMBER?: string | number;
  POSITION?: string;
  AGE?: number;
  HEIGHT?: string; // "6-7"
  WEIGHT?: string | number;
  EXP?: string | number;
  SCHOOL?: string;
  // Per-game stats (from LeagueDashPlayerStats)
  GP?: number;
  MIN?: number;
  PTS?: number;
  REB?: number;
  AST?: number;
  STL?: number;
  BLK?: number;
  TOV?: number;
  FG_PCT?: number;
  FG3_PCT?: number;
  FT_PCT?: number;
}

const DIV_ORDER = [
  "Atlantic",
  "Central",
  "Southeast",
  "Northwest",
  "Pacific",
  "Southwest",
];

type TeamJoined = TeamRow & {
  Conference?: "East" | "West";
  Division?: string;
  WINS?: number;
  LOSSES?: number;
  WinPCT?: number;
};

// Helpers
const headshotUrl = (playerId: number) =>
  `https://cdn.nba.com/headshots/nba/latest/260x190/${playerId}.png`;

export default function TeamsTab() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const [gamesLoading, setGamesLoading] = useState(false);
  const [games, setGames] = useState<Game[]>([]);

  const [rosterLoading, setRosterLoading] = useState(false);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(true);

  const [params, setParams] = useSearchParams();
  const teamIdParam = params.get("teamId");
  const parsed = teamIdParam ? Number(teamIdParam) : null;
  const teamIdFromUrl = Number.isFinite(parsed as number)
    ? (parsed as number)
    : null;

  // Load teams + standings (for division + record)
  useEffect(() => {
    setLoading(true);
    Promise.all([apiClient.get("/teams"), apiClient.get("/standings")])
      .then(([teamsRes, standingsRes]) => {
        setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
        setStandings(Array.isArray(standingsRes.data) ? standingsRes.data : []);
      })
      .catch((err) => {
        console.error("Failed to load teams/standings:", err);
        setTeams([]);
        setStandings([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Merge teams + standings by team name (simple and reliable)
  const joinedTeams: TeamJoined[] = useMemo(() => {
    const standingsById = new Map<number, StandingRow>(
      standings.map((r) => [Number(r.TeamID), r]),
    );

    return teams.map((t) => {
      const s = standingsById.get(Number(t.TEAM_ID));
      return {
        ...t,
        Conference: s?.Conference,
        Division: s?.Division,
        WINS: s?.WINS,
        LOSSES: s?.LOSSES,
        WinPCT: s?.WinPCT,
      };
    });
  }, [teams, standings]);

  // If no team selected, default to first team in list
  useEffect(() => {
    if (!teamIdFromUrl && !selectedTeamId && joinedTeams.length > 0) {
      const fallback = joinedTeams[0].TEAM_ID;
      setSelectedTeamId(fallback);
      setTeamInUrl(fallback);
    }
  }, [teamIdFromUrl, selectedTeamId, joinedTeams]);

  // Sync selectedTeamId with URL param if it changes
  useEffect(() => {
    if (teamIdFromUrl) {
      setSelectedTeamId(teamIdFromUrl);
    }
  }, [teamIdFromUrl]);

  // Group teams by Division (fallback to "Unknown")
  const teamsByDivision = useMemo(() => {
    const map = new Map<string, TeamJoined[]>();
    for (const t of joinedTeams) {
      const div = t.Division || "Unknown";
      if (!map.has(div)) map.set(div, []);
      map.get(div)!.push(t);
    }
    // sort teams within division by WinPCT desc (or name)
    for (const [div, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ap = a.WinPCT ?? -1;
        const bp = b.WinPCT ?? -1;
        if (bp !== ap) return bp - ap;
        return a.TEAM_NAME.localeCompare(b.TEAM_NAME);
      });
      map.set(div, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = DIV_ORDER.indexOf(a);
      const bi = DIV_ORDER.indexOf(b);

      // Known divisions come first, in NBA order
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;

      // Fallback (e.g. "Unknown")
      return a.localeCompare(b);
    });
  }, [joinedTeams]);

  const selectedTeam = useMemo(() => {
    if (!selectedTeamId) return null;
    return joinedTeams.find((t) => t.TEAM_ID === selectedTeamId) || null;
  }, [joinedTeams, selectedTeamId]);

  // Update URL when team changes
  const setTeamInUrl = (teamId: number) => {
    const next = new URLSearchParams(params);
    next.set("tab", "teams"); // keep tab stable
    next.set("teamId", String(teamId));
    setParams(next, { replace: true });
  };

  // Load roster whenever team changes
  useEffect(() => {
    if (!selectedTeamId) return;
    setRosterLoading(true);
    apiClient
      .get(`/teams/${selectedTeamId}/roster`)
      .then((res) => setRoster(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to load roster:", err);
        setRoster([]);
      })
      .finally(() => setRosterLoading(false));
  }, [selectedTeamId]);

  // Sort roster by PTS (descending)
  const sortedRoster = useMemo(() => {
    return roster.slice().sort((a, b) => (b.PTS ?? 0) - (a.PTS ?? 0));
  }, [roster]);

  // Compute team leaders (PTS, REB, AST)
  const leaders = useMemo(() => {
    if (!roster || roster.length === 0) return null;

    const bestBy = (key: "PTS" | "REB" | "AST") => {
      const filtered = roster.filter(
        (p) => typeof p[key] === "number" && !Number.isNaN(p[key] as number),
      );
      if (filtered.length === 0) return null;
      return filtered.reduce((best, cur) =>
        (cur[key] as number) > (best[key] as number) ? cur : best,
      );
    };

    return {
      pts: bestBy("PTS"),
      reb: bestBy("REB"),
      ast: bestBy("AST"),
    };
  }, [roster]);

  // Load games around today whenever team changes
  useEffect(() => {
    if (!selectedTeam) return;

    setGamesLoading(true);

    const start = shiftDays(todayISO(), -60);
    const end = shiftDays(todayISO(), 60);

    apiClient
      .get("/schedule/range", { params: { start, end } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        // Filter games where this team participated.
        // Your schedule uses short team names (e.g. "Celtics").
        // We match by checking if the matchup contains the short name at end.
        const short = shortNameFromFull(selectedTeam.TEAM_NAME);

        const teamGames = data.filter((g: Game) => {
          const h = (g.HOME_TEAM || "").toLowerCase();
          const a = (g.AWAY_TEAM || "").toLowerCase();
          return h === short.toLowerCase() || a === short.toLowerCase();
        });

        setGames(teamGames);
      })
      .catch((err) => {
        console.error("Failed to load team games:", err);
        setGames([]);
      })
      .finally(() => setGamesLoading(false));
  }, [selectedTeam]);

  const { last5, next5 } = useMemo(() => {
    const today = todayISO();
    const finals = games
      .filter((g) => g.STATUS === "FINAL" && g.GAME_DATE_EST <= today)
      .sort((a, b) => (a.GAME_DATE_EST < b.GAME_DATE_EST ? 1 : -1))
      .slice(0, 5);

    const upcoming = games
      .filter((g) => g.STATUS !== "FINAL" && g.GAME_DATE_EST >= today)
      .sort((a, b) => (a.GAME_DATE_EST > b.GAME_DATE_EST ? 1 : -1))
      .slice(0, 5);

    return { last5: finals, next5: upcoming };
  }, [games]);

  const teamAverages = useMemo(() => {
    if (!selectedTeam) return null;

    const short = shortNameFromFull(selectedTeam.TEAM_NAME).toLowerCase();

    const finals = games.filter(
      (g) => g.STATUS === "FINAL" && g.HOME_PTS != null && g.AWAY_PTS != null,
    );

    let scored = 0;
    let allowed = 0;
    let n = 0;

    for (const g of finals) {
      const home = (g.HOME_TEAM || "").toLowerCase();
      const away = (g.AWAY_TEAM || "").toLowerCase();

      if (home === short) {
        scored += Number(g.HOME_PTS);
        allowed += Number(g.AWAY_PTS);
        n += 1;
      } else if (away === short) {
        scored += Number(g.AWAY_PTS);
        allowed += Number(g.HOME_PTS);
        n += 1;
      }
    }

    if (n === 0) return { ppg: null, oppg: null };

    return {
      ppg: scored / n,
      oppg: allowed / n,
    };
  }, [games, selectedTeam]);

  if (loading) {
    return (
      <HStack>
        <Spinner />
        <Text color="gray.400">Loading teams…</Text>
      </HStack>
    );
  }

  return (
    <Flex gap={6} align="start" wrap="wrap">
      {/* Left panel: Division -> Teams */}
      <Box
        minW={{ base: "100%", lg: "320px" }}
        bg="gray.800"
        borderRadius="md"
        p={4}
        shadow="md"
      >
        <Text fontSize="lg" fontWeight="bold" mb={3}>
          Teams
        </Text>

        <Accordion
          allowMultiple
          defaultIndex={teamsByDivision.map((_, i) => i)}
        >
          {teamsByDivision.map(([div, list]) => (
            <AccordionItem key={div} border="none">
              <AccordionButton px={2}>
                <Box flex="1" textAlign="left" fontWeight="semibold">
                  {div}
                </Box>
                <AccordionIcon />
              </AccordionButton>

              <AccordionPanel px={2} pb={3}>
                <VStack align="stretch" spacing={1}>
                  {list.map((t) => (
                    <Button
                      key={t.TEAM_ID}
                      size="sm"
                      justifyContent="flex-start"
                      variant={t.TEAM_ID === selectedTeamId ? "solid" : "ghost"}
                      onClick={() => {
                        setSelectedTeamId(t.TEAM_ID);
                        setTeamInUrl(t.TEAM_ID);
                      }}
                    >
                      <HStack spacing={2}>
                        {t.TEAM_LOGO_URL ? (
                          <Image
                            src={t.TEAM_LOGO_URL}
                            alt={t.TEAM_NAME}
                            boxSize="18px"
                          />
                        ) : null}
                        <Text>{t.TEAM_NAME}</Text>
                      </HStack>
                    </Button>
                  ))}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </Box>

      {/* Main panel */}
      <Box flex="1" minW={{ base: "100%", lg: "600px" }}>
        {!selectedTeam ? (
          <Text color="gray.400">Select a team.</Text>
        ) : (
          <>
            {/* Team header */}
            <Box bg="gray.800" borderRadius="md" p={4} shadow="md" mb={4}>
              <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                <HStack spacing={3}>
                  {selectedTeam.TEAM_LOGO_URL ? (
                    <Image
                      src={selectedTeam.TEAM_LOGO_URL}
                      alt={selectedTeam.TEAM_NAME}
                      boxSize="44px"
                    />
                  ) : null}
                  <Box>
                    <Text fontSize="2xl" fontWeight="bold">
                      {selectedTeam.TEAM_NAME}
                    </Text>

                    <VStack align="start" spacing={1} color="gray.300">
                      {/* Row 1: record + badges */}
                      <HStack spacing={2} wrap="wrap">
                        {selectedTeam.WINS != null &&
                        selectedTeam.LOSSES != null ? (
                          <Text>
                            Record: {selectedTeam.WINS}-{selectedTeam.LOSSES} (
                            {formatWinPct(selectedTeam.WinPCT ?? 0)})
                          </Text>
                        ) : (
                          <Text>Record: —</Text>
                        )}

                        {selectedTeam.Conference ? (
                          <Badge colorScheme="teal">
                            {selectedTeam.Conference}
                          </Badge>
                        ) : null}

                        {selectedTeam.Division ? (
                          <Badge colorScheme="purple">
                            {selectedTeam.Division}
                          </Badge>
                        ) : null}
                      </HStack>

                      {/* Row 2: team averages */}
                      {teamAverages ? (
                        <HStack
                          spacing={6}
                          fontSize="sm"
                          color="gray.400"
                          wrap="wrap"
                        >
                          <Text>
                            <b>
                              {teamAverages.ppg != null
                                ? teamAverages.ppg.toFixed(1)
                                : "-"}
                            </b>{" "}
                            PPG
                          </Text>
                          <Text>
                            <b>
                              {teamAverages.oppg != null
                                ? teamAverages.oppg.toFixed(1)
                                : "-"}
                            </b>{" "}
                            Opp PPG
                          </Text>
                        </HStack>
                      ) : null}
                    </VStack>
                  </Box>
                </HStack>
              </Flex>
            </Box>

            {/* Last 5 / Next 5 */}
            <Flex gap={6} wrap="wrap" mb={4}>
              <Box
                flex="1"
                minW={{ base: "100%", md: "320px" }}
                bg="gray.800"
                borderRadius="md"
                p={4}
                shadow="md"
              >
                <Text fontSize="lg" fontWeight="bold" mb={2}>
                  Last 5 Games
                </Text>
                {gamesLoading ? (
                  <HStack>
                    <Spinner size="sm" />
                    <Text color="gray.400">Loading…</Text>
                  </HStack>
                ) : last5.length === 0 ? (
                  <Text color="gray.400">No recent finals found.</Text>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    {last5.map((g) => (
                      <GameLine key={String(g.GAME_ID)} game={g} />
                    ))}
                  </VStack>
                )}
              </Box>

              <Box
                flex="1"
                minW={{ base: "100%", md: "320px" }}
                bg="gray.800"
                borderRadius="md"
                p={4}
                shadow="md"
              >
                <Text fontSize="lg" fontWeight="bold" mb={2}>
                  Next 5 Games
                </Text>
                {gamesLoading ? (
                  <HStack>
                    <Spinner size="sm" />
                    <Text color="gray.400">Loading…</Text>
                  </HStack>
                ) : next5.length === 0 ? (
                  <Text color="gray.400">No upcoming games found.</Text>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    {next5.map((g) => (
                      <GameLine key={String(g.GAME_ID)} game={g} />
                    ))}
                  </VStack>
                )}
              </Box>
            </Flex>

            {/* Leaders placeholder */}
            <Box bg="gray.800" borderRadius="md" p={4} shadow="md">
              <Flex align="center" justify="space-between" mb={2}>
                <Text fontSize="lg" fontWeight="bold">
                  Team Leaders (PTS / REB / AST)
                </Text>
              </Flex>
              <Divider mb={3} />

              {!leaders || (!leaders.pts && !leaders.reb && !leaders.ast) ? (
                <Text color="gray.400">No leader data.</Text>
              ) : (
                <Flex justify="center">
                  <SimpleGrid
                    columns={{ base: 1, md: 3 }}
                    spacing={10}
                    w="75%"
                    justifyItems="center"
                  >
                    <LeaderBubble
                      label="Points"
                      player={leaders.pts}
                      value={leaders.pts?.PTS}
                      suffix="PPG"
                    />
                    <LeaderBubble
                      label="Rebounds"
                      player={leaders.reb}
                      value={leaders.reb?.REB}
                      suffix="RPG"
                    />
                    <LeaderBubble
                      label="Assists"
                      player={leaders.ast}
                      value={leaders.ast?.AST}
                      suffix="APG"
                    />
                  </SimpleGrid>
                </Flex>
              )}
            </Box>

            {/* Roster */}
            <Box bg="gray.800" borderRadius="md" p={4} shadow="md">
              <Flex align="center" justify="space-between" mb={2}>
                <Text fontSize="lg" fontWeight="bold">
                  Roster
                </Text>

                <HStack spacing={3}>
                  {rosterLoading && <Spinner size="sm" />}

                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.300">
                      Advanced
                    </Text>
                    <Switch
                      size="md"
                      colorScheme="teal"
                      isChecked={showAdvanced}
                      onChange={(e) => setShowAdvanced(e.target.checked)}
                    />
                  </HStack>
                </HStack>
              </Flex>
              <Divider mb={3} />

              {!rosterLoading && roster.length === 0 ? (
                <Text color="gray.400">No roster data.</Text>
              ) : (
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Player</Th>
                        <Th>#</Th>
                        <Th>Pos</Th>
                        <Th isNumeric>PPG</Th>
                        <Th isNumeric>RPG</Th>
                        <Th isNumeric>APG</Th>

                        {showAdvanced ? (
                          <>
                            <Th isNumeric>FG%</Th>
                            <Th isNumeric>3P%</Th>
                            <Th isNumeric>FT%</Th>
                            <Th isNumeric>TOV</Th>
                          </>
                        ) : (
                          <>
                            <Th isNumeric>Age</Th>
                            <Th>Ht</Th>
                            <Th>Exp</Th>
                            <Th>School</Th>
                          </>
                        )}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {sortedRoster.map((p) => (
                        <Tr key={p.PLAYER_ID}>
                          <Td fontWeight="semibold">{p.PLAYER_NAME}</Td>
                          <Td>{p.JERSEY_NUMBER ?? "-"}</Td>
                          <Td>{p.POSITION ?? "-"}</Td>

                          <Td isNumeric>{fmt1(p.PTS)}</Td>
                          <Td isNumeric>{fmt1(p.REB)}</Td>
                          <Td isNumeric>{fmt1(p.AST)}</Td>
                          {showAdvanced ? (
                            <>
                              <Td isNumeric>{fmtPct(p.FG_PCT)}</Td>
                              <Td isNumeric>{fmtPct(p.FG3_PCT)}</Td>
                              <Td isNumeric>{fmtPct(p.FT_PCT)}</Td>
                              <Td isNumeric>{fmt1(p.TOV)}</Td>
                            </>
                          ) : (
                            <>
                              <Td isNumeric>{p.AGE ?? "-"}</Td>
                              <Td>{p.HEIGHT ?? "-"}</Td>
                              <Td>{p.EXP ?? "-"}</Td>
                              <Td>{p.SCHOOL ?? "-"}</Td>
                            </>
                          )}
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Flex>
  );
}

function GameLine({ game }: { game: Game }) {
  const labelDate = formatShortDate(game.GAME_DATE_EST);
  const time = game.GAME_TIME_EST ? `${game.GAME_TIME_EST} ET` : "";

  const score =
    game.STATUS === "FINAL"
      ? `${game.AWAY_PTS} - ${game.HOME_PTS}`
      : game.STATUS === "POSTPONED"
        ? "Postponed"
        : "Upcoming";

  return (
    <Box bg="gray.900" borderRadius="md" p={3}>
      <Flex justify="space-between" align="start" gap={3}>
        <Box>
          <Text fontWeight="bold">{game.MATCHUP}</Text>
          <Text fontSize="sm" color="gray.400">
            {labelDate} {time ? `• ${time}` : ""}
          </Text>
          <Text
            fontSize="sm"
            color={game.STATUS === "FINAL" ? "green.300" : "gray.300"}
          >
            {game.STATUS === "FINAL" ? `Final: ${score}` : score}
          </Text>
        </Box>
        <Badge
          colorScheme={
            game.STATUS === "FINAL"
              ? "green"
              : game.STATUS === "POSTPONED"
                ? "red"
                : "yellow"
          }
        >
          {game.STATUS}
        </Badge>
      </Flex>
    </Box>
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function shiftDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWinPct(p: number) {
  return p.toFixed(3);
}

function fmt1(v: unknown) {
  if (v === null || v === undefined) return "-";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "-";
  return n.toFixed(1);
}

function fmtPct(v: unknown) {
  if (v === null || v === undefined) return "-";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "-";
  return `${(n * 100).toFixed(1)}%`;
}

// Convert "Boston Celtics" -> "Celtics" to match schedule HOME_TEAM/AWAY_TEAM
function shortNameFromFull(full: string) {
  const parts = full.split(" ");
  if (parts.length >= 2 && parts[parts.length - 1] === "Blazers") {
    return parts.slice(-2).join(" "); // "Trail Blazers"
  }
  return parts[parts.length - 1]; // "Celtics", "76ers", etc.
}

function LeaderBubble({
  label,
  player,
  value,
  suffix,
}: {
  label: string;
  player: any;
  value?: number;
  suffix: string;
}) {
  if (!player) return null;

  const url = player.PLAYER_ID ? headshotUrl(player.PLAYER_ID) : "";

  return (
    <VStack spacing={2} align="center">
      <Text fontSize="sm" color="gray.300" fontWeight="semibold">
        {label}
      </Text>

      <Box position="relative">
        <Avatar
          size="2xl"
          name={player.PLAYER_NAME}
          src={url}
          bg="gray.600"
          border="2px solid"
          borderColor="gray.700"
        />
        <Badge
          position="absolute"
          bottom="-6px"
          left="50%"
          transform="translateX(-50%)"
          px={3}
          py={1}
          borderRadius="full"
          bg="grey.600"
          color="white"
          fontWeight="bold"
          boxShadow="md"
          backdropFilter="blur(6px)"
        >
          {fmt1(value)} {suffix}
        </Badge>
      </Box>

      <Text fontSize="sm" color="gray.200" textAlign="center" noOfLines={2}>
        {player.PLAYER_NAME}
      </Text>
    </VStack>
  );
}
