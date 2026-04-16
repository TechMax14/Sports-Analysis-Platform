import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  SimpleGrid,
  Button,
  Badge,
  Flex,
  HStack,
  Spinner,
  Select,
  VStack,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";
import {
  getLocalISODate,
  addDaysISO,
  addMonthsISO,
  weekRangeMonSunISO,
  monthRangeISO,
  formatGameDateTimeET,
} from "@/shared/utils/dates";
import { getMlbScoreboardLogoUrl } from "@/shared/utils/mlb-assets";

type RangeMode = "WEEK" | "MONTH";

interface Game {
  GAME_ID: number | string;
  GAME_DATE: string;
  GAME_DATETIME?: string;
  GAME_TIME_DISPLAY?: string | null;
  STATUS: string;
  DETAILED_STATE?: string | null;
  SERIES_DESCRIPTION?: string | null;
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

interface Team {
  TEAM_ID: number;
  TEAM_NAME: string;
  TEAM_ABBREVIATION?: string;
}

export default function MlbScheduleTab() {
  const [mode, setMode] = useState<RangeMode>("WEEK");
  const [anchorDate, setAnchorDate] = useState(() => getLocalISODate());
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => {
    return mode === "WEEK"
      ? weekRangeMonSunISO(anchorDate)
      : monthRangeISO(anchorDate);
  }, [anchorDate, mode]);

