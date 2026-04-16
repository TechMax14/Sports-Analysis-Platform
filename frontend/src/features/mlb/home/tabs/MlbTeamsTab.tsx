import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Spinner,
  Divider,
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
  SimpleGrid,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";
import { useSearchParams } from "react-router-dom";
import { getLocalISODate, addDaysISO } from "@/shared/utils/dates";
import {
  getMlbHeadshotUrl,
  getMlbScoreboardLogoUrl,
  getMlbTeamLogoUrl,
} from "@/shared/utils/mlb-assets";

interface TeamRow {
  TEAM_ID: number;
  TEAM_NAME: string;
  TEAM_ABBREVIATION?: string;
  LEAGUE_NAME?: string;
  DIVISION_NAME?: string;
  VENUE_NAME?: string;
}

interface StandingRow {
  TEAM_ID: number;
  TEAM_NAME: string;
  TEAM_ABBREVIATION?: string;
  LEAGUE: string;
  DIVISION: string;
  W: number;
  L: number;
  PCT: number | string;
  RS?: number | string | null;
  RA?: number | string | null;
  RUN_DIFF?: number | string | null;
}

interface Game {
  GAME_ID: number | string;
  GAME_DATE: string;
  GAME_DATETIME?: string;
  GAME_TIME_DISPLAY?: string | null;
  STATUS: string;
  DETAILED_STATE?: string | null;
  VENUE?: string | null;
  AWAY_TEAM_ID: number;
  AWAY_TEAM_NAME: string;
  AWAY_TEAM_ABBREVIATION?: string | null;
  AWAY_SCORE?: number | null;
  HOME_TEAM_ID: number;
  HOME_TEAM_NAME: string;
  HOME_TEAM_ABBREVIATION?: string | null;
  HOME_SCORE?: number | null;
}

interface RosterRow {
  TEAM_ID: number;
  TEAM_NAME: string;
  PLAYER_ID: number;
  PLAYER_NAME: string;
  JERSEY_NUMBER?: string | number;
  POSITION?: string;
  POSITION_TYPE?: string;
  POSITION_GROUP?: string;
  BATS?: string;
  THROWS?: string;
  AGE?: number;
  HEIGHT?: string;
  WEIGHT?: number | string;
  G_HIT?: number;
  AB?: number;
  R?: number;
  H?: number;
  SB?: number;
  AVG?: number | string;
  HR?: number;
  RBI?: number;
  OPS?: number | string;
  OBP?: number | string;
  SLG?: number | string;
  G_PIT?: number;
  GS?: number;
  IP?: number | string;
  W?: number;
  L?: number;
  ERA?: number | string;
  WHIP?: number | string;
  SO?: number;
  BB_ALLOWED?: number;
  SV?: number;
}

type TeamJoined = TeamRow & {
  DIVISION?: string;
  LEAGUE?: string;
  W?: number;
  L?: number;
  PCT?: number | string;
  RS?: number | string | null;
  RA?: number | string | null;
  RUN_DIFF?: number | string | null;
};

