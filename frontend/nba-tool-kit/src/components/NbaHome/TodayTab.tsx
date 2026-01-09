import { useEffect, useState } from "react";
import { Box, Text, SimpleGrid, Button, Input, Badge } from "@chakra-ui/react";
import apiClient from "../../services/api-client";

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

export default function TodayTab() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(true);

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

  if (loading) return <Text color="gray.400">Loading…</Text>;
  if (games.length === 0)
    return <Text color="gray.400">No games on {selectedDate}.</Text>;

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

      {/* games */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {games.map((g) => (
          <Box
            key={g.GAME_ID}
            bg="gray.800"
            p={4}
            borderRadius="md"
            shadow="md"
          >
            <Text fontWeight="bold" fontSize="lg" mb={2}>
              {g.MATCHUP}
            </Text>
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
        ))}
      </SimpleGrid>
    </Box>
  );
}

// helpers
const prevDay = (d: string) =>
  new Date(new Date(d).getTime() - 864e5).toISOString().slice(0, 10);
const nextDay = (d: string) =>
  new Date(new Date(d).getTime() + 864e5).toISOString().slice(0, 10);
