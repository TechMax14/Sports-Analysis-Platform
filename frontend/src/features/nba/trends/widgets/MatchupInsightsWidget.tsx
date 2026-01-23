import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  HStack,
  Select,
  Spinner,
  Stack,
  Tag,
  TagLabel,
  Text,
  VStack,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";

type DailyScheduleRow = {
  GAME_ID: number;
  GAME_DATE_EST: string;
  GAME_TIME_EST?: string | null;
  AWAY_TEAM: string;
  HOME_TEAM: string;
  MATCHUP: string;
  STATUS: string;
};

type WL = { w: number; l: number };

type InsightsSide = {
  team: string;
  roadRecord?: WL;
  homeRecord?: WL;
  last10: WL;
  streak: { type: "W" | "L" | null; len: number };
  restDays: number | null;
  b2b: boolean | null;
};

type MatchupInsights = {
  date: string;
  away: InsightsSide;
  home: InsightsSide;
  h2hLast10: { awayWins: number; homeWins: number; games: number };
};

function fmtWL(wl?: WL) {
  if (!wl) return "—";
  return `${wl.w}-${wl.l}`;
}

function fmtStreak(s: InsightsSide["streak"]) {
  if (!s?.type || !s?.len) return "—";
  return `${s.type}${s.len}`;
}

function fmtRest(restDays: number | null, b2b: boolean | null) {
  if (restDays == null) return "—";
  if (b2b) return "B2B";
  return `${restDays}d`;
}

// Small UI helper for “stat chips”
function StatTag({ label, value }: { label: string; value: string }) {
  return (
    <Tag
      size="sm"
      variant="subtle"
      bg="whiteAlpha.100"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="md"
    >
      <TagLabel color="whiteAlpha.900">
        <Text as="span" color="whiteAlpha.700" mr={1}>
          {label}:
        </Text>
        {value}
      </TagLabel>
    </Tag>
  );
}

