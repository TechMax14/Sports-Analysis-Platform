import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  GridItem,
  HStack,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";

type StatKey = "PTS" | "REB" | "AST" | "FG3M" | "BLK" | "STL";
type TeamWindowKey = "5" | "10" | "20" | "season";

type TeamApiRow = {
  TEAM_ID?: number | string | null;
  TEAM_NAME?: string | null;
  TEAM_SHORT_NAME?: string | null;
};

type TeamOption = {
  teamId: number;
  teamName: string;
  teamShortName: string;
};

type LeaderResult = {
  stat: StatKey;
  playerId: number;
  playerName: string;
  teamId?: number | null;
  teamAbbr: string;
  threshold: number;
  streak: number;
  hitRate: string;
  avg: number;
  isActive: boolean;
  lastGameDate?: string | null;
};

type TeamTableRow = {
  playerId: number;
  playerName: string;
  teamAbbr: string;
  avg: number;
  threshold: number;
  hitCount: number;
  totalGames: number;
  currentStreak: number;
  recentPattern: boolean[];
  isActive: boolean;
  lastGameDate?: string | null;
};

type HotStreaksPayload = {
  categoryLeaders: LeaderResult[];
  teamRows: TeamTableRow[];
  meta?: {
    stat?: string;
    threshold?: number;
    teamWindow?: string;
    teamId?: number;
    teamName?: string;
    teamAbbr?: string;
    includeInactive?: boolean;
    inactiveDays?: number;
  };
};

const THRESHOLDS: Record<StatKey, number[]> = {
  PTS: [5, 10, 15, 20, 25, 30, 35],
  REB: [4, 6, 8, 10, 12],
  AST: [2, 4, 6, 8, 10],
  FG3M: [1, 2, 3, 4, 5],
  BLK: [1, 2, 3, 4],
  STL: [1, 2, 3, 4],
};

const STAT_LABELS: Record<StatKey, string> = {
  PTS: "Points",
  REB: "Rebounds",
  AST: "Assists",
  FG3M: "3PM",
  BLK: "Blocks",
  STL: "Steals",
};

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function HitPattern({
  pattern,
  windowType,
}: {
  pattern: boolean[];
  windowType: TeamWindowKey;
}) {
  const dotSize =
    windowType === "5"
      ? "9px"
      : windowType === "10"
        ? "9px"
        : windowType === "20"
          ? "8px"
          : "6px";

  const spacing =
    windowType === "5"
      ? 2
      : windowType === "10"
        ? 2
        : windowType === "20"
          ? 1.5
          : 1;

  return (
    <HStack spacing={spacing} wrap="nowrap">
      {pattern.map((hit, idx) => (
        <Box
          key={idx}
          w={dotSize}
          h={dotSize}
          borderRadius="full"
          flexShrink={0}
          bg={hit ? "green.300" : "whiteAlpha.300"}
        />
      ))}
    </HStack>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) return null;
  return (
    <Text ml={1} color="red.400" fontWeight="bold" fontSize="xs">
      O
    </Text>
  );
}

function LeaderCard({ leader }: { leader: LeaderResult }) {
  return (
    <Card
      bg="gray.900"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
    >
      <CardBody>
        <Stack spacing={2}>
          <HStack justify="space-between">
            <Text
              color="whiteAlpha.800"
              fontSize="xs"
              textTransform="uppercase"
            >
              {STAT_LABELS[leader.stat]}
            </Text>
            <Badge colorScheme="green" variant="subtle">
              {leader.streak} straight
            </Badge>
          </HStack>

          <Box>
            <HStack spacing={1} align="center">
              <Text color="white" fontWeight="bold" noOfLines={1}>
                {leader.playerName}
              </Text>
              <StatusBadge isActive={leader.isActive} />
            </HStack>
            <Text color="whiteAlpha.700" fontSize="sm">
              {leader.teamAbbr} • Avg {leader.avg.toFixed(1)}
            </Text>
          </Box>

          <Text color="teal.200" fontWeight="semibold">
            {leader.threshold}+ {STAT_LABELS[leader.stat]}
          </Text>
          <Text color="whiteAlpha.800" fontSize="sm">
            Hit rate: {leader.hitRate}
          </Text>
        </Stack>
      </CardBody>
    </Card>
  );
}

