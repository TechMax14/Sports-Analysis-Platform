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
  Image,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";

type GameStatus = "FINAL" | "UPCOMING" | "POSTPONED";
type RangeMode = "WEEK" | "MONTH";

interface Game {
  GAME_ID: number | string;
  GAME_DATE_EST: string; // "YYYY-MM-DD"
  GAME_TIME_EST: string; // "HH:MM AM/PM"
  MATCHUP: string;
  STATUS: GameStatus;
  HOME_PTS: number;
  AWAY_PTS: number;
  HOME_TEAM: string;
  AWAY_TEAM: string;
}
interface Team {
  TEAM_ID: number;
  TEAM_NAME: string;
  TEAM_SHORT_NAME: string;
  TEAM_ABBREVIATION: string;
}

const teamLogoUrl = (teamId: number) =>
  `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;

const normalizeKey = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const shortFromTeamName = (full: string) => {
  const name = (full || "").trim();
  if (!name) return "";
  if (name.endsWith("Trail Blazers")) return "Trail Blazers";
  const parts = name.split(" ");
  return parts[parts.length - 1];
};

export default function ScheduleTab() {
  const [mode, setMode] = useState<RangeMode>("WEEK");

  // Anchor date drives which week/month we're viewing
  const [anchorDate, setAnchorDate] = useState(() => todayISO());
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => {
    const d = new Date(anchorDate + "T00:00:00");
    return mode === "WEEK" ? weekRangeMonSun(d) : monthRange(d);
  }, [anchorDate, mode]);

  useEffect(() => {
    apiClient
      .get("/nba/teams")
      .then((res) => {
        const data = res.data;
        setTeams(Array.isArray(data) ? data : []);
        if (!Array.isArray(data))
          console.error("Expected array from /teams, got:", data);
      })
      .catch((err) => {
        console.error("Failed to load teams:", err);
        setTeams([]);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/nba/schedule/range", { params: { start, end } })
      .then((res) => {
        const data = res.data;
        setGames(Array.isArray(data) ? data : []);
        if (!Array.isArray(data)) {
          console.error("Expected array from /schedule/range, got:", data);
        }
      })
      .catch((err) => {
        console.error("Failed to load schedule range:", err);
        setGames([]);
      })
      .finally(() => setLoading(false));
  }, [start, end]);

  // Reset to "current period" when a team is selected (keeps UX snappy)
  useEffect(() => {
    if (selectedTeamId !== "ALL") {
      setAnchorDate(todayISO()); // works for both week/month (range calc will update based on mode)
    }
  }, [selectedTeamId]);

  const selectedTeam = useMemo(() => {
    if (selectedTeamId === "ALL") return null;
    return teams.find((t) => t.TEAM_ID === selectedTeamId) || null;
  }, [selectedTeamId, teams]);

  const filteredGames = useMemo(() => {
    if (!selectedTeam) return games;
    const short = selectedTeam.TEAM_SHORT_NAME?.toLowerCase();
    if (!short) return games;

    return games.filter((g) => {
      const home = (g.HOME_TEAM || "").toLowerCase();
      const away = (g.AWAY_TEAM || "").toLowerCase();
      return home === short || away === short;
    });
  }, [games, selectedTeam]);

  const grouped = useMemo(() => groupByDate(filteredGames), [filteredGames]);

  const sortedTeams = useMemo(
    () => teams.slice().sort((a, b) => a.TEAM_NAME.localeCompare(b.TEAM_NAME)),
    [teams],
  );

  const teamIdByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of teams) {
      const short = shortFromTeamName(t.TEAM_NAME);
      map.set(normalizeKey(short), Number(t.TEAM_ID));
      if (t.TEAM_ABBREVIATION)
        map.set(normalizeKey(t.TEAM_ABBREVIATION), Number(t.TEAM_ID));
      map.set(normalizeKey(t.TEAM_NAME), Number(t.TEAM_ID));
    }
    return map;
  }, [teams]);

  const idForScheduleName = (name: string) =>
    teamIdByKey.get(normalizeKey(name));

  const headerTitle = mode === "WEEK" ? "Weekly Schedule" : "Monthly Schedule";
  const prevLabel = mode === "WEEK" ? "‹ Prev Week" : "‹ Prev Month";
  const nextLabel = mode === "WEEK" ? "Next Week ›" : "Next Month ›";
  const thisLabel = mode === "WEEK" ? "This Week" : "This Month";

  const goPrev = () => {
    setAnchorDate(
      mode === "WEEK" ? shiftDays(anchorDate, -7) : shiftMonths(anchorDate, -1),
    );
  };

  const goNext = () => {
    setAnchorDate(
      mode === "WEEK" ? shiftDays(anchorDate, 7) : shiftMonths(anchorDate, 1),
    );
  };

  const goThis = () => setAnchorDate(todayISO());

  return (
    <Box>
      {/* Header controls */}
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
          {/* Left controls: mode + team */}
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

          {/* Right controls: nav buttons always together */}
          <HStack spacing={2} flexWrap="nowrap">
            <Button size="sm" onClick={goPrev}>
              {prevLabel}
            </Button>
            <Button size="sm" variant="outline" onClick={goThis}>
              {thisLabel}
            </Button>
            <Button size="sm" onClick={goNext}>
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
              <Text fontSize="lg" fontWeight="bold" mb={2}>
                {formatDayHeader(dateStr)}
              </Text>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {dayGames.map((g) => (
                  <GameCard
                    key={String(g.GAME_ID)}
                    game={g}
                    getTeamId={idForScheduleName}
                  />
                ))}
              </SimpleGrid>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function GameCard({
  game,
  getTeamId,
}: {
  game: Game;
  getTeamId: (name: string) => number | undefined;
}) {
  const awayId = getTeamId(game.AWAY_TEAM);
  const homeId = getTeamId(game.HOME_TEAM);

  return (
    <Box bg="gray.800" p={4} borderRadius="md" shadow="md">
      <Flex align="start" justify="space-between" gap={3}>
        <Box>
          <HStack spacing={3} mb={1}>
            {awayId ? (
              <Image
                src={teamLogoUrl(awayId)}
                alt={game.AWAY_TEAM}
                boxSize="28px"
              />
            ) : null}

            <Text fontWeight="bold" fontSize="lg">
              {game.AWAY_TEAM} @ {game.HOME_TEAM}
            </Text>

            {homeId ? (
              <Image
                src={teamLogoUrl(homeId)}
                alt={game.HOME_TEAM}
                boxSize="28px"
              />
            ) : null}
          </HStack>

          <Text fontSize="sm" color="gray.400" mb={2}>
            {game.GAME_TIME_EST} ET
          </Text>

          {game.STATUS === "FINAL" ? (
            <Text fontSize="sm" color="green.300">
              Final: {game.AWAY_PTS} - {game.HOME_PTS}
            </Text>
          ) : (
            <Text fontSize="sm" color="gray.300">
              {game.STATUS === "POSTPONED" ? "Postponed" : "Upcoming"}
            </Text>
          )}
        </Box>

        <StatusBadge status={game.STATUS} />
      </Flex>
    </Box>
  );
}

function StatusBadge({ status }: { status: GameStatus }) {
  if (status === "FINAL") {
    return (
      <Badge fontSize="sm" colorScheme="green">
        Final
      </Badge>
    );
  }
  if (status === "POSTPONED") {
    return (
      <Badge fontSize="sm" colorScheme="red">
        Postponed
      </Badge>
    );
  }
  return (
    <Badge fontSize="sm" colorScheme="yellow">
      Upcoming
    </Badge>
  );
}

/** Helpers **/

function groupByDate(games: Game[]) {
  const sorted = [...games].sort((a, b) => {
    if (a.GAME_DATE_EST < b.GAME_DATE_EST) return -1;
    if (a.GAME_DATE_EST > b.GAME_DATE_EST) return 1;
    return String(a.GAME_ID).localeCompare(String(b.GAME_ID));
  });

  const map: Record<string, Game[]> = {};
  for (const g of sorted) {
    const key = g.GAME_DATE_EST;
    if (!map[key]) map[key] = [];
    map[key].push(g);
  }
  return map;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function shiftMonths(iso: string, months: number) {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  d.setDate(1); // stable month navigation
  return d.toISOString().slice(0, 10);
}

/**
 * Returns week range Monday-Sunday for the given date (local time).
 * Output is ISO date strings: YYYY-MM-DD.
 */
function weekRangeMonSun(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun .. 6=Sat
  const diffToMonday = (day === 0 ? -6 : 1) - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

/**
 * Returns month range (1st -> last day) for the given date (local time).
 * Output is ISO date strings: YYYY-MM-DD.
 */
function monthRange(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0); // last day of month
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
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