  useEffect(() => {
    apiClient
      .get("/mlb/teams")
      .then((res) => setTeams(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to load MLB teams:", err);
        setTeams([]);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/mlb/schedule/range", { params: { start, end } })
      .then((res) => setGames(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to load MLB schedule range:", err);
        setGames([]);
      })
      .finally(() => setLoading(false));
  }, [start, end]);

  useEffect(() => {
    if (selectedTeamId !== "ALL") setAnchorDate(getLocalISODate());
  }, [selectedTeamId]);

  const selectedTeam = useMemo(() => {
    if (selectedTeamId === "ALL") return null;
    return (
      teams.find((t) => Number(t.TEAM_ID) === Number(selectedTeamId)) || null
    );
  }, [selectedTeamId, teams]);

  const filteredGames = useMemo(() => {
    if (!selectedTeam) return games;
    return games.filter(
      (g) =>
        Number(g.HOME_TEAM_ID) === Number(selectedTeam.TEAM_ID) ||
        Number(g.AWAY_TEAM_ID) === Number(selectedTeam.TEAM_ID),
    );
  }, [games, selectedTeam]);

  const grouped = useMemo(() => groupByDate(filteredGames), [filteredGames]);

  const sortedTeams = useMemo(
    () => teams.slice().sort((a, b) => a.TEAM_NAME.localeCompare(b.TEAM_NAME)),
    [teams],
  );

  const headerTitle = mode === "WEEK" ? "Weekly Schedule" : "Monthly Schedule";
  const prevLabel = mode === "WEEK" ? "‹ Prev Week" : "‹ Prev Month";
  const nextLabel = mode === "WEEK" ? "Next Week ›" : "Next Month ›";
  const thisLabel = mode === "WEEK" ? "This Week" : "This Month";

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={4} wrap="wrap" gap={3}>
        <Box>
          <Text fontSize="xl" fontWeight="bold">
            {headerTitle}
          </Text>
          <Text color="gray.400" fontSize="sm">
            {formatRangeLabel(start, end)}
          </Text>
        </Box>

        <Flex
          align="center"
          justify="space-between"
          wrap="wrap"
          gap={3}
          w="full"
        >
          <HStack spacing={3} wrap="wrap">
            <HStack spacing={2}>
              <Button
                size="sm"
                variant={mode === "WEEK" ? "solid" : "outline"}
                onClick={() => setMode("WEEK")}
              >
                Week
              </Button>
              <Button
                size="sm"
                variant={mode === "MONTH" ? "solid" : "outline"}
                onClick={() => setMode("MONTH")}
              >
                Month
              </Button>
            </HStack>

            <Select
              size="sm"
              w={{ base: "220px", md: "260px" }}
              value={selectedTeamId}
              onChange={(e) =>
                setSelectedTeamId(
                  e.target.value === "ALL" ? "ALL" : Number(e.target.value),
                )
              }
            >
              <option value="ALL">All Teams</option>
              {sortedTeams.map((t) => (
                <option key={t.TEAM_ID} value={t.TEAM_ID}>
                  {t.TEAM_NAME}
                </option>
              ))}
            </Select>
          </HStack>

          <HStack spacing={2} flexWrap="nowrap">
            <Button
              size="sm"
              onClick={() =>
                setAnchorDate((d) =>
                  mode === "WEEK" ? addDaysISO(d, -7) : addMonthsISO(d, -1),
                )
              }
            >
              {prevLabel}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAnchorDate(getLocalISODate())}
            >
              {thisLabel}
            </Button>
            <Button
              size="sm"
              onClick={() =>
                setAnchorDate((d) =>
                  mode === "WEEK" ? addDaysISO(d, 7) : addMonthsISO(d, 1),
                )
              }
            >
              {nextLabel}
            </Button>
          </HStack>
        </Flex>
      </Flex>

      {loading ? (
        <HStack>
          <Spinner />
          <Text color="gray.400">Loading schedule…</Text>
        </HStack>
      ) : filteredGames.length === 0 ? (
        <Text color="gray.400">
          No games found for this {mode === "WEEK" ? "week" : "month"}
          {selectedTeam ? ` for ${selectedTeam.TEAM_NAME}` : ""}.
        </Text>
      ) : (
        <Box>
          {Object.entries(grouped).map(([dateStr, dayGames]) => (
            <Box key={dateStr} mb={6}>
              <HStack spacing={2} mb={2} align="center">
                <Text fontSize="lg" fontWeight="bold">
                  {formatDayHeader(dateStr)}
                </Text>
                <Badge
                  bg="whiteAlpha.100"
                  color="gray.300"
                  fontSize="0.8rem"
                  px={2.5}
                  py={0.75}
                  borderRadius="md"
                  textTransform="none"
                >
                  {dayGames[0]?.SERIES_DESCRIPTION || "Regular Season"}
                </Badge>
              </HStack>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {dayGames.map((g) => (
                  <GameCard key={String(g.GAME_ID)} game={g} />
                ))}
              </SimpleGrid>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function GameCard({ game }: { game: Game }) {
  const awayAbbr = game.AWAY_TEAM_ABBREVIATION || "AWAY";
  const homeAbbr = game.HOME_TEAM_ABBREVIATION || "HOME";
  const isFinal = isFinalStatus(game.STATUS, game.DETAILED_STATE);

  return (
    <Box
      bg="gray.800"
      p={4}
      borderRadius="md"
      shadow="md"
      transition="all 0.15s ease"
      _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
    >
      <Flex align="start" justify="space-between" gap={3}>
        <Box w="full">
          <HStack spacing={3} mb={2} align="center">
            <HStack spacing={2} align="center">
              <img
                src={getMlbScoreboardLogoUrl(awayAbbr)}
                alt={game.AWAY_TEAM_NAME}
                style={{ width: 24, height: 24, objectFit: "contain" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <Text fontWeight="semibold">{game.AWAY_TEAM_NAME}</Text>
            </HStack>

            <Text fontWeight="bold">@</Text>

            <HStack spacing={2} align="center">
              <img
                src={getMlbScoreboardLogoUrl(homeAbbr)}
                alt={game.HOME_TEAM_NAME}
                style={{ width: 24, height: 24, objectFit: "contain" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <Text fontWeight="semibold">{game.HOME_TEAM_NAME}</Text>
            </HStack>

            <Box ml="auto">
              <StatusBadge
                status={game.STATUS}
                detailedState={game.DETAILED_STATE}
              />
            </Box>
          </HStack>

          <VStack align="start" spacing={1.5}>
            <Text fontSize="sm" color="gray.400">
              {formatGameDateTimeET(game.GAME_DATE, game.GAME_DATETIME)}
            </Text>

            {game.VENUE && (
              <Text fontSize="sm" color="gray.400">
                {game.VENUE}
              </Text>
            )}

            {isFinal ? (
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                  Final
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="green.300">
                  {game.AWAY_SCORE ?? "-"} - {game.HOME_SCORE ?? "-"}
                </Text>
              </VStack>
            ) : null}
          </VStack>
        </Box>
      </Flex>
    </Box>
  );
}

function isFinalStatus(status?: string | null, detailedState?: string | null) {
  const s = (status || "").toLowerCase();
  const d = (detailedState || "").toLowerCase();
  return s.includes("final") || d.includes("final");
}

function StatusBadge({
  status,
  detailedState,
}: {
  status?: string | null;
  detailedState?: string | null;
}) {
  const value = detailedState || status || "Scheduled";
  const lower = value.toLowerCase();

  if (lower.includes("final")) {
    return <Badge colorScheme="green">{value}</Badge>;
  }
  if (lower.includes("postpon")) {
    return <Badge colorScheme="red">{value}</Badge>;
  }
  if (lower.includes("live") || lower.includes("progress")) {
    return <Badge colorScheme="orange">{value}</Badge>;
  }
  return <Badge colorScheme="yellow">{value}</Badge>;
}

function groupByDate(games: Game[]) {
  const sorted = [...games].sort((a, b) => {
    if (a.GAME_DATE < b.GAME_DATE) return -1;
    if (a.GAME_DATE > b.GAME_DATE) return 1;
    return String(a.GAME_ID).localeCompare(String(b.GAME_ID));
  });

  const map: Record<string, Game[]> = {};
  for (const g of sorted) {
    const key = g.GAME_DATE;
    if (!map[key]) map[key] = [];
    map[key].push(g);
  }
  return map;
}

function formatDayHeader(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatRangeLabel(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sLabel = s.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const eLabel = e.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${sLabel} – ${eLabel}`;
}
