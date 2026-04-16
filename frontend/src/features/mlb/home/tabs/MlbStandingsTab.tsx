import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  Flex,
  HStack,
  Button,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  SimpleGrid,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";
import { useNavigate } from "react-router-dom";
import { getMlbScoreboardLogoUrl } from "@/shared/utils/mlb-assets";

type ViewMode = "DIVISION" | "LEAGUE" | "OVERALL";

interface StandingRow {
  TEAM_ID: number;
  TEAM_NAME: string;
  TEAM_ABBREVIATION?: string;
  LEAGUE: string;
  DIVISION: string;
  W: number;
  L: number;
  PCT: number | string;
  GB?: string | number | null;
  DIV_RANK?: number | string | null;
  WC_RANK?: number | string | null;
  RS?: string | number | null;
  RA?: string | number | null;
  RUN_DIFF?: string | number | null;
  STREAK?: string | null;
}

export default function MlbStandingsTab() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [mode, setMode] = useState<ViewMode>("DIVISION");

  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/mlb/standings")
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to load MLB standings:", err);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const alDivisionGroups = useMemo(() => {
    return ["AL East", "AL Central", "AL West"].map((div) => ({
      title: div,
      rows: sortStandings(rows.filter((r) => r.DIVISION === div)),
    }));
  }, [rows]);

  const nlDivisionGroups = useMemo(() => {
    return ["NL East", "NL Central", "NL West"].map((div) => ({
      title: div,
      rows: sortStandings(rows.filter((r) => r.DIVISION === div)),
    }));
  }, [rows]);

  const americanLeagueRows = useMemo(() => {
    return sortStandings(
      rows.filter((r) => String(r.LEAGUE || "").toUpperCase() === "AL"),
    );
  }, [rows]);

  const nationalLeagueRows = useMemo(() => {
    return sortStandings(
      rows.filter((r) => String(r.LEAGUE || "").toUpperCase() === "NL"),
    );
  }, [rows]);

  const overallRows = useMemo(() => sortStandings(rows), [rows]);

  return (
    <Box>
      <Flex align="center" justify="space-between" wrap="wrap" gap={3} mb={4}>
        <Box>
          <Text fontSize="xl" fontWeight="bold">
            Standings
          </Text>
          <Text color="gray.400" fontSize="sm">
            View by division, league, or full MLB.
          </Text>
        </Box>

        <HStack spacing={2} wrap="wrap">
          <Button
            size="sm"
            variant={mode === "DIVISION" ? "solid" : "outline"}
            onClick={() => setMode("DIVISION")}
          >
            Division
          </Button>
          <Button
            size="sm"
            variant={mode === "LEAGUE" ? "solid" : "outline"}
            onClick={() => setMode("LEAGUE")}
          >
            League
          </Button>
          <Button
            size="sm"
            variant={mode === "OVERALL" ? "solid" : "outline"}
            onClick={() => setMode("OVERALL")}
          >
            Overall
          </Button>
        </HStack>
      </Flex>

      {loading ? (
        <HStack>
          <Spinner />
          <Text color="gray.400">Loading standings…</Text>
        </HStack>
      ) : rows.length === 0 ? (
        <Text color="gray.400">No standings data available.</Text>
      ) : mode === "DIVISION" ? (
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
          <Box>
            {alDivisionGroups.map((group) => (
              <Box key={group.title} mb={6}>
                <StandingsTable
                  title={group.title}
                  rows={group.rows}
                  onTeamClick={(teamId) =>
                    navigate(`/mlb?tab=teams&teamId=${teamId}`)
                  }
                />
              </Box>
            ))}
          </Box>

          <Box>
            {nlDivisionGroups.map((group) => (
              <Box key={group.title} mb={6}>
                <StandingsTable
                  title={group.title}
                  rows={group.rows}
                  onTeamClick={(teamId) =>
                    navigate(`/mlb?tab=teams&teamId=${teamId}`)
                  }
                />
              </Box>
            ))}
          </Box>
        </SimpleGrid>
      ) : mode === "LEAGUE" ? (
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
          <StandingsTable
            title="American League"
            rows={americanLeagueRows}
            onTeamClick={(teamId) =>
              navigate(`/mlb?tab=teams&teamId=${teamId}`)
            }
          />
          <StandingsTable
            title="National League"
            rows={nationalLeagueRows}
            onTeamClick={(teamId) =>
              navigate(`/mlb?tab=teams&teamId=${teamId}`)
            }
          />
        </SimpleGrid>
      ) : (
        <StandingsTable
          title="MLB Overall"
          rows={overallRows}
          onTeamClick={(teamId) => navigate(`/mlb?tab=teams&teamId=${teamId}`)}
        />
      )}
    </Box>
  );
}

function StandingsTable({
  title,
  rows,
  onTeamClick,
}: {
  title: string;
  rows: StandingRow[];
  onTeamClick?: (teamId: number) => void;
}) {
  return (
    <Box>
      <Flex align="center" justify="space-between" mb={2}>
        <Text fontSize="lg" fontWeight="bold">
          {title}
        </Text>
      </Flex>

      <Box borderRadius="md" overflow="hidden" bg="gray.800" shadow="md">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th w="50px">#</Th>
              <Th>Team</Th>
              <Th isNumeric>W</Th>
              <Th isNumeric>L</Th>
              <Th isNumeric>PCT</Th>
              <Th isNumeric>GB</Th>
              <Th isNumeric>RD</Th>
              <Th>Streak</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((r, idx) => (
              <Tr
                key={r.TEAM_ID}
                cursor={onTeamClick ? "pointer" : "default"}
                _hover={onTeamClick ? { bg: "whiteAlpha.100" } : undefined}
                onClick={onTeamClick ? () => onTeamClick(r.TEAM_ID) : undefined}
              >
                <Td>{idx + 1}</Td>

                <Td fontWeight="semibold">
                  <HStack spacing={2}>
                    {r.TEAM_ABBREVIATION ? (
                      <img
                        src={getMlbScoreboardLogoUrl(r.TEAM_ABBREVIATION)}
                        alt={r.TEAM_NAME}
                        style={{ width: 20, height: 20, objectFit: "contain" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : null}

                    <Text>{r.TEAM_NAME}</Text>
                  </HStack>
                </Td>

                <Td isNumeric>{r.W}</Td>
                <Td isNumeric>{r.L}</Td>
                <Td isNumeric>{formatPct(r.PCT)}</Td>
                <Td isNumeric>{r.GB ?? "-"}</Td>
                <Td isNumeric>{r.RUN_DIFF ?? "-"}</Td>
                <Td>{r.STREAK ?? "-"}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

function sortStandings(rows: StandingRow[]) {
  return rows.slice().sort((a, b) => {
    const ap = Number(a.PCT);
    const bp = Number(b.PCT);
    if (bp !== ap) return bp - ap;
    if (b.W !== a.W) return b.W - a.W;
    return a.L - b.L;
  });
}

function formatPct(p: number | string) {
  const n = Number(p);
  if (Number.isNaN(n)) return "-";
  return n.toFixed(3);
}
