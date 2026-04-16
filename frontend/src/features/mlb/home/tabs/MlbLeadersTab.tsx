import { useEffect, useMemo, useState } from "react";
import {
  Box,
  ButtonGroup,
  Button,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Spacer,
  Select,
  VStack,
  Tooltip,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";
import {
  getMlbHeadshotUrl,
  getMlbScoreboardLogoUrl,
} from "@/shared/utils/mlb-assets";

type Category = "Batting" | "Pitching";

interface LeaderRow {
  CATEGORY: Category;
  STAT_CODE: string;
  STAT_LABEL: string;
  RANK: number;
  PLAYER_ID: number;
  PLAYER_NAME: string;
  TEAM_ID: number;
  TEAM_NAME: string;
  POSITION_GROUP: string;
  STAT_VALUE: number | string;
  SEASON: number;
}

interface StatOption {
  code: string;
  label: string;
}

const BATTING_CARD_ORDER = ["HR", "RBI", "AVG", "OBP", "SLG", "OPS"];
const PITCHING_CARD_ORDER = ["ERA", "WHIP", "W", "SV", "SO"];

const BATTING_DROPDOWN_ORDER = ["HR", "RBI", "AVG", "OBP", "SLG", "OPS", "SB"];
const PITCHING_DROPDOWN_ORDER = ["ERA", "WHIP", "W", "SV", "SO", "IP"];

export default function MlbLeadersTab() {
  const [category, setCategory] = useState<Category>("Batting");
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStat, setSelectedStat] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/mlb/leaders")
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to load MLB leaders:", err);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const categoryRows = useMemo(
    () => rows.filter((r) => r.CATEGORY === category),
    [rows, category],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, LeaderRow[]>();

    for (const row of categoryRows) {
      if (!map.has(row.STAT_CODE)) map.set(row.STAT_CODE, []);
      map.get(row.STAT_CODE)!.push(row);
    }

    for (const [key, arr] of map.entries()) {
      arr.sort((a, b) => a.RANK - b.RANK);
      map.set(key, arr);
    }

    return map;
  }, [categoryRows]);

  const statLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of categoryRows) {
      if (!map.has(row.STAT_CODE)) {
        map.set(row.STAT_CODE, row.STAT_LABEL);
      }
    }
    return map;
  }, [categoryRows]);

  const dropdownStats: StatOption[] = useMemo(() => {
    const desiredOrder =
      category === "Batting" ? BATTING_DROPDOWN_ORDER : PITCHING_DROPDOWN_ORDER;

    return desiredOrder
      .filter((code) => grouped.has(code))
      .map((code) => ({
        code,
        label: statLabelMap.get(code) || fallbackStatLabel(code),
      }));
  }, [category, grouped, statLabelMap]);

  useEffect(() => {
    if (!dropdownStats.length) return;
    if (!selectedStat || !dropdownStats.find((s) => s.code === selectedStat)) {
      setSelectedStat(dropdownStats[0].code);
    }
  }, [dropdownStats, selectedStat]);

  const cards = useMemo(() => {
    const desiredOrder =
      category === "Batting" ? BATTING_CARD_ORDER : PITCHING_CARD_ORDER;

    return desiredOrder
      .map((code) => ({
        code,
        rows: grouped.get(code) || [],
        label: statLabelMap.get(code) || fallbackStatLabel(code),
      }))
      .filter((card) => card.rows.length > 0);
  }, [category, grouped, statLabelMap]);

  const selectedRows = selectedStat ? grouped.get(selectedStat) || [] : [];

  return (
    <Stack spacing={4}>
      <HStack justify="space-between" wrap="wrap" gap={3}>
        <Heading size="md">League Leaders</Heading>

        <HStack gap={3} wrap="wrap">
          <ButtonGroup isAttached size="sm" variant="outline">
            <Button
              onClick={() => setCategory("Batting")}
              isActive={category === "Batting"}
            >
              Batting
            </Button>
            <Button
              onClick={() => setCategory("Pitching")}
              isActive={category === "Pitching"}
            >
              Pitching
            </Button>
          </ButtonGroup>

          <Select
            size="sm"
            maxW="220px"
            value={selectedStat}
            onChange={(e) => setSelectedStat(e.target.value)}
          >
            {dropdownStats.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </Select>
        </HStack>
      </HStack>

      <SimpleGrid
        columns={{ base: 1, md: 2, xl: category === "Batting" ? 6 : 5 }}
        spacing={4}
      >
        {(loading
          ? Array.from({ length: category === "Batting" ? 6 : 5 })
          : cards
        ).map((card: any, idx) => {
          if (loading) {
            return (
              <Box
                key={`sk-${idx}`}
                bg="gray.800"
                borderRadius="lg"
                p={4}
                borderWidth="1px"
                borderColor="whiteAlpha.200"
              >
                <Skeleton h="20px" mb={3} />
                <Skeleton h="72px" mb={3} />
                <Skeleton h="18px" mb={2} />
                <Skeleton h="18px" mb={2} />
                <Skeleton h="18px" mb={2} />
                <Skeleton h="18px" />
              </Box>
            );
          }

          const leader = card.rows[0];

          return (
            <Box
              key={card.code}
              bg="gray.800"
              borderRadius="lg"
              p={4}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              transition="all 0.15s ease"
              _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
            >
              <HStack spacing={3} align="center">
                <Tooltip
                  label={getStatTooltip(card.code)}
                  hasArrow
                  placement="top"
                  isDisabled={!getStatTooltip(card.code)}
                >
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color="whiteAlpha.900"
                    cursor={getStatTooltip(card.code) ? "help" : "default"}
                  >
                    {card.label}
                  </Text>
                </Tooltip>
                <Spacer />
                <Text fontWeight="bold">
                  {formatLeaderValue(leader?.STAT_VALUE)}
                </Text>
              </HStack>

              <HStack spacing={3} align="center" mt={3} mb={3}>
                {leader?.PLAYER_ID ? (
                  <img
                    src={getMlbHeadshotUrl(leader.PLAYER_ID, 120)}
                    alt={leader.PLAYER_NAME}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : null}

                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize="lg" lineHeight="1.1">
                    {leader?.PLAYER_NAME || "—"}
                  </Text>

                  <HStack spacing={2}>
                    {leader?.TEAM_NAME ? (
                      <img
                        src={getMlbScoreboardLogoUrl(
                          teamNameToAbbr(leader.TEAM_NAME),
                        )}
                        alt={leader.TEAM_NAME}
                        style={{ width: 16, height: 16, objectFit: "contain" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : null}

                    <Text color="whiteAlpha.600" fontSize="sm">
                      {leader?.TEAM_NAME || ""}
                    </Text>
                  </HStack>
                </VStack>
              </HStack>

              <Stack spacing={1}>
                {card.rows.slice(0, 5).map((r: LeaderRow) => (
                  <HStack
                    key={`${card.code}-${r.RANK}`}
                    justify="space-between"
                    fontSize="sm"
                  >
                    <HStack spacing={2} minW={0}>
                      {r.TEAM_NAME ? (
                        <img
                          src={getMlbScoreboardLogoUrl(
                            teamNameToAbbr(r.TEAM_NAME),
                          )}
                          alt={r.TEAM_NAME}
                          style={{
                            width: 14,
                            height: 14,
                            objectFit: "contain",
                            flexShrink: 0,
                          }}
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      ) : null}

                      <Text color="whiteAlpha.800" noOfLines={1}>
                        {r.RANK}. {r.PLAYER_NAME}
                      </Text>
                    </HStack>

                    <Text color="whiteAlpha.900" fontWeight="semibold">
                      {formatLeaderValue(r.STAT_VALUE)}
                    </Text>
                  </HStack>
                ))}
              </Stack>
            </Box>
          );
        })}
      </SimpleGrid>

      {!loading && selectedStat && selectedRows.length > 0 ? (
        <Box
          bg="gray.800"
          borderRadius="lg"
          p={4}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
        >
          <Text fontSize="lg" fontWeight="bold" mb={3} color="whiteAlpha.900">
            {dropdownStats.find((s) => s.code === selectedStat)?.label ||
              selectedStat}
          </Text>

          <Stack spacing={2}>
            {selectedRows.map((r) => (
              <HStack
                key={`${r.STAT_CODE}-${r.RANK}`}
                justify="space-between"
                align="center"
              >
                <HStack spacing={3} minW={0}>
                  <Text minW="20px">{r.RANK}.</Text>

                  <img
                    src={getMlbHeadshotUrl(r.PLAYER_ID, 120)}
                    alt={r.PLAYER_NAME}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />

                  <Text fontWeight="medium" noOfLines={1}>
                    {r.PLAYER_NAME}
                  </Text>

                  {r.TEAM_NAME ? (
                    <img
                      src={getMlbScoreboardLogoUrl(teamNameToAbbr(r.TEAM_NAME))}
                      alt={r.TEAM_NAME}
                      style={{
                        width: 16,
                        height: 16,
                        objectFit: "contain",
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : null}

                  <Text color="whiteAlpha.600" noOfLines={1}>
                    {r.TEAM_NAME}
                  </Text>
                </HStack>

                <Text fontWeight="bold">{formatLeaderValue(r.STAT_VALUE)}</Text>
              </HStack>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}

function formatLeaderValue(v: unknown) {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  if (n > 0 && n < 1) return n.toFixed(3);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function fallbackStatLabel(code: string) {
  const map: Record<string, string> = {
    HR: "Home Runs",
    RBI: "Runs Batted In",
    AVG: "Batting Average",
    OBP: "On-Base Percentage",
    SLG: "Slugging Percentage",
    OPS: "OPS",
    SB: "Stolen Bases",
    ERA: "ERA",
    WHIP: "WHIP",
    W: "Wins",
    SV: "Saves",
    SO: "Strikeouts",
    IP: "Innings Pitched",
  };

  return map[code] || code;
}

function getStatTooltip(code: string) {
  const tips: Record<string, string> = {
    AVG: "Batting Average — hits divided by at-bats.",
    OBP: "On-Base Percentage — how often a batter reaches base.",
    SLG: "Slugging Percentage — total bases divided by at-bats.",
    OPS: "On-base Plus Slugging — OBP plus SLG.",
    ERA: "Earned Run Average — earned runs allowed per 9 innings pitched.",
    WHIP: "Walks plus Hits per Inning Pitched.",
  };

  return tips[code] || "";
}

function teamNameToAbbr(teamName?: string | null) {
  const map: Record<string, string> = {
    "Arizona Diamondbacks": "ARI",
    "Atlanta Braves": "ATL",
    "Baltimore Orioles": "BAL",
    "Boston Red Sox": "BOS",
    "Chicago Cubs": "CHC",
    "Chicago White Sox": "CWS",
    "Cincinnati Reds": "CIN",
    "Cleveland Guardians": "CLE",
    "Colorado Rockies": "COL",
    "Detroit Tigers": "DET",
    "Houston Astros": "HOU",
    "Kansas City Royals": "KC",
    "Los Angeles Angels": "LAA",
    "Los Angeles Dodgers": "LAD",
    "Miami Marlins": "MIA",
    "Milwaukee Brewers": "MIL",
    "Minnesota Twins": "MIN",
    "New York Mets": "NYM",
    "New York Yankees": "NYY",
    Athletics: "ATH",
    "Philadelphia Phillies": "PHI",
    "Pittsburgh Pirates": "PIT",
    "San Diego Padres": "SD",
    "San Francisco Giants": "SF",
    "Seattle Mariners": "SEA",
    "St. Louis Cardinals": "STL",
    "Tampa Bay Rays": "TB",
    "Texas Rangers": "TEX",
    "Toronto Blue Jays": "TOR",
    "Washington Nationals": "WSH",
  };

  return map[teamName || ""] || "";
}
