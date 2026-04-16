import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  SimpleGrid,
  Button,
  Input,
  Badge,
  HStack,
  VStack,
  Spinner,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";
import {
  getLocalISODate,
  addDaysISO,
  formatGameDateTimeET,
  formatDisplayDateNumeric,
} from "@/shared/utils/dates";
import { getMlbScoreboardLogoUrl } from "@/shared/utils/mlb-assets";

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

export default function MlbTodayTab() {
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => getLocalISODate());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/mlb/teams")
      .then((res) => setTeams(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/mlb/schedule/daily", { params: { date: selectedDate } })
      .then((res) => setGames(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("MLB daily schedule load failed:", err);
        setGames([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const teamAbbrById = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of teams) {
      if (t.TEAM_ABBREVIATION) map.set(Number(t.TEAM_ID), t.TEAM_ABBREVIATION);
    }
    return map;
  }, [teams]);

  return (
    <Box>
      <SimpleGrid
        columns={{ base: 1, md: 3 }}
        spacing={3}
        mb={4}
        alignItems="center"
      >
        <Button
          size="sm"
          onClick={() => setSelectedDate((d) => addDaysISO(d, -1))}
        >
          ‹ Prev
        </Button>

        {/* Date Box */}
        <Box position="relative">
          <Input
            size="sm"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            color="transparent"
            bg="gray.700"
            borderColor="whiteAlpha.300"
            position="relative"
            zIndex={1}
            sx={{
              "::-webkit-calendar-picker-indicator": {
                cursor: "pointer",
                opacity: 0,
                width: "100%",
                height: "100%",
              },
            }}
          />

          <Box
            pointerEvents="none"
            position="absolute"
            inset={0}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={4}
            zIndex={2}
          >
            <Box flex="1" textAlign="center">
              <Text fontSize="sm" fontWeight="medium" color="white">
                {formatDisplayDateNumeric(selectedDate)}
                {!loading && games.length > 0 && games[0].SERIES_DESCRIPTION
                  ? ` • ${games[0].SERIES_DESCRIPTION}`
                  : ""}
              </Text>
            </Box>

            <Text fontSize="sm" color="gray.300">
              📅
            </Text>
          </Box>
        </Box>

        <Button
          size="sm"
          onClick={() => setSelectedDate((d) => addDaysISO(d, 1))}
        >
          Next ›
        </Button>
      </SimpleGrid>

      {loading ? (
        <HStack>
          <Spinner />
          <Text color="gray.400">Loading games…</Text>
        </HStack>
      ) : games.length === 0 ? (
        <Text color="gray.400">No games found for this date.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {games.map((g) => {
            const awayAbbr =
              g.AWAY_TEAM_ABBREVIATION ||
              teamAbbrById.get(Number(g.AWAY_TEAM_ID)) ||
              "AWAY";

            const homeAbbr =
              g.HOME_TEAM_ABBREVIATION ||
              teamAbbrById.get(Number(g.HOME_TEAM_ID)) ||
              "HOME";

            return (
              <Box
                key={String(g.GAME_ID)}
                bg="gray.800"
                p={4}
                borderRadius="md"
                shadow="md"
                transition="all 0.15s ease"
                _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
              >
                <HStack spacing={3} mb={2} align="center">
                  <HStack spacing={2}>
                    <img
                      src={getMlbScoreboardLogoUrl(awayAbbr)}
                      alt={g.AWAY_TEAM_NAME}
                      style={{ width: 24, height: 24, objectFit: "contain" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                    <Text fontWeight="semibold">{g.AWAY_TEAM_NAME}</Text>
                  </HStack>

                  <Text fontWeight="bold">@</Text>

                  <HStack spacing={2}>
                    <img
                      src={getMlbScoreboardLogoUrl(homeAbbr)}
                      alt={g.HOME_TEAM_NAME}
                      style={{ width: 24, height: 24, objectFit: "contain" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                    <Text fontWeight="semibold">{g.HOME_TEAM_NAME}</Text>
                  </HStack>

                  <Box ml="auto">
                    <StatusBadge
                      status={g.STATUS}
                      detailedState={g.DETAILED_STATE}
                    />
                  </Box>
                </HStack>

                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color="gray.400">
                    {formatGameDateTimeET(g.GAME_DATE, g.GAME_DATETIME)}
                  </Text>

                  {g.VENUE ? (
                    <Text fontSize="sm" color="gray.400">
                      {g.VENUE}
                    </Text>
                  ) : null}

                  {isFinalStatus(g.STATUS, g.DETAILED_STATE) ? (
                    <VStack align="start" spacing={0}>
                      <Text
                        fontSize="xs"
                        color="gray.500"
                        textTransform="uppercase"
                      >
                        Final
                      </Text>
                      <Text fontSize="sm" fontWeight="bold" color="green.300">
                        {g.AWAY_SCORE ?? "-"} - {g.HOME_SCORE ?? "-"}
                      </Text>
                    </VStack>
                  ) : null}
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
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
