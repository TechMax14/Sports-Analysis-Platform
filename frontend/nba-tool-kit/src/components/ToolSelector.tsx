import { VStack, Button } from "@chakra-ui/react";

interface Props {
  selectedTool: string;
  onSelectTool: (tool: string) => void;
  onSelectTeamId: (teamId: number | null) => void;
}

const tools = ["Team Info", "Matchup History", "Forecasting"];

const ToolSelector = ({ selectedTool, onSelectTool }: Props) => {
  return (
    <VStack align="stretch" spacing={3}>
      {tools.map((tool) => (
        <Button
          key={tool}
          variant={tool === selectedTool ? "solid" : "ghost"}
          colorScheme="teal"
          onClick={() => onSelectTool(tool)}
        >
          {tool}
        </Button>
      ))}
    </VStack>
  );
};

export default ToolSelector;