export default function HotStreakStatTrackerWidget() {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const [stat, setStat] = useState<StatKey>("PTS");
  const [threshold, setThreshold] = useState<number>(20);
  const [teamWindow, setTeamWindow] = useState<TeamWindowKey>("10");

  const [leaders, setLeaders] = useState<LeaderResult[]>([]);
  const [teamRows, setTeamRows] = useState<TeamTableRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      try {
        const res = await apiClient.get<TeamApiRow[]>("/nba/teams");
        if (cancelled) return;

        const nextTeams = (res.data ?? [])
          .map((t) => ({
            teamId: toNum(t.TEAM_ID),
            teamName: String(t.TEAM_NAME ?? t.TEAM_SHORT_NAME ?? ""),
            teamShortName: String(t.TEAM_SHORT_NAME ?? ""),
          }))
          .filter((t) => t.teamId > 0 && t.teamName);

        setTeams(nextTeams);

        if (nextTeams.length > 0) {
          setSelectedTeamId((current) => current ?? nextTeams[0].teamId);
        }
      } catch (err) {
        console.error("Failed to load teams", err);
      }
    }

    loadTeams();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHotStreaks() {
      if (!selectedTeamId) return;

      setLoading(true);
      try {
        const res = await apiClient.get<HotStreaksPayload>(
          "/nba/trends/hot-streaks",
          {
            params: {
              team_id: selectedTeamId,
              stat,
              threshold,
              window: teamWindow,
            },
          },
        );

        if (cancelled) return;

        setLeaders(res.data?.categoryLeaders ?? []);
        setTeamRows(res.data?.teamRows ?? []);
      } catch (err) {
        console.error("Failed to load hot streaks", err);
        if (!cancelled) {
          setLeaders([]);
          setTeamRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHotStreaks();
    return () => {
      cancelled = true;
    };
  }, [selectedTeamId, stat, threshold, teamWindow]);

  const selectedTeam = useMemo(() => {
    return teams.find((t) => t.teamId === selectedTeamId) ?? null;
  }, [teams, selectedTeamId]);

  return (
    <Card bg="gray.800" borderRadius="xl" boxShadow="lg">
      <CardHeader pb={2}>
        <HStack justify="space-between" align="start" spacing={4}>
          <Box>
            <Text color="white" fontSize="lg" fontWeight="bold">
              Player Consistency Tracker
            </Text>
            <Text color="whiteAlpha.700" fontSize="sm">
              Category leaders show the strongest active streaks this season.
            </Text>
          </Box>
        </HStack>
      </CardHeader>

      <CardBody pt={3}>
        <Stack spacing={6}>
          <Box>
            <Text color="white" fontWeight="semibold" mb={3}>
              Category Leaders
            </Text>

            {loading && leaders.length === 0 ? (
              <HStack py={6} justify="center">
                <Spinner />
                <Text color="whiteAlpha.800">Loading category leaders…</Text>
              </HStack>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
                {leaders.map((leader) => (
                  <LeaderCard key={leader.stat} leader={leader} />
                ))}
              </SimpleGrid>
            )}
          </Box>

          <Divider borderColor="whiteAlpha.200" />

          <Box>
            <Text color="white" fontWeight="semibold" mb={3}>
              Team Prop View
            </Text>

            <Grid
              templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }}
              gap={3}
              mb={4}
            >
              <GridItem>
                <Select
                  value={selectedTeamId ?? ""}
                  onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                  bg="gray.900"
                  color="white"
                  borderColor="whiteAlpha.200"
                >
                  {teams.map((option) => (
                    <option key={option.teamId} value={option.teamId}>
                      {option.teamName}
                    </option>
                  ))}
                </Select>
              </GridItem>

              <GridItem>
                <Select
                  value={stat}
                  onChange={(e) => {
                    const nextStat = e.target.value as StatKey;
                    setStat(nextStat);
                    setThreshold(THRESHOLDS[nextStat][0]);
                  }}
                  bg="gray.900"
                  color="white"
                  borderColor="whiteAlpha.200"
                >
                  {(Object.keys(STAT_LABELS) as StatKey[]).map((key) => (
                    <option key={key} value={key}>
                      {STAT_LABELS[key]}
                    </option>
                  ))}
                </Select>
              </GridItem>

              <GridItem>
                <Select
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  bg="gray.900"
                  color="white"
                  borderColor="whiteAlpha.200"
                >
                  {THRESHOLDS[stat].map((value) => (
                    <option key={value} value={value}>
                      {value}+
                    </option>
                  ))}
                </Select>
              </GridItem>

              <GridItem>
                <Select
                  value={teamWindow}
                  onChange={(e) =>
                    setTeamWindow(e.target.value as TeamWindowKey)
                  }
                  bg="gray.900"
                  color="white"
                  borderColor="whiteAlpha.200"
                >
                  <option value="5">Last 5</option>
                  <option value="10">Last 10</option>
                  <option value="20">Last 20</option>
                  <option value="season">Season</option>
                </Select>
              </GridItem>
            </Grid>

            {loading ? (
              <HStack py={6} justify="center">
                <Spinner />
                <Text color="whiteAlpha.800">
                  Loading {selectedTeam?.teamName ?? "team"} rows…
                </Text>
              </HStack>
            ) : (
              <Box overflowX="auto">
                <Table
                  size="sm"
                  variant="simple"
                  w="100%"
                  sx={{ tableLayout: "fixed" }}
                >
                  <Thead>
                    <Tr>
                      <Th color="whiteAlpha.700" w="32%">
                        Player
                      </Th>
                      <Th color="whiteAlpha.700" isNumeric w="10%">
                        Hit Rate
                      </Th>
                      <Th color="whiteAlpha.700" isNumeric w="9%">
                        Streak
                      </Th>
                      <Th color="whiteAlpha.700" isNumeric w="9%">
                        Avg
                      </Th>
                      <Th color="whiteAlpha.700" w="40%">
                        Last {teamWindow === "season" ? "Season" : teamWindow}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {teamRows.map((row) => (
                      <Tr key={`${row.teamAbbr}-${row.playerId}`}>
                        <Td color="white" w="32%">
                          <VStack align="start" spacing={0}>
                            <HStack spacing={1} maxW="100%">
                              <Text noOfLines={1}>{row.playerName}</Text>
                              <StatusBadge isActive={row.isActive} />
                            </HStack>
                            <Text color="whiteAlpha.600" fontSize="xs">
                              {row.teamAbbr} • {row.threshold}+{" "}
                              {STAT_LABELS[stat]}
                            </Text>
                          </VStack>
                        </Td>

                        <Td color="white" isNumeric w="10%">
                          {row.hitCount}/{row.totalGames}
                        </Td>

                        <Td color="white" isNumeric w="9%">
                          {row.currentStreak}
                        </Td>

                        <Td color="white" isNumeric w="9%">
                          {row.avg.toFixed(1)}
                        </Td>

                        <Td w="40%">
                          <Box
                            w="100%"
                            display="flex"
                            justifyContent="flex-start"
                          >
                            <HitPattern
                              pattern={row.recentPattern}
                              windowType={teamWindow}
                            />
                          </Box>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </Box>
        </Stack>
      </CardBody>
    </Card>
  );
}
