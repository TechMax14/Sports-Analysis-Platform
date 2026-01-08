import {
  Box,
  Heading,
  Checkbox,
  CheckboxGroup,
  Stack,
  Spinner,
  Text,
  Button,
  //Collapse,
  useDisclosure,
  Collapse,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SeasonStat {
  SEASON_START_YEAR: number;
  TEAM_NAME: string;
  avg_pts: number;
  avg_ast: number;
  avg_reb: number;
  avg_fg_pct: number;
  avg_fg3_pct: number;
  avg_ft_pct: number;
}

interface Props {
  teamId: number;
}

const basicStats = [
  { label: "PTS", key: "avg_pts", color: "#63b3ed" },
  { label: "AST", key: "avg_ast", color: "#f6ad55" },
  { label: "REB", key: "avg_reb", color: "#68d391" },
] as const;

const advancedStats = [
  { label: "FG%", key: "avg_fg_pct", color: "#d53f8c" },
  { label: "3P%", key: "avg_fg3_pct", color: "#38b2ac" },
  { label: "FT%", key: "avg_ft_pct", color: "#ed8936" },
];

const TeamSeasonStats = ({ teamId }: Props) => {
  const [data, setData] = useState<SeasonStat[]>([]);
  const [selectedStats, setSelectedStats] = useState<string[]>(
    basicStats.map((s) => s.key)
  );
  const [selectedAdvancedStats, setSelectedAdvancedStats] = useState<string[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const { isOpen, onToggle } = useDisclosure();

  useEffect(() => {
    setLoading(true);
    axios
      .get<SeasonStat[]>(`http://localhost:5000/api/teams/${teamId}/stats`)
      .then((res) => {
        const last10Seasons = res.data
          .sort((a, b) => b.SEASON_START_YEAR - a.SEASON_START_YEAR)
          .slice(0, 10)
          .reverse();
        setData(last10Seasons);
      })
      .catch((err) => console.error("Failed to fetch season stats", err))
      .finally(() => setLoading(false));
  }, [teamId]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const teamName = payload[0].payload.TEAM_NAME;
      return (
        <Box bg="gray.700" p={3} borderRadius="md" boxShadow="md">
          <Text fontWeight="bold" color="white" mb={2}>
            {teamName} — {label}
          </Text>
          {payload.map((entry: any) => (
            <Text key={entry.dataKey} color={entry.stroke}>
              {entry.name}: {entry.value.toFixed(1)}
            </Text>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Box>
      <Heading size="md" color="white" mb={3}>
        Per-Game Regular Season Averages
      </Heading>

      <Box mb={2}>
        <CheckboxGroup
          colorScheme="blue"
          value={selectedStats}
          onChange={(vals) => setSelectedStats(vals as string[])}
        >
          <Stack direction="row">
            {basicStats.map((stat) => (
              <Checkbox key={stat.key} value={stat.key}>
                {stat.label}
              </Checkbox>
            ))}
          </Stack>
        </CheckboxGroup>
      </Box>

      <Box mb={4}>
        <Button
          onClick={onToggle}
          size="sm"
          variant="ghost"
          rightIcon={<span>⚙️</span>}
          color="gray.300"
          pl={0}
        >
          Advanced Stats
        </Button>

        <Collapse as={Box} in={isOpen} animateOpacity>
          <Box mt={2} pl={1}>
            <CheckboxGroup
              colorScheme="pink"
              value={selectedAdvancedStats}
              onChange={(vals) => setSelectedAdvancedStats(vals as string[])}
            >
              <Stack direction="row" spacing={4}>
                {advancedStats.map((stat) => (
                  <Checkbox key={stat.key} value={stat.key} size="sm">
                    {stat.label}
                  </Checkbox>
                ))}
              </Stack>
            </CheckboxGroup>
          </Box>
        </Collapse>
      </Box>

      {loading ? (
        <Spinner />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="SEASON_START_YEAR" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {[...basicStats, ...advancedStats].map((stat) => {
              const isVisible =
                selectedStats.includes(stat.key) ||
                selectedAdvancedStats.includes(stat.key);
              return (
                isVisible && (
                  <Line
                    key={stat.key}
                    type="monotone"
                    dataKey={stat.key}
                    name={stat.label}
                    stroke={stat.color}
                    dot={{ r: 3 }}
                  />
                )
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
};

export default TeamSeasonStats;
