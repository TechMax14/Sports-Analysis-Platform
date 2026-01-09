import { HStack, Button } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import { Grid, GridItem, Show } from "@chakra-ui/react";
import NavBar from "../components/NavBar";
import ToolGrid from "../components/ToolGrid";
import ToolSelector from "../components/ToolSelector";
import { useState } from "react";

export default function NbaShell() {
  const [selectedTool, setSelectedTool] = useState("NBA Home");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  return (
    <>
      {/* Top nav */}
      <HStack bg="gray.900" px={4} py={2} spacing={2}>
        <NavLink to="/">
          {({ isActive }) => (
            <Button size="sm" variant={isActive ? "solid" : "ghost"}>
              Home
            </Button>
          )}
        </NavLink>

        <NavLink to="/nba">
          {({ isActive }) => (
            <Button size="sm" variant={isActive ? "solid" : "ghost"}>
              NBA
            </Button>
          )}
        </NavLink>

        <NavLink to="/nfl">
          {({ isActive }) => (
            <Button size="sm" variant={isActive ? "solid" : "ghost"}>
              NFL
            </Button>
          )}
        </NavLink>

        <NavLink to="/mlb">
          {({ isActive }) => (
            <Button size="sm" variant={isActive ? "solid" : "ghost"}>
              MLB
            </Button>
          )}
        </NavLink>

        <NavLink to="/nhl">
          {({ isActive }) => (
            <Button size="sm" variant={isActive ? "solid" : "ghost"}>
              NHL
            </Button>
          )}
        </NavLink>
      </HStack>

      {/* Existing layout */}
      <Grid
        templateAreas={{
          base: `"nav" "main"`,
          lg: `"nav nav" "sidepan main"`,
        }}
        templateRows={{ base: "auto 1fr", lg: "auto 1fr" }}
        templateColumns={{ base: "1fr", lg: "200px 1fr" }}
        h="100vh"
      >
        <GridItem area="nav" bg="gray.900" px={3} py={3}>
          <NavBar />
        </GridItem>

        <Show above="lg">
          <GridItem area="sidepan" bg="gray.800" px={5} py={4}>
            <ToolSelector
              selectedTool={selectedTool}
              onSelectTool={setSelectedTool}
              onSelectTeamId={setSelectedTeamId}
            />
          </GridItem>
        </Show>

        <GridItem area="main" bg="gray.700" p={6} overflowY="auto">
          <ToolGrid
            selectedTool={selectedTool}
            selectedTeamId={selectedTeamId}
          />
        </GridItem>
      </Grid>
    </>
  );
}
