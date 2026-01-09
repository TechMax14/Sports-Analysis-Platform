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
} from "@chakra-ui/react";
import apiClient from "../../services/api-client";

type GameStatus = "FINAL" | "UPCOMING" | "POSTPONED";

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

export default function ScheduleTab() {
  // Week anchored on any date within that week
  const [anchorDate, setAnchorDate] = useState(() => todayISO());
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => {
    const d = new Date(anchorDate + "T00:00:00");
    return weekRangeMonSun(d);
  }, [anchorDate]);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/schedule/range", { params: { start, end } })
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

  const grouped = useMemo(() => groupByDate(games), [games]);

  return (
    <Box>
      {/* Header controls */}
      <Flex align="center" justify="space-between" mb={4} wrap="wrap" gap={3}>
        <Box>
          <Text fontSize="xl" fontWeight="bold">
            Weekly Schedule
          </Text>
          <Text color="gray.400" fontSize="sm">
            {formatRangeLabel(start, end)}
          </Text>
        </Box>

        <HStack spacing={2}>
          <Button
            size="sm"
            onClick={() => setAnchorDate(shiftDays(anchorDate, -7))}
          >
            ‹ Prev Week
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAnchorDate(todayISO())}
          >
            This Week
          </Button>
          <Button
            size="sm"
            onClick={() => setAnchorDate(shiftDays(anchorDate, 7))}
          >
            Next Week ›
          </Button>
        </HStack>
      </Flex>

      {loading ? (
        <HStack>
          <Spinner />
          <Text color="gray.400">Loading schedule…</Text>
        </HStack>
      ) : games.length === 0 ? (
        <Text color="gray.400">No games found for this week.</Text>
      ) : (
        <Box>
          {Object.entries(grouped).map(([dateStr, dayGames]) => (
            <Box key={dateStr} mb={6}>
              <Text fontSize="lg" fontWeight="bold" mb={2}>
                {formatDayHeader(dateStr)}
              </Text>

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
  return (
    <Box bg="gray.800" p={4} borderRadius="md" shadow="md">
      <Flex align="start" justify="space-between" gap={3}>
        <Box>
          <Text fontWeight="bold" fontSize="lg" mb={1}>
            {game.MATCHUP}
          </Text>
          <Text fontSize="sm" color="gray.400" mb={2}>
            {game.GAME_TIME_EST} ET
          </Text>
          {game.STATUS === "FINAL" ? (
            <Text fontSize="sm" color="green.300">
              Final: {game.AWAY_PTS} - {game.HOME_PTS}
            </Text>
          ) : (
            <Text fontSize="sm" color="gray.300">
              {game.STATUS === "POSTPONED" ? "Game postponed" : "Upcoming"}
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
  // Ensure stable order: date asc then game id
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
