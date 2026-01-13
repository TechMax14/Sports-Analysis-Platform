import NbaHome from "./NbaHome/NbaHome"; // we’ll create this wrapper below

interface Props {
  selectedTool: string;
  selectedTeamId: number | null;
}

const ToolGrid = ({ selectedTool }: Props) => {
  if (selectedTool === "NBA Home") return <NbaHome />;
  if (selectedTool === "Today’s Trends")
    return <div>Coming Soon: Today’s Trends</div>;
  if (selectedTool === "League History")
    return <div>Coming Soon: Historic League Data</div>;
  return null;
};

export default ToolGrid;