export default function MlbTeamsTab() {
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

  useEffect(() => {
    setLoading(true);
    Promise.all([apiClient.get("/mlb/teams"), apiClient.get("/mlb/standings")])
      .then(([teamsRes, standingsRes]) => {
        setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
        setStandings(Array.isArray(standingsRes.data) ? standingsRes.data : []);
      })
      .catch((err) => {
        console.error("Failed to load MLB teams/standings:", err);
        setTeams([]);
        setStandings([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const joinedTeams: TeamJoined[] = useMemo(() => {
    const standingsById = new Map<number, StandingRow>(
      standings.map((r) => [Number(r.TEAM_ID), r]),
    );
    return teams.map((t) => {
      const s = standingsById.get(Number(t.TEAM_ID));
      return {
        ...t,
        DIVISION: s?.DIVISION || t.DIVISION_NAME,
        LEAGUE: s?.LEAGUE || t.LEAGUE_NAME,
        W: s?.W,
        L: s?.L,
        PCT: s?.PCT,
        RS: s?.RS,
        RA: s?.RA,
        RUN_DIFF: s?.RUN_DIFF,
      };
    });
  }, [teams, standings]);

  const teamById = useMemo(() => {
    const map = new Map<number, TeamJoined>();
    for (const t of joinedTeams) map.set(Number(t.TEAM_ID), t);
    return map;
  }, [joinedTeams]);

  useEffect(() => {
    if (!teamIdFromUrl && !selectedTeamId && joinedTeams.length > 0) {
      const fallback = joinedTeams[0].TEAM_ID;
      setSelectedTeamId(fallback);
      setTeamInUrl(fallback);
    }
  }, [teamIdFromUrl, selectedTeamId, joinedTeams]);

  useEffect(() => {
    if (teamIdFromUrl) setSelectedTeamId(teamIdFromUrl);
  }, [teamIdFromUrl]);

  const teamsByDivision = useMemo(() => {
    const map = new Map<string, TeamJoined[]>();
    for (const t of joinedTeams) {
      const div = t.DIVISION || "Unknown";
      if (!map.has(div)) map.set(div, []);
      map.get(div)!.push(t);
    }
    for (const [div, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ap = Number(a.PCT ?? -1);
        const bp = Number(b.PCT ?? -1);
        if (bp !== ap) return bp - ap;
        return a.TEAM_NAME.localeCompare(b.TEAM_NAME);
      });
      map.set(div, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [joinedTeams]);

  const selectedTeam = useMemo(() => {
    if (!selectedTeamId) return null;
    return (
      joinedTeams.find((t) => Number(t.TEAM_ID) === Number(selectedTeamId)) ||
      null
    );
  }, [joinedTeams, selectedTeamId]);

  const setTeamInUrl = (teamId: number) => {
    const next = new URLSearchParams(params);
    next.set("tab", "teams");
    next.set("teamId", String(teamId));
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (!selectedTeamId) return;
    setRosterLoading(true);
    apiClient
      .get(`/mlb/teams/${selectedTeamId}/roster`)
      .then((res) => setRoster(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to load MLB roster:", err);
        setRoster([]);
      })
      .finally(() => setRosterLoading(false));
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedTeam) return;
    setGamesLoading(true);

    const today = getLocalISODate();
    const start = addDaysISO(today, -60);
    const end = addDaysISO(today, 60);

    apiClient
      .get("/mlb/schedule/range", { params: { start, end } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const teamGames = data.filter(
          (g: Game) =>
            Number(g.HOME_TEAM_ID) === Number(selectedTeam.TEAM_ID) ||
            Number(g.AWAY_TEAM_ID) === Number(selectedTeam.TEAM_ID),
        );
        setGames(teamGames);
      })
      .catch((err) => {
        console.error("Failed to load MLB team games:", err);
        setGames([]);
      })
      .finally(() => setGamesLoading(false));
  }, [selectedTeam]);

  const { last5, next5 } = useMemo(() => {
    const today = getLocalISODate();

    const finals = games
      .filter(
        (g) =>
          isFinalStatus(g.STATUS, g.DETAILED_STATE) && g.GAME_DATE <= today,
      )
      .sort((a, b) => (a.GAME_DATE < b.GAME_DATE ? 1 : -1))
      .slice(0, 5);

    const upcoming = games
      .filter(
        (g) =>
          !isFinalStatus(g.STATUS, g.DETAILED_STATE) && g.GAME_DATE >= today,
      )
      .sort((a, b) => (a.GAME_DATE > b.GAME_DATE ? 1 : -1))
      .slice(0, 5);

    return { last5: finals, next5: upcoming };
  }, [games]);

  const leaders = useMemo(() => {
    if (!roster.length) return null;

    const hitters = roster.filter(
      (p) => p.POSITION_GROUP === "Hitter" || p.POSITION_GROUP === "Two-Way",
    );
    const pitchers = roster.filter(
      (p) => p.POSITION_GROUP === "Pitcher" || p.POSITION_GROUP === "Two-Way",
    );

    const bestByNumeric = (rows: RosterRow[], key: keyof RosterRow) => {
      const filtered = rows.filter((p) => {
        const n = Number(p[key]);
        return !Number.isNaN(n);
      });
      if (!filtered.length) return null;
      return filtered.reduce((best, cur) =>
        Number(cur[key]) > Number(best[key]) ? cur : best,
      );
    };

    return {
      hr: bestByNumeric(hitters, "HR"),
      rbi: bestByNumeric(hitters, "RBI"),
      ops: bestByNumeric(hitters, "OPS"),
      so: bestByNumeric(pitchers, "SO"),
      sv: bestByNumeric(pitchers, "SV"),
      era:
        pitchers
          .filter((p) => !Number.isNaN(Number(p.ERA)))
          .sort((a, b) => Number(a.ERA) - Number(b.ERA))[0] || null,
    };
  }, [roster]);

  const sortedRoster = useMemo(() => {
    return roster.slice().sort((a, b) => {
      const aGroup = a.POSITION_GROUP || "";
      const bGroup = b.POSITION_GROUP || "";
      if (aGroup !== bGroup) return aGroup.localeCompare(bGroup);
      return a.PLAYER_NAME.localeCompare(b.PLAYER_NAME);
    });
  }, [roster]);

  const hitterRoster = useMemo(() => {
    return roster
      .filter(
        (p) => p.POSITION_GROUP === "Hitter" || p.POSITION_GROUP === "Two-Way",
      )
      .sort((a, b) => a.PLAYER_NAME.localeCompare(b.PLAYER_NAME));
  }, [roster]);

  const pitcherRoster = useMemo(() => {
    return roster
      .filter(
        (p) => p.POSITION_GROUP === "Pitcher" || p.POSITION_GROUP === "Two-Way",
      )
      .sort((a, b) => a.PLAYER_NAME.localeCompare(b.PLAYER_NAME));
  }, [roster]);

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
                        {t.TEAM_ABBREVIATION ? (
                          <img
                            src={getMlbScoreboardLogoUrl(t.TEAM_ABBREVIATION)}
                            alt={t.TEAM_NAME}
                            style={{
                              width: 18,
                              height: 18,
                              objectFit: "contain",
                            }}
                            onError={(e) => {
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
                            }}
                          />
                        ) : null}
                        {t.TEAM_ABBREVIATION ? (
                          <Badge>{t.TEAM_ABBREVIATION}</Badge>
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

      <Box flex="1" minW={{ base: "100%", lg: "600px" }}>
        {!selectedTeam ? (
          <Text color="gray.400">Select a team.</Text>
        ) : (
          <>
            <Box bg="gray.800" borderRadius="md" p={4} shadow="md" mb={4}>
              <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                <HStack spacing={4} align="center">
                  {selectedTeam.TEAM_ABBREVIATION ? (
                    <img
                      src={getMlbTeamLogoUrl(selectedTeam.TEAM_ABBREVIATION)}
                      alt={selectedTeam.TEAM_NAME}
                      style={{ width: 48, height: 48, objectFit: "contain" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : null}

                  <Box>
                    <HStack spacing={2} mb={1} wrap="wrap">
                      <Text fontSize="2xl" fontWeight="bold">
                        {selectedTeam.TEAM_NAME}
                      </Text>
                      {selectedTeam.TEAM_ABBREVIATION ? (
                        <Badge colorScheme="teal" fontSize="md" px={3} py={1}>
                          {selectedTeam.TEAM_ABBREVIATION}
                        </Badge>
                      ) : null}
                    </HStack>

                    <VStack align="start" spacing={1} color="gray.300">
                      <HStack spacing={2} wrap="wrap">
                        {selectedTeam.W != null && selectedTeam.L != null ? (
                          <Text>
                            Record: {selectedTeam.W}-{selectedTeam.L} (
                            {formatPct(selectedTeam.PCT)})
                          </Text>
                        ) : (
                          <Text>Record: —</Text>
                        )}

                        {selectedTeam.LEAGUE ? (
                          <Badge colorScheme="teal">
                            {selectedTeam.LEAGUE}
                          </Badge>
                        ) : null}
                        {selectedTeam.DIVISION ? (
                          <Badge colorScheme="purple">
                            {selectedTeam.DIVISION}
                          </Badge>
                        ) : null}
                      </HStack>

                      <HStack
                        spacing={6}
                        fontSize="sm"
                        color="gray.400"
                        wrap="wrap"
                      >
                        <Text>
                          <b>{selectedTeam.RS ?? "-"}</b> RS
                        </Text>
                        <Text>
                          <b>{selectedTeam.RA ?? "-"}</b> RA
                        </Text>
                        <Text>
                          <b>{selectedTeam.RUN_DIFF ?? "-"}</b> Run Diff
                        </Text>
                        <Text>{selectedTeam.VENUE_NAME || "—"}</Text>
                      </HStack>
                    </VStack>
                  </Box>
                </HStack>
              </Flex>
            </Box>

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
                      <GameLine
                        key={String(g.GAME_ID)}
                        game={g}
                        teamById={teamById}
                        selectedTeamId={selectedTeam.TEAM_ID}
                        showTeamResult
                      />
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
                      <GameLine
                        key={String(g.GAME_ID)}
                        game={g}
                        teamById={teamById}
                        selectedTeamId={selectedTeam.TEAM_ID}
                        showTeamResult={false}
                      />
                    ))}
                  </VStack>
                )}
              </Box>
            </Flex>

            <Box bg="gray.800" borderRadius="md" p={4} shadow="md" mb={4}>
              <Text fontSize="lg" fontWeight="bold" mb={2}>
                Team Leaders
              </Text>
              <Divider mb={3} />

              {!leaders ? (
                <Text color="gray.400">No leader data.</Text>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
                  <LeaderBox
                    label="HR"
                    player={leaders.hr}
                    value={leaders.hr?.HR}
                  />
                  <LeaderBox
                    label="RBI"
                    player={leaders.rbi}
                    value={leaders.rbi?.RBI}
                  />
                  <LeaderBox
                    label="OPS"
                    player={leaders.ops}
                    value={leaders.ops?.OPS}
                  />
                  <LeaderBox
                    label="SO"
                    player={leaders.so}
                    value={leaders.so?.SO}
                  />
                  <LeaderBox
                    label="SV"
                    player={leaders.sv}
                    value={leaders.sv?.SV}
                  />
                  <LeaderBox
                    label="ERA"
                    player={leaders.era}
                    value={leaders.era?.ERA}
                    lowIsGood
                  />
                </SimpleGrid>
              )}
            </Box>

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

              <Divider mb={4} />

              {!rosterLoading && roster.length === 0 ? (
                <Text color="gray.400">No roster data.</Text>
              ) : (
                <VStack align="stretch" spacing={6}>
                  <RosterTable
                    title="Hitters"
                    players={hitterRoster}
                    showAdvanced={showAdvanced}
                    statMode="hitters"
                  />

                  <RosterTable
                    title="Pitchers"
                    players={pitcherRoster}
                    showAdvanced={showAdvanced}
                    statMode="pitchers"
                  />
                </VStack>
              )}
            </Box>
          </>
        )}
      </Box>
    </Flex>
  );
}

function RosterTable({
  title,
  players,
  showAdvanced,
  statMode,
}: {
  title: string;
  players: RosterRow[];
  showAdvanced: boolean;
  statMode: "hitters" | "pitchers";
}) {
  return (
    <Box>
      <Text fontSize="md" fontWeight="bold" mb={2}>
        {title}
      </Text>

      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Player</Th>
              <Th>#</Th>
              <Th>Pos</Th>
              <Th>Type</Th>

              {!showAdvanced ? (
                <>
                  <Th isNumeric>Age</Th>
                  <Th>Ht</Th>
                  <Th isNumeric>Wt</Th>
                  <Th>B/T</Th>
                </>
              ) : statMode === "hitters" ? (
                <>
                  <Th isNumeric>G</Th>
                  <Th isNumeric>AB</Th>
                  <Th isNumeric>R</Th>
                  <Th isNumeric>H</Th>
                  <Th isNumeric>HR</Th>
                  <Th isNumeric>RBI</Th>
                  <Th isNumeric>SB</Th>
                  <Th isNumeric>AVG</Th>
                  <Th isNumeric>OBP</Th>
                  <Th isNumeric>SLG</Th>
                  <Th isNumeric>OPS</Th>
                </>
              ) : (
                <>
                  <Th isNumeric>G</Th>
                  <Th isNumeric>GS</Th>
                  <Th isNumeric>IP</Th>
                  <Th isNumeric>W</Th>
                  <Th isNumeric>L</Th>
                  <Th isNumeric>SV</Th>
                  <Th isNumeric>ERA</Th>
                  <Th isNumeric>WHIP</Th>
                  <Th isNumeric>SO</Th>
                  <Th isNumeric>BB</Th>
                </>
              )}
            </Tr>
          </Thead>

          <Tbody>
            {players.map((p) => (
              <Tr key={`${title}-${p.PLAYER_ID}`}>
                <Td fontWeight="semibold">
                  <HStack spacing={2}>
                    <img
                      src={getMlbHeadshotUrl(p.PLAYER_ID, 120)}
                      alt={p.PLAYER_NAME}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                    <Text>{p.PLAYER_NAME}</Text>
                  </HStack>
                </Td>

                <Td>{p.JERSEY_NUMBER ?? "-"}</Td>
                <Td>{p.POSITION ?? "-"}</Td>
                <Td>{p.POSITION_GROUP ?? p.POSITION_TYPE ?? "-"}</Td>

                {!showAdvanced ? (
                  <>
                    <Td isNumeric>{p.AGE ?? "-"}</Td>
                    <Td>{p.HEIGHT ?? "-"}</Td>
                    <Td isNumeric>{p.WEIGHT ?? "-"}</Td>
                    <Td>
                      {p.BATS || "-"}/{p.THROWS || "-"}
                    </Td>
                  </>
                ) : statMode === "hitters" ? (
                  <>
                    <Td isNumeric>{fmt0(p.G_HIT)}</Td>
                    <Td isNumeric>{fmt0(p.AB)}</Td>
                    <Td isNumeric>{fmt0(p.R)}</Td>
                    <Td isNumeric>{fmt0(p.H)}</Td>
                    <Td isNumeric>{fmt0(p.HR)}</Td>
                    <Td isNumeric>{fmt0(p.RBI)}</Td>
                    <Td isNumeric>{fmt0(p.SB)}</Td>
                    <Td isNumeric>{fmt3(p.AVG)}</Td>
                    <Td isNumeric>{fmt3(p.OBP)}</Td>
                    <Td isNumeric>{fmt3(p.SLG)}</Td>
                    <Td isNumeric>{fmt3(p.OPS)}</Td>
                  </>
                ) : (
                  <>
                    <Td isNumeric>{fmt0(p.G_PIT)}</Td>
                    <Td isNumeric>{fmt0(p.GS)}</Td>
                    <Td isNumeric>{fmtIP(p.IP)}</Td>
                    <Td isNumeric>{fmt0(p.W)}</Td>
                    <Td isNumeric>{fmt0(p.L)}</Td>
                    <Td isNumeric>{fmt0(p.SV)}</Td>
                    <Td isNumeric>{fmt2(p.ERA)}</Td>
                    <Td isNumeric>{fmt2(p.WHIP)}</Td>
                    <Td isNumeric>{fmt0(p.SO)}</Td>
                    <Td isNumeric>{fmt0(p.BB_ALLOWED)}</Td>
                  </>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

function GameLine({
  game,
  teamById,
  selectedTeamId,
  showTeamResult,
}: {
  game: Game;
  teamById: Map<number, TeamJoined>;
  selectedTeamId: number;
  showTeamResult: boolean;
}) {
  const awayTeam = teamById.get(Number(game.AWAY_TEAM_ID));
  const homeTeam = teamById.get(Number(game.HOME_TEAM_ID));

  const awayAbbr =
    game.AWAY_TEAM_ABBREVIATION || awayTeam?.TEAM_ABBREVIATION || "";
  const homeAbbr =
    game.HOME_TEAM_ABBREVIATION || homeTeam?.TEAM_ABBREVIATION || "";

  const isFinal = isFinalStatus(game.STATUS, game.DETAILED_STATE);

  const selectedTeamIsHome =
    Number(game.HOME_TEAM_ID) === Number(selectedTeamId);
  const selectedTeamIsAway =
    Number(game.AWAY_TEAM_ID) === Number(selectedTeamId);

  let teamResult: "WIN" | "LOSS" | null = null;

  if (isFinal && game.HOME_SCORE != null && game.AWAY_SCORE != null) {
    if (selectedTeamIsHome) {
      teamResult = game.HOME_SCORE > game.AWAY_SCORE ? "WIN" : "LOSS";
    } else if (selectedTeamIsAway) {
      teamResult = game.AWAY_SCORE > game.HOME_SCORE ? "WIN" : "LOSS";
    }
  }

  const score =
    game.AWAY_SCORE != null && game.HOME_SCORE != null
      ? `${game.AWAY_SCORE} - ${game.HOME_SCORE}`
      : "- -";

  const statusText =
    showTeamResult && teamResult
      ? teamResult
      : game.DETAILED_STATE || game.STATUS || "Scheduled";

  const badgeColor =
    showTeamResult && teamResult
      ? teamResult === "WIN"
        ? "green"
        : "red"
      : (game.DETAILED_STATE || game.STATUS || "")
            .toLowerCase()
            .includes("postpon")
        ? "red"
        : (game.DETAILED_STATE || game.STATUS || "")
              .toLowerCase()
              .includes("live")
          ? "orange"
          : isFinal
            ? "green"
            : "yellow";

  return (
    <Box bg="gray.900" borderRadius="md" p={3}>
      <Flex justify="space-between" align="start" gap={3}>
        <Box>
          <HStack spacing={2} mb={1} wrap="wrap">
            {awayAbbr && (
              <img
                src={getMlbScoreboardLogoUrl(awayAbbr)}
                alt={game.AWAY_TEAM_NAME}
                style={{ width: 18, height: 18 }}
              />
            )}
            <Text fontWeight="bold">{game.AWAY_TEAM_NAME}</Text>

            <Text color="gray.300">@</Text>

            {homeAbbr && (
              <img
                src={getMlbScoreboardLogoUrl(homeAbbr)}
                alt={game.HOME_TEAM_NAME}
                style={{ width: 18, height: 18 }}
              />
            )}
            <Text fontWeight="bold">{game.HOME_TEAM_NAME}</Text>
          </HStack>

          <Text fontSize="sm" color="gray.400">
            {formatGameDateTimeTeamView(game)}
            {game.VENUE ? ` • ${game.VENUE}` : ""}
          </Text>

          {isFinal ? (
            <Text fontSize="sm" color="green.300">
              Final: {score}
            </Text>
          ) : (
            <Text fontSize="sm" color="gray.300">
              {game.DETAILED_STATE || game.STATUS}
            </Text>
          )}
        </Box>

        <Badge colorScheme={badgeColor}>{statusText}</Badge>
      </Flex>
    </Box>
  );
}

function LeaderBox({
  label,
  player,
  value,
  lowIsGood = false,
}: {
  label: string;
  player: RosterRow | null | undefined;
  value: unknown;
  lowIsGood?: boolean;
}) {
  if (!player) return <Text color="gray.400">No data.</Text>;

  return (
    <Box bg="gray.900" borderRadius="md" p={3}>
      <HStack spacing={3} align="center">
        <img
          src={getMlbHeadshotUrl(player.PLAYER_ID, 120)}
          alt={player.PLAYER_NAME}
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            objectFit: "cover",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        <Box>
          <Text fontSize="sm" color="gray.400" mb={1}>
            {label}
          </Text>
          <Text fontWeight="bold">{player.PLAYER_NAME}</Text>
          <Text color="teal.300" fontWeight="semibold">
            {lowIsGood ? fmt2(value) : formatLeaderValue(value)}
          </Text>
        </Box>
      </HStack>
    </Box>
  );
}

function isFinalStatus(status?: string | null, detailedState?: string | null) {
  const s = (status || "").toLowerCase();
  const d = (detailedState || "").toLowerCase();
  return s.includes("final") || d.includes("final");
}

function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatPct(v: unknown) {
  const n = Number(v);
  return Number.isNaN(n) ? "-" : n.toFixed(3);
}

function formatLeaderValue(v: unknown) {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  if (n < 1 && n > 0) return n.toFixed(3);
  return String(Math.round(n * 1000) / 1000);
}

function fmt0(v: unknown) {
  const n = Number(v);
  return Number.isNaN(n) ? "-" : String(Math.round(n));
}

function fmt2(v: unknown) {
  const n = Number(v);
  return Number.isNaN(n) ? "-" : n.toFixed(2);
}

function fmt3(v: unknown) {
  const n = Number(v);
  return Number.isNaN(n) ? "-" : n.toFixed(3);
}

function formatGameDateTimeTeamView(game: Game) {
  if (game.GAME_DATETIME) {
    const d = new Date(game.GAME_DATETIME);
    return (
      d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/New_York",
      }) + " ET"
    );
  }

  return formatShortDate(game.GAME_DATE);
}

function fmtIP(v: unknown) {
  if (v == null || v === "") return "-";
  return String(v);
}
