import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  SimpleGrid,
  Button,
  Input,
  Badge,
  HStack,
  Image,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";

interface Game {
  GAME_ID: string;
  MATCHUP: string;
  GAME_TIME_EST: string;
  STATUS: "FINAL" | "UPCOMING" | "POSTPONED";
  HOME_TEAM: string;
  AWAY_TEAM: string;
  HOME_PTS: number;
  AWAY_PTS: number;
}

interface Team {
  TEAM_ID: number;
  TEAM_NAME: string;
  TEAM_ABBREVIATION: string;
}

const normalizeKey = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); // strips spaces/punct

const shortFromTeamName = (full: string) => {
  const name = (full || "").trim();
  if (!name) return "";
  if (name.endsWith("Trail Blazers")) return "Trail Blazers";
  const parts = name.split(" ");
  return parts[parts.length - 1]; // Celtics, Lakers, etc.
};

// helper to get team logo URL
const teamLogoUrl = (teamId: number) =>
  `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;

export default function TodayTab() {
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/teams")
      .then((res) => setTeams(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/schedule/daily", { params: { date: selectedDate } })
      .then((res) => {
        const data = res.data;
        setGames(Array.isArray(data) ? data : []);
        if (!Array.isArray(data)) console.error("Expected array, got:", data);
      })
      .catch((err) => {
        console.error("Schedule load failed:", err);
        setGames([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const teamIdByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of teams) {
      const short = shortFromTeamName(t.TEAM_NAME);
      map.set(normalizeKey(short), Number(t.TEAM_ID));
      map.set(normalizeKey(t.TEAM_ABBREVIATION), Number(t.TEAM_ID));
      map.set(normalizeKey(t.TEAM_NAME), Number(t.TEAM_ID));
    }
    return map;
  }, [teams]);

  const idForScheduleName = (name: string) =>
    teamIdByKey.get(normalizeKey(name));

  return (
    <Box>
      {/* date picker */}
      <SimpleGrid columns={3} spacing={2} mb={4}>
        <Button
          size="sm"
          onClick={() => setSelectedDate(prevDay(selectedDate))}
        >
          ‹ Prev
        </Button>
        <Input
          size="sm"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <Button
          size="sm"
          onClick={() => setSelectedDate(nextDay(selectedDate))}
        >
          Next ›
        </Button>
      </SimpleGrid>

      {loading ? (
        <Text color="gray.400">Loading…</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {games.map((g) => {
            const awayId = idForScheduleName(g.AWAY_TEAM);
            const homeId = idForScheduleName(g.HOME_TEAM);

            return (
              <Box
                key={g.GAME_ID}
                bg="gray.800"
                p={4}
                borderRadius="md"
                shadow="md"
              >
                <HStack spacing={3} mb={2}>
                  {awayId && (
                    <Image
                      src={teamLogoUrl(awayId)}
                      alt={g.AWAY_TEAM}
                      boxSize="28px"
                    />
                  )}

                  <Text fontWeight="bold" fontSize="lg">
                    {g.AWAY_TEAM} @ {g.HOME_TEAM}
                  </Text>

                  {homeId && (
                    <Image
                      src={teamLogoUrl(homeId)}
                      alt={g.HOME_TEAM}
                      boxSize="28px"
                    />
                  )}
                </HStack>

                <Text fontSize="sm" color="gray.400" mb={2}>
                  {g.GAME_TIME_EST} ET
                </Text>

                {g.STATUS === "UPCOMING" && (
                  <Badge colorScheme="yellow" fontSize="sm">
                    Upcoming
                  </Badge>
                )}
                {g.STATUS === "POSTPONED" && (
                  <Badge colorScheme="red" fontSize="sm">
                    Postponed
                  </Badge>
                )}
                {g.STATUS === "FINAL" && (
                  <Text fontSize="sm" color="green.300">
                    Final: {g.AWAY_PTS} - {g.HOME_PTS}
                  </Text>
                )}
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Box>
  );
}

// helpers
const prevDay = (d: string) =>
  new Date(new Date(d).getTime() - 864e5).toISOString().slice(0, 10);
const nextDay = (d: string) =>
  new Date(new Date(d).getTime() + 864e5).toISOString().slice(0, 10);
