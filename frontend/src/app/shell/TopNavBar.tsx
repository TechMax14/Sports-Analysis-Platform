import { HStack, Button } from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";

export default function TopNavBar() {
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <HStack bg="gray.900" px={4} py={2} spacing={4}>
      <Button
        as={Link}
        to="/"
        variant={isActive("/") ? "solid" : "ghost"}
        colorScheme="teal"
      >
        Home
      </Button>

      <Button
        as={Link}
        to="/nba"
        variant={isActive("/nba") ? "solid" : "ghost"}
        colorScheme="teal"
      >
        NBA
      </Button>

      <Button
        as={Link}
        to="/mlb"
        variant={isActive("/mlb") ? "solid" : "ghost"}
        colorScheme="teal"
      >
        MLB
      </Button>

      <Button
        as={Link}
        to="/nfl"
        variant={isActive("/nfl") ? "solid" : "ghost"}
        colorScheme="teal"
      >
        NFL
      </Button>

      <Button
        as={Link}
        to="/nhl"
        variant={isActive("/nhl") ? "solid" : "ghost"}
        colorScheme="teal"
      >
        NHL
      </Button>
    </HStack>
  );
}
