import {
  HStack,
  Button,
  Grid,
  GridItem,
  Show,
  VStack,
  Text,
  Box,
  Image,
} from "@chakra-ui/react";
import { useState } from "react";
import MlbHome from "../home/MlbHome";
import ColorModeSwitch from "../../../shared/components/ColorModeSwitch";
import logo from "../../../assets/MLBlogo.png";

export default function MlbShell() {
  const [selectedTool, setSelectedTool] = useState("MLB Home");

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
              MLB Analysis Tool
            </Text>
          </HStack>

          <ColorModeSwitch />
        </HStack>
      </GridItem>

      <Show above="lg">
        <GridItem area="sidepan" bg="gray.800" px={5} py={4}>
          <VStack align="stretch" spacing={3}>
            {["MLB Home", "Today's Trends", "Advanced Metrics"].map((tool) => (
              <Button
                key={tool}
                variant={tool === selectedTool ? "solid" : "ghost"}
                colorScheme="teal"
                onClick={() => setSelectedTool(tool)}
                justifyContent="flex-start"
              >
                {tool}
              </Button>
            ))}
          </VStack>
        </GridItem>
      </Show>

      <GridItem area="main" bg="gray.700" p={6} overflowY="auto">
        {selectedTool === "MLB Home" && <MlbHome />}
        {selectedTool === "Today's Trends" && (
          <Box color="gray.300">Coming soon: MLB Today&apos;s Trends</Box>
        )}
        {selectedTool === "Advanced Metrics" && (
          <Box color="gray.300">Coming soon: MLB Advanced Metrics</Box>
        )}
      </GridItem>
    </Grid>
  );
}
