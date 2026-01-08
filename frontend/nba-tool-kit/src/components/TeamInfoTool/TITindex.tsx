import { useEffect, useState } from "react";
import axios from "axios";
import {
  HStack,
  VStack,
  Select,
  Heading,
  Box,
  Spinner,
  Text,
} from "@chakra-ui/react";
import TeamLeaders from "./TeamLeaders";
import TeamSeasonStats from "./TeamSeasonStats";
import TeamRoster from "./TeamRoster";

interface Team {
  TEAM_ID: number;
  TEAM_NAME: string;
}

const TeamInfoTool = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<Team[]>("http://localhost:5000/api/teams")
      .then((res) => setTeams(res.data))
      .catch((err) => console.error("Failed to fetch teams", err))
      .finally(() => setLoading(false));
  }, []);

  {
    /* 🏀 Fetch selected team name to pass to TeamLeaders */
  }
  const selectedTeam = teams.find((team) => team.TEAM_ID === selectedTeamId);

  return (
    <VStack align="start" spacing={6}>
      <Box>
        <Heading size="md" color="white" mb={2}>
          Select a Team
        </Heading>

        {loading ? (
          <Spinner />
        ) : error ? (
          <Text color="red.400">{error}</Text>
        ) : (
          <Select
            value={selectedTeamId ?? ""}
            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
            placeholder="Choose a team"
            maxW="300px"
          >
            {teams.map((team) => (
              <option key={team.TEAM_ID} value={team.TEAM_ID}>
                {team.TEAM_NAME}
              </option>
            ))}
          </Select>
        )}
      </Box>

      {selectedTeamId && (
        <>
          {/* Leaders Above Charts */}
          {selectedTeam && (
            <Box width="100%">
              <TeamLeaders teamName={selectedTeam.TEAM_NAME} />
            </Box>
          )}

          <HStack align="start" spacing={6} padding={4} width="100%">
            <Box flex="1" minW="0">
              <TeamSeasonStats teamId={selectedTeamId} />
            </Box>
            <Box flex="1" minW="0">
              <TeamRoster teamId={selectedTeamId} />
            </Box>
          </HStack>
        </>
      )}
    </VStack>
  );
};

export default TeamInfoTool;