export default function MatchupInsightsWidget() {
  const [dateStr, setDateStr] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const [matchups, setMatchups] = useState<DailyScheduleRow[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  const [insights, setInsights] = useState<MatchupInsights | null>(null);

  const [loadingMatchups, setLoadingMatchups] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const selectedMatchup = useMemo(() => {
    return matchups.find((m) => m.GAME_ID === selectedGameId) ?? null;
  }, [matchups, selectedGameId]);

  type TeamRow = {
    TEAM_ID: number;
    TEAM_NAME: string; // or "NAME" depending on your endpoint
    TEAM_ABBREVIATION: string;
  };

  const [teams, setTeams] = useState<TeamRow[]>([]);

  // Load daily matchups for dropdown
  useEffect(() => {
    let cancelled = false;

    async function loadMatchups() {
      try {
        setLoadingMatchups(true);
        const res = await apiClient.get<DailyScheduleRow[]>(
          "/nba/schedule/daily",
          {
            params: { date: dateStr },
          },
        );

        if (cancelled) return;

        const rows = res.data ?? [];
        setMatchups(rows);

        // default to first matchup if none selected
        if (rows.length > 0) {
          setSelectedGameId(rows[0].GAME_ID);
        } else {
          setSelectedGameId(null);
          setInsights(null);
        }
      } catch {
        if (!cancelled) {
          setMatchups([]);
          setSelectedGameId(null);
          setInsights(null);
        }
      } finally {
        if (!cancelled) setLoadingMatchups(false);
      }
    }

    loadMatchups();
    return () => {
      cancelled = true;
    };
  }, [dateStr]);

  // Load insights when matchup changes
  useEffect(() => {
    if (!selectedMatchup) return;

    let cancelled = false;

    async function loadInsights() {
      try {
        setLoadingInsights(true);
        const res = await apiClient.get<MatchupInsights>(
          "/nba/trends/matchup-insights",
          {
            params: {
              date: dateStr,
              away: selectedMatchup?.AWAY_TEAM,
              home: selectedMatchup?.HOME_TEAM,
            },
          },
        );

        if (cancelled) return;
        setInsights(res.data ?? null);
      } catch {
        if (!cancelled) setInsights(null);
      } finally {
        if (!cancelled) setLoadingInsights(false);
      }
    }

    loadInsights();
    return () => {
      cancelled = true;
    };
  }, [dateStr, selectedMatchup]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get<TeamRow[]>("/nba/teams");
        if (!cancelled) setTeams(res.data ?? []);
      } catch {
        if (!cancelled) setTeams([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const h2hLabel = useMemo(() => {
    const g = insights?.h2hLast10?.games ?? 0;
    if (!g) return "H2H";
    return g >= 10 ? "H2H (L10)" : `H2H (L${g})`;
  }, [insights]);

  const teamIdByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of teams) {
      m.set(t.TEAM_NAME, t.TEAM_ID);
    }
    return m;
  }, [teams]);

  function teamLogoUrl(teamName: string) {
    const id = teamIdByName.get(teamName);
    if (!id) return null;
    return `https://cdn.nba.com/logos/nba/${id}/global/L/logo.svg`;
  }

  const logos = useMemo(() => {
    if (!selectedMatchup) return { home: null, away: null };

    return {
      home: teamLogoUrl(selectedMatchup.HOME_TEAM),
      away: teamLogoUrl(selectedMatchup.AWAY_TEAM),
    };
  }, [selectedMatchup, teamIdByName]);

  return (
    <Box maxW="45%" w="100%">
      <Card bg="gray.800" borderRadius="xl" boxShadow="lg">
        <CardHeader pb={2}>
          <HStack justify="space-between" align="start" spacing={4}>
            <Box>
              <Text color="white" fontSize="lg" fontWeight="bold">
                Matchup Insights
              </Text>
              <Text color="whiteAlpha.700" fontSize="sm">
                Today’s situational splits & recent form
              </Text>
            </Box>

            <HStack spacing={2}>
              {/* optional: later you can add date picker; keeping simple for now */}
              <Box
                px={2}
                py={1}
                borderRadius="md"
                border="1px solid"
                borderColor="whiteAlpha.200"
                bg="whiteAlpha.50"
              >
                <Text fontSize="xs" color="whiteAlpha.800">
                  {dateStr}
                </Text>
              </Box>
            </HStack>
          </HStack>
        </CardHeader>

        <CardBody pt={3}>
          {/* Dropdown */}
          {loadingMatchups ? (
            <HStack py={6} justify="center">
              <Spinner />
              <Text color="whiteAlpha.800">Loading matchups…</Text>
            </HStack>
          ) : matchups.length === 0 ? (
            <Text color="whiteAlpha.800">No games found for {dateStr}.</Text>
          ) : (
            <Select
              value={selectedGameId ?? ""}
              onChange={(e) => setSelectedGameId(Number(e.target.value))}
              bg="gray.900"
              borderColor="whiteAlpha.200"
              color="white"
              mb={4}
            >
              {matchups.map((m) => (
                <option key={m.GAME_ID} value={m.GAME_ID}>
                  {m.MATCHUP} {m.GAME_TIME_EST ? `• ${m.GAME_TIME_EST}` : ""}
                </option>
              ))}
            </Select>
          )}

          {/* Insights */}
          <Box
            bg="gray.900"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            {loadingInsights ? (
              <HStack py={8} justify="center">
                <Spinner />
                <Text color="whiteAlpha.800">Loading insights…</Text>
              </HStack>
            ) : !insights || !selectedMatchup ? (
              <Text color="whiteAlpha.800">
                Select a matchup to view insights.
              </Text>
            ) : (
              <Stack spacing={4}>
                {/* Teams header */}
                <HStack justify="space-between">
                  {logos.home && (
                    <Box as="img" src={logos.home} w="22px" h="22px" />
                  )}
                  <Text color="white" fontWeight="bold">
                    {selectedMatchup.AWAY_TEAM} @ {selectedMatchup.HOME_TEAM}
                  </Text>
                  {logos.away && (
                    <Box as="img" src={logos.away} w="22px" h="22px" />
                  )}
                  <Tag
                    size="sm"
                    bg="whiteAlpha.100"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                  >
                    <TagLabel color="whiteAlpha.900">
                      {selectedMatchup.STATUS}
                    </TagLabel>
                  </Tag>
                </HStack>

                {/* Home section */}
                <Box>
                  <Text color="whiteAlpha.800" fontSize="sm" mb={2}>
                    {insights.home.team} (H)
                  </Text>
                  <HStack wrap="wrap" spacing={2}>
                    <StatTag
                      label="Home"
                      value={fmtWL(insights.home.homeRecord)}
                    />
                    <StatTag label="L10" value={fmtWL(insights.home.last10)} />
                    <StatTag
                      label="Streak"
                      value={fmtStreak(insights.home.streak)}
                    />
                    <StatTag
                      label="Rest"
                      value={fmtRest(insights.home.restDays, insights.home.b2b)}
                    />
                  </HStack>
                </Box>

                {/* Away section */}
                <Box>
                  <Text color="whiteAlpha.800" fontSize="sm" mb={2}>
                    {insights.away.team} (A)
                  </Text>
                  <HStack wrap="wrap" spacing={2}>
                    <StatTag
                      label="Road"
                      value={fmtWL(insights.away.roadRecord)}
                    />
                    <StatTag label="L10" value={fmtWL(insights.away.last10)} />
                    <StatTag
                      label="Streak"
                      value={fmtStreak(insights.away.streak)}
                    />
                    <StatTag
                      label="Rest"
                      value={fmtRest(insights.away.restDays, insights.away.b2b)}
                    />
                  </HStack>
                </Box>

                {/* H2H */}
                <Box>
                  <Text color="whiteAlpha.800" fontSize="sm" mb={2}>
                    {h2hLabel}
                  </Text>
                  <HStack wrap="wrap" spacing={2}>
                    <StatTag
                      label={insights.away.team}
                      value={`${insights.h2hLast10.awayWins}`}
                    />
                    <StatTag
                      label={insights.home.team}
                      value={`${insights.h2hLast10.homeWins}`}
                    />
                    <StatTag
                      label="Games"
                      value={`${insights.h2hLast10.games}`}
                    />
                  </HStack>
                </Box>
              </Stack>
            )}
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
}
