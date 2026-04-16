import { VStack, Button } from "@chakra-ui/react";

interface Props {
  selectedTool: string;
  onSelectTool: (tool: string) => void;
}

const tools = ["NBA Home", "Today's Trends", "League History"];

const ToolSelector = ({ selectedTool, onSelectTool }: Props) => {
  return (
    <VStack align="stretch" spacing={3}>
      {tools.map((tool) => (
        <Button
          key={tool}
          variant={tool === selectedTool ? "solid" : "ghost"}
          colorScheme="teal"
          onClick={() => onSelectTool(tool)}
          justifyContent="flex-start"
        >
          {tool}
        </Button>
      ))}
    </VStack>
  );
};

export default ToolSelector;
