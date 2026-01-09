import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";
import { Grid, GridItem, Show } from "@chakra-ui/react";
import NavBar from "../components/NavBar";
import ToolGrid from "../components/ToolGrid";
import ToolSelector from "../components/ToolSelector";
import { useState } from "react";

export default function NbaShell() {
  const [selectedTool, setSelectedTool] = useState("NBA Home");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  return (
    <Tabs colorScheme="teal" size="md" variant="enclosed">
      <TabList px={4}>
        <Tab>NBA</Tab>
        <Tab isDisabled>NFL</Tab>
        <Tab isDisabled>MLB</Tab>
      </TabList>

      <TabPanels>
        <TabPanel p={0}>
          {/* your existing grid lives here */}
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
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
