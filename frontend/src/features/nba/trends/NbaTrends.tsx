import { Card, CardBody, HStack, Stack, Text } from "@chakra-ui/react";
import PlayerGameTrendWidget from "./widgets/PlayerGameTrendWidget";
import MatchupInsightsWidget from "./widgets/MatchupInsightsWidget";

export default function NbaTrends() {
  return (
    <Stack spacing={6}>
      <div>
        <Text fontSize="2xl" fontWeight="bold" color="white">
          Today’s Trends
        </Text>
        <Text color="whiteAlpha.800">
          Player trends + matchup dashboards (more widgets coming).
        </Text>
      </div>

      {/* Put widgets side-by-side */}
      <HStack align="start" spacing={6}>
        <PlayerGameTrendWidget />
        <MatchupInsightsWidget />
      </HStack>

      <Card bg="gray.800" borderRadius="xl" boxShadow="lg">
        <CardBody>
          <Text color="white" fontWeight="bold">
            More widgets coming
          </Text>
          <Text color="whiteAlpha.700">
            Team streaks, matchup trends, home/away splits, and more.
          </Text>
        </CardBody>
      </Card>
    </Stack>
  );
}
