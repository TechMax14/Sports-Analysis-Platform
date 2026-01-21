import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  Flex,
  HStack,
  Button,
  Select,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Image,
} from "@chakra-ui/react";
import apiClient from "../../../../services/api-client";
import { useNavigate } from "react-router-dom";

type ViewMode = "CONFERENCE" | "LEAGUE" | "DIVISION";

interface StandingRow {
  TeamID: number;
  TeamName: string;
  Conference: "East" | "West";
  ConferenceRecord: string; // "25-6"
  Division: string; // "Atlantic" etc
  DivisionRecord: string;
  WINS: number;
  LOSSES: number;
  WinPCT: number; // 0.816
}

const teamLogoUrl = (teamId: number) =>
  `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;

export default function StandingsTab() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [mode, setMode] = useState<ViewMode>("CONFERENCE");
  const [selectedDivision, setSelectedDivision] = useState<string>("");

  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/nba/standings")
      .then((res) => {
        const data = res.data;
        setRows(Array.isArray(data) ? data : []);
        if (!Array.isArray(data))
          console.error("Expected array from /standings, got:", data);
      })
      .catch((err) => {
        console.error("Failed to load standings:", err);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const divisions = useMemo(() => {
    const uniq = Array.from(new Set(rows.map((r) => r.Division))).sort();
    return uniq;
  }, [rows]);

  // ensure division dropdown always has a valid value
  useEffect(() => {
    if (mode !== "DIVISION") return;
    if (!divisions.length) return;
    if (!selectedDivision || !divisions.includes(selectedDivision)) {
      setSelectedDivision(divisions[0]);
    }
  }, [mode, divisions, selectedDivision]);

  const east = useMemo(
    () => sortStandings(rows.filter((r) => r.Conference === "East")),
    [rows],
  );
  const west = useMemo(
    () => sortStandings(rows.filter((r) => r.Conference === "West")),
    [rows],
  );
  const league = useMemo(() => sortStandings(rows), [rows]);

  const divisionRows = useMemo(() => {
    if (!selectedDivision) return [];
    return sortStandings(rows.filter((r) => r.Division === selectedDivision));
  }, [rows, selectedDivision]);

  return (
    <Box>
      <Flex align="center" justify="space-between" wrap="wrap" gap={3} mb={4}>
        <Box>
          <Text fontSize="xl" fontWeight="bold">
            Standings
          </Text>
          {mode === "CONFERENCE" && (
            <Text color="gray.400" fontSize="sm">
              Cut lines: top 6 = playoffs, 7–10 = play-in
            </Text>
          )}
        </Box>

        <HStack spacing={2} wrap="wrap">
          <Button
            size="sm"
            variant={mode === "CONFERENCE" ? "solid" : "outline"}
            onClick={() => setMode("CONFERENCE")}
          >
            Conference
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
            variant={mode === "DIVISION" ? "solid" : "outline"}
            onClick={() => setMode("DIVISION")}
          >
            Division
          </Button>

          {mode === "DIVISION" && (
            <Select
              size="sm"
              minW="200px"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
            >
              {divisions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          )}
        </HStack>
      </Flex>

      {loading ? (
        <HStack>
          <Spinner />
          <Text color="gray.400">Loading standings…</Text>
        </HStack>
      ) : rows.length === 0 ? (
        <Text color="gray.400">No standings data available.</Text>
      ) : mode === "CONFERENCE" ? (
        <Flex gap={6} wrap="wrap" align="start">
          <Box flex="1" minW={{ base: "100%", lg: "48%" }}>
            <StandingsTable
              title="Eastern Conference"
              rows={east}
              showCutLines
              onTeamClick={(teamId) =>
                navigate(`/nba?tab=teams&teamId=${teamId}`)
              }
            />
          </Box>
          <Box flex="1" minW={{ base: "100%", lg: "48%" }}>
            <StandingsTable
              title="Western Conference"
              rows={west}
              showCutLines
              onTeamClick={(teamId) =>
                navigate(`/nba?tab=teams&teamId=${teamId}`)
              }
            />
          </Box>
        </Flex>
      ) : mode === "LEAGUE" ? (
        <StandingsTable
          title="League"
          rows={league}
          onTeamClick={(teamId) => navigate(`/nba?tab=teams&teamId=${teamId}`)}
        />
      ) : (
        <StandingsTable
          title={`${selectedDivision} Division`}
          rows={divisionRows}
          onTeamClick={(teamId) => navigate(`/nba?tab=teams&teamId=${teamId}`)}
        />
      )}
    </Box>
  );
}

function StandingsTable({
  title,
  rows,
  showCutLines = false,
  onTeamClick,
}: {
  title: string;
  rows: StandingRow[];
  showCutLines?: boolean;
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
              <Th>Conf</Th>
              <Th>Div</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((r, idx) => {
              const seed = idx + 1;

              // visual cut lines for conference tables:
              const thickAfter = showCutLines && (seed === 6 || seed === 10);

              const rowBorder = thickAfter ? "3px solid" : "1px solid";

              // optional row tinting (subtle)
              const badge =
                showCutLines && seed <= 6
                  ? { label: "Playoffs", scheme: "green" as const }
                  : showCutLines && seed <= 10
                    ? { label: "Play-In", scheme: "yellow" as const }
                    : null;

              return (
                <Tr
                  key={r.TeamID}
                  borderBottom={rowBorder}
                  borderColor={thickAfter ? "gray.500" : "gray.700"}
                  cursor={onTeamClick ? "pointer" : "default"}
                  _hover={onTeamClick ? { bg: "whiteAlpha.100" } : undefined}
                  onClick={
                    onTeamClick ? () => onTeamClick(r.TeamID) : undefined
                  }
                >
                  <Td>{seed}</Td>
                  <Td fontWeight="semibold">
                    <HStack spacing={2}>
                      <Image
                        src={teamLogoUrl(r.TeamID)}
                        alt={r.TeamName}
                        boxSize="22px"
                      />
                      <Text>{r.TeamName}</Text>
                      {badge ? (
                        <Badge ml={2} colorScheme={badge.scheme}>
                          {badge.label}
                        </Badge>
                      ) : null}
                    </HStack>
                  </Td>
                  <Td isNumeric>{r.WINS}</Td>
                  <Td isNumeric>{r.LOSSES}</Td>
                  <Td isNumeric>{formatPct(r.WinPCT)}</Td>
                  <Td>{r.ConferenceRecord}</Td>
                  <Td>{r.DivisionRecord}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

function sortStandings(rows: StandingRow[]) {
  // Sort by WinPCT desc, then wins desc, then losses asc
  return rows.slice().sort((a, b) => {
    if (b.WinPCT !== a.WinPCT) return b.WinPCT - a.WinPCT;
    if (b.WINS !== a.WINS) return b.WINS - a.WINS;
    return a.LOSSES - b.LOSSES;
  });
}

function formatPct(p: number) {
  if (p == null || Number.isNaN(p)) return "-";
  return p.toFixed(3);
}
