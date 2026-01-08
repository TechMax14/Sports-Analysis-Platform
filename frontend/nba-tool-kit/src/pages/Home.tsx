import { SimpleGrid, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <SimpleGrid columns={2} spacing={10} p={10}>
      <Button as={Link} to="nba" size="lg" colorScheme="blue">
        NBA
      </Button>
      <Button as={Link} to="nfl" size="lg" colorScheme="green">
        NFL (soon)
      </Button>
      <Button as={Link} to="mlb" size="lg" colorScheme="orange">
        MLB (soon)
      </Button>
    </SimpleGrid>
  );
}
