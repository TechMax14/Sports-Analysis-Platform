import { Grid, GridItem, Show, HStack, Image, Text } from "@chakra-ui/react";
import ToolGrid from "../../../app/shell/ToolGrid";
import ToolSelector from "../../../app/shell/ToolSelector";
import { useState } from "react";
import ColorModeSwitch from "../../../shared/components/ColorModeSwitch";
import logo from "../../../assets/NBAlogo.png";

export default function NbaShell() {
  const [selectedTool, setSelectedTool] = useState("NBA Home");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  return (
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
        <HStack justify="space-between" align="center" px={2}>
          <HStack spacing={4}>
            <Image src={logo} boxSize="60px" borderRadius="md" />
            <Text
              fontSize="2xl"
              fontWeight="bold"
              fontFamily="heading"
              color="teal.500"
            >
              NBA Analysis Tool
            </Text>
          </HStack>

          <ColorModeSwitch />
        </HStack>
      </GridItem>

      <Show above="lg">
        <GridItem area="sidepan" bg="gray.800" px={5} py={4}>
          <ToolSelector
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
          />
        </GridItem>
      </Show>

      <GridItem area="main" bg="gray.700" p={6} overflowY="auto">
        <ToolGrid selectedTool={selectedTool} selectedTeamId={selectedTeamId} />
      </GridItem>
    </Grid>
  );
}
