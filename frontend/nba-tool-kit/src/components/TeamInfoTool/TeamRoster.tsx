import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Heading,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Spinner,
  Text,
} from "@chakra-ui/react";

interface RosterPlayer {
  PLAYER: string;
  NUM: string;
  POSITION: string;
  HEIGHT: string;
  WEIGHT: number;
  AGE: number;
  EXP: string;
  SCHOOL: string;
}

interface Props {
  teamId: number;
}

const TeamRoster = ({ teamId }: Props) => {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios
      .get(`http://localhost:5000/api/teams/${teamId}/roster`)
      .then((res) => {
        //console.log("📦 Roster response:", res.data);
        const data = res.data;
        console.log("🧾 Raw roster response:", res.data);
        if (Array.isArray(data)) {
          setRoster(data);
        } else {
          throw new Error("Invalid roster data format");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch roster", err);
        setError("Failed to load roster");
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) return <Spinner />;
  if (error) return <Text color="red.400">{error}</Text>;

  return (
    <Box>
      <Heading size="md" color="white" mb={3}>
        Roster
      </Heading>
      <Table size="sm" variant="striped" colorScheme="gray">
        <Thead>
          <Tr>
            <Th>Player</Th>
            <Th>Number</Th>
            <Th>Pos</Th>
            <Th>Age</Th>
            <Th>Exp</Th>
            <Th>School</Th>
          </Tr>
        </Thead>
        <Tbody>
          {roster.map((player) => (
            <Tr key={player.PLAYER}>
              <Td>{player.PLAYER}</Td>
              <Td>{player.NUM}</Td>
              <Td>{player.POSITION}</Td>
              <Td>{player.AGE}</Td>
              <Td>{player.EXP}</Td>
              <Td>{player.SCHOOL}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default TeamRoster;
