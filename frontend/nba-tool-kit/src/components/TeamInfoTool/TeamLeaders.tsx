// src/TeamInfoTool/TeamLeaders.tsx
import { useEffect, useState } from "react";
import { Box, Image, Text, VStack, HStack, Spinner } from "@chakra-ui/react";
import axios from "axios";

interface TopPlayer {
  PLAYER_NAME: string;
  PLAYER_IMAGE_URL: string;
  STAT: string;
  VALUE: number;
  TEAM_ABBREVIATION : string;
}

interface Props {
  teamName: string;
}

const TeamLeaders = ({ teamName }: Props) => {
  const [leaders, setLeaders] = useState<TopPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await axios.get<TopPlayer[]>(
          "http://localhost:5000/api/top-players"
        );
        const filtered = res.data.filter((p) => p.TEAM_ABBREVIATION === teamAbbreviation);
        setLeaders(filtered);
      } catch (err) {
        console.error("Error fetching top players", err);
      } finally {
        setLoading(false);
      }
    };

    if (teamName) {
      fetchLeaders();
    }
  }, [teamName]);

  if (loading) return <Spinner size="sm" />;

  return (
    <VStack align="start" spacing={4} mb={4}>
      <Text fontWeight="bold" color="white">
        Team Leaders
      </Text>
      <HStack spacing={6}>
        {leaders.map((player) => (
          <VStack
            key={player.STAT}
            spacing={1}
            bg="gray.800"
            p={3}
            rounded="xl"
            align="center"
            minW="100px"
          >
            <Image
              src={player.PLAYER_IMAGE_URL}
              alt={player.PLAYER_NAME}
              boxSize="50px"
              borderRadius="full"
              border="1px solid #2D3748"
            />
            <Text fontSize="sm" color="gray.300">
              {player.STAT}
            </Text>
            <Text
              fontSize="md"
              fontWeight="semibold"
              color="white"
              noOfLines={1}
            >
              {player.PLAYER_NAME}
            </Text>
            <Text fontSize="sm" color="green.300">
              {player.VALUE}
            </Text>
          </VStack>
        ))}
      </HStack>
    </VStack>
  );
};

export default TeamLeaders;
