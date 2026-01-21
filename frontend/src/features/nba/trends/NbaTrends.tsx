import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  HStack,
  Input,
  List,
  ListItem,
  Spinner,
  Stack,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import apiClient from "../../../services/api-client";

type MetricKey = "PTS" | "AST" | "REB" | "PA" | "PR" | "RA" | "PRA"; // (PAR = PRA)

type PlayerSearchResult = {
  playerId: number;
  name: string;
  teamId?: number | null;
  teamAbbr?: string | null;
};

type GameLogRow = {
  GAME_DATE?: string | null;
  MATCHUP?: string | null;
  OPP_TEAM_ABBR?: string | null;
  IS_HOME?: boolean | null;
  IS_AWAY?: boolean | null;
  PTS?: number | null;
  AST?: number | null;
  REB?: number | null;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function metricLabel(k: MetricKey) {
  switch (k) {
    case "PTS":
      return "PTS";
    case "AST":
      return "AST";
    case "REB":
      return "REB";
    case "PA":
      return "P+A";
    case "PR":
      return "P+R";
    case "RA":
      return "R+A";
    case "PRA":
      return "P+R+A";
    default:
      return k;
  }
}

function metricColor(k: MetricKey) {
  // keep it simple and readable (you can tweak later)
  switch (k) {
    case "PTS":
      return "teal.400";
    case "AST":
      return "orange.400";
    case "REB":
      return "purple.400";
    case "PA":
      return "cyan.400";
    case "PR":
      return "pink.400";
    case "RA":
      return "yellow.400";
    case "PRA":
      return "teal.300";
    default:
      return "teal.400";
  }
}

function computeMetricValue(
  metric: MetricKey,
  row: { PTS: number; AST: number; REB: number },
) {
  const { PTS, AST, REB } = row;
  switch (metric) {
    case "PTS":
      return PTS;
    case "AST":
      return AST;
    case "REB":
      return REB;
    case "PA":
      return PTS + AST;
    case "PR":
      return PTS + REB;
    case "RA":
      return REB + AST;
    case "PRA":
      return PTS + REB + AST;
    default:
      return PTS;
  }
}

export default function NbaTrends() {
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedPlayer, setSelectedPlayer] =
    useState<PlayerSearchResult | null>(null);

  const [lastN, setLastN] = useState<5 | 10>(5);

  // ✅ Single metric selector (PTS default)
  const [metric, setMetric] = useState<MetricKey>("PTS");

  const [gamelog, setGamelog] = useState<GameLogRow[]>([]);
  const [isLoadingLog, setIsLoadingLog] = useState(false);

  const selectedPlayerId = selectedPlayer?.playerId ?? null;

  // --- Default player on load ---
  useEffect(() => {
    let cancelled = false;

    async function loadDefault() {
      try {
        setIsSearching(true);
        const res = await apiClient.get<PlayerSearchResult[]>(
          "/nba/players/search",
          { params: { q: "james" } },
        );
        if (cancelled) return;

        const first =
          res.data?.find((p) => p.name === "LeBron James") ??
          res.data?.find((p) => p.name === "James Harden") ??
          res.data?.[0] ??
          null;

        setSelectedPlayer(first);
        setSearchResults(res.data ?? []);
      } catch (e) {
        if (!cancelled) {
          toast({
            status: "error",
            title: "Failed to load default player",
            description:
              "Check backend is running and endpoints are reachable.",
          });
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }

    loadDefault();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // --- Search (debounced) ---
  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const q = query.trim();
    const t = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await apiClient.get<PlayerSearchResult[]>(
          "/nba/players/search",
          { params: { q } },
        );
        setSearchResults(res.data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [query]);

  // --- Load gamelog when player/lastN changes ---
  useEffect(() => {
    if (!selectedPlayerId) return;

    let cancelled = false;

    async function loadLog() {
      try {
        setIsLoadingLog(true);
        const res = await apiClient.get<GameLogRow[]>(
          `/nba/players/${selectedPlayerId}/gamelog`,
          { params: { last: lastN } },
        );
        if (cancelled) return;
        setGamelog(res.data ?? []);
      } catch (e) {
        if (!cancelled) {
          toast({
            status: "error",
            title: "Failed to load game log",
            description: "Make sure player_game_logs.csv exists (run main.py).",
          });
          setGamelog([]);
        }
      } finally {
        if (!cancelled) setIsLoadingLog(false);
      }
    }

    loadLog();
    return () => {
      cancelled = true;
    };
  }, [selectedPlayerId, lastN, toast]);

  // Build chart data oldest -> newest (left to right)
  const chartData = useMemo(() => {
    const rows = [...gamelog].slice(0, lastN).reverse();

    return rows.map((r) => {
      let label = r.OPP_TEAM_ABBR
        ? `${r.OPP_TEAM_ABBR}${r.IS_HOME ? " (H)" : r.IS_AWAY ? " (A)" : ""}`
        : (r.MATCHUP ?? "Game");

      // remove any leading punctuation/spaces like ", " or "@ "
      label = label.replace(/^[,\s]+/, "");

      const base = {
        PTS: Number((r as any).PTS ?? 0),
        AST: Number((r as any).AST ?? 0),
        REB: Number((r as any).REB ?? 0),
      };

      const value = computeMetricValue(metric, base);

      return {
        label,
        date: r.GAME_DATE ?? "",
        value,
        base, // so we can still show PTS/AST/REB underneath if you want later
      };
    });
  }, [gamelog, lastN, metric]);

  const maxValue = useMemo(() => {
    return Math.max(1, ...chartData.map((d) => Number(d.value ?? 0)));
  }, [chartData]);

  const avgValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, d) => acc + Number(d.value ?? 0), 0);
    return sum / chartData.length;
  }, [chartData]);

  const avgPct = useMemo(() => {
    if (maxValue <= 0) return 0;
    return clamp((avgValue / maxValue) * 100, 0, 100);
  }, [avgValue, maxValue]);

  const showDropdown = query.trim().length >= 2;

  const metricButtons: MetricKey[] = [
    "PTS",
    "AST",
    "REB",
    "PA",
    "PR",
    "RA",
    "PRA",
  ];

  return (
    <Stack spacing={6}>
      <Box>
        <Text fontSize="2xl" fontWeight="bold" color="white">
          Today’s Trends
        </Text>
        <Text color="whiteAlpha.800">
          Player trends + matchup dashboards (more widgets coming).
        </Text>
      </Box>

      {/* Widget Card */}
      <Card bg="gray.800" borderRadius="xl" boxShadow="lg">
        <CardHeader pb={2}>
          <HStack justify="space-between" align="start" spacing={4}>
            <Box>
              <Text color="white" fontSize="lg" fontWeight="bold">
                Player Game Trend
              </Text>
              <Text color="whiteAlpha.700" fontSize="sm">
                Last {lastN} games — {metricLabel(metric)}
              </Text>
            </Box>

            <HStack spacing={2}>
              <ButtonGroup isAttached size="sm" variant="outline">
                <Button
                  onClick={() => setLastN(5)}
                  isActive={lastN === 5}
                  color="white"
                  borderColor="whiteAlpha.300"
                >
                  Last 5
                </Button>
                <Button
                  onClick={() => setLastN(10)}
                  isActive={lastN === 10}
                  color="white"
                  borderColor="whiteAlpha.300"
                >
                  Last 10
                </Button>
              </ButtonGroup>

              {/* ✅ Metric buttons (single-select) */}
              <ButtonGroup isAttached size="sm" variant="outline">
                {metricButtons.map((k) => (
                  <Button
                    key={k}
                    onClick={() => setMetric(k)}
                    isActive={metric === k}
                    color="white"
                    borderColor="whiteAlpha.300"
                  >
                    {metricLabel(k)}
                  </Button>
                ))}
              </ButtonGroup>
            </HStack>
          </HStack>
        </CardHeader>

        <CardBody pt={3}>
          {/* Search */}
          <Box position="relative" mb={4}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                selectedPlayer ? selectedPlayer.name : "Search player..."
              }
              bg="gray.900"
              borderColor="whiteAlpha.200"
              color="white"
            />
            {isSearching && (
              <Box
                position="absolute"
                right={3}
                top="50%"
                transform="translateY(-50%)"
              >
                <Spinner size="sm" />
              </Box>
            )}

            {/* Dropdown */}
            {showDropdown && (
              <Box
                position="absolute"
                top="100%"
                left={0}
                right={0}
                mt={2}
                bg="gray.900"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="md"
                zIndex={10}
                maxH="260px"
                overflowY="auto"
              >
                {isSearching ? (
                  <Text px={3} py={2} color="whiteAlpha.700">
                    Searching…
                  </Text>
                ) : searchResults.length === 0 ? (
                  <Text px={3} py={2} color="whiteAlpha.700">
                    No matches found
                  </Text>
                ) : (
                  <List spacing={0}>
                    {searchResults.map((p) => (
                      <ListItem
                        key={p.playerId}
                        px={3}
                        py={2}
                        _hover={{ bg: "whiteAlpha.100", cursor: "pointer" }}
                        onClick={() => {
                          setSelectedPlayer(p);
                          setQuery("");
                          setSearchResults([]);
                        }}
                      >
                        <HStack justify="space-between">
                          <Text color="white">{p.name}</Text>
                          <Text color="whiteAlpha.700" fontSize="sm">
                            {p.teamAbbr ?? ""}
                          </Text>
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}
          </Box>

          {/* Vertical Chart */}
          <Box
            bg="gray.900"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            {isLoadingLog ? (
              <VStack py={10}>
                <Spinner />
                <Text color="whiteAlpha.800">Loading game log…</Text>
              </VStack>
            ) : chartData.length === 0 ? (
              <VStack py={10}>
                <Text color="whiteAlpha.800">No games found.</Text>
              </VStack>
            ) : (
              <Box overflowX="auto">
                <Box position="relative" minW="max-content" px={2} py={2}>
                  {/* Average line */}
                  <Box
                    position="absolute"
                    left={2}
                    right={2}
                    bottom={`${avgPct}%`}
                    borderTop="2px dashed"
                    borderColor="whiteAlpha.400"
                    pointerEvents="none"
                  />

                  {/* Avg label (optional but nice) */}
                  <Box
                    position="absolute"
                    right={2}
                    bottom={`calc(${avgPct}% + 6px)`}
                    bg="gray.800"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="md"
                    px={2}
                    py={1}
                    pointerEvents="none"
                  >
                    <Text fontSize="xs" color="whiteAlpha.800">
                      Avg: {avgValue.toFixed(1)}
                    </Text>
                  </Box>

                  <HStack align="end" spacing={6}>
                    {chartData.map((d, idx) => {
                      const v = Number(d.value ?? 0);
                      const pct = clamp((v / maxValue) * 100, 0, 100);

                      return (
                        <VStack
                          key={`${d.label}-${idx}`}
                          spacing={2}
                          align="center"
                        >
                          {/* Bar container */}
                          <Box
                            h="190px"
                            w="52px"
                            display="flex"
                            alignItems="flex-end"
                            justifyContent="center"
                            borderRadius="md"
                            bg="whiteAlpha.100"
                            px={2}
                            py={2}
                          >
                            <Box
                              w="100%"
                              h={`${pct}%`}
                              minH={v > 0 ? "6px" : "0px"}
                              borderRadius="sm"
                              bg={metricColor(metric)}
                              title={`${metricLabel(metric)}: ${v}`}
                            />
                          </Box>

                          {/* Value box */}
                          <Box
                            px={2}
                            py={1}
                            borderRadius="md"
                            border="1px solid"
                            borderColor="whiteAlpha.200"
                            bg="whiteAlpha.50"
                          >
                            <Text
                              fontSize="xs"
                              color="whiteAlpha.700"
                              lineHeight="1"
                            >
                              {metricLabel(metric)}
                            </Text>
                            <Text
                              fontSize="sm"
                              color="white"
                              fontWeight="bold"
                              lineHeight="1.1"
                            >
                              {v}
                            </Text>
                          </Box>

                          {/* Labels */}
                          <Text
                            fontSize="xs"
                            color="whiteAlpha.800"
                            textAlign="center"
                          >
                            {d.label}
                          </Text>
                          <Text fontSize="xs" color="whiteAlpha.600">
                            {d.date}
                          </Text>
                        </VStack>
                      );
                    })}
                  </HStack>
                </Box>
              </Box>
            )}
          </Box>
        </CardBody>
      </Card>

      {/* Placeholder for future widgets */}
      <Card bg="gray.800" borderRadius="xl" boxShadow="lg">
        <CardBody>
          <Text color="white" fontWeight="bold">
            More widgets coming
          </Text>
          <Text color="whiteAlpha.700">
            Team streaks, matchup trends, home/away splits, and more.
          </Text>
        </CardBody>
      </Card>
    </Stack>
  );
}
