import { Grid, GridItem, HStack, Show } from "@chakra-ui/react";
import NavBar from "./components/NavBar";
import ToolGrid from "./components/ToolGrid";
import ToolSelector from "./components/ToolSelector";
import { useState } from "react";

function App() {
  const [selectedTool, setSelectedTool] = useState("Team Info");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  return (
    <Grid
      templateAreas={{
        base: `"nav" "main"`,
        lg: `"nav nav" "sidepan main"`,
      }}
      templateRows={{
        base: "auto 1fr", // navbar takes auto height, main fills the rest
        lg: "auto 1fr",
      }}
      templateColumns={{
        base: "1fr",
        lg: "200px 1fr",
      }}
      height="100vh" //
    >
      <GridItem area="nav" bg="gray.900" padding={3}>
        <NavBar />
      </GridItem>

      <Show above="lg">
        <GridItem area="sidepan" bg="gray.800" paddingX={5} paddingY={4}>
          <ToolSelector
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
            onSelectTeamId={setSelectedTeamId}
          />
        </GridItem>
      </Show>

      <GridItem area="main" bg="gray.700" padding={6} overflowY="auto">
        <ToolGrid selectedTool={selectedTool} selectedTeamId={selectedTeamId} />
      </GridItem>
    </Grid>
  );
}

export default App;
