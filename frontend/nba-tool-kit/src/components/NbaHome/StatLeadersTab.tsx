import { useEffect, useState } from "react";
import axios from "axios";
import { SimpleGrid, Box, Image, Text } from "@chakra-ui/react";

interface P {
  PLAYER_NAME: string;
  PLAYER_IMAGE_URL: string;
  STAT: string;
  VALUE: number;
}
export default function LeadersTab() {
  const [list, setList] = useState<P[]>([]);
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/top-players")
      .then((r) => setList(r.data.slice(0, 15)));
  }, []);
  return (
    <SimpleGrid columns={{ base: 1, md: 3, lg: 5 }} spacing={4}>
      {list.map((p) => (
        <Box
          key={p.PLAYER_NAME}
          bg="gray.800"
          p={4}
          borderRadius="md"
          textAlign="center"
        >
          <Image
            src={p.PLAYER_IMAGE_URL}
            boxSize="60px"
            borderRadius="full"
            mx="auto"
          />
          <Text fontSize="sm" mt={2}>
            {p.PLAYER_NAME}
          </Text>
          <Text fontWeight="bold" color="teal.300">
            {p.STAT} {p.VALUE}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  );
}
