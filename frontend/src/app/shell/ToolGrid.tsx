import NbaHome from "../../features/nba/home/NbaHome"; // we’ll create this wrapper below
import NbaTrends from "../../features/nba/trends/NbaTrends";

interface Props {
  selectedTool: string;
  selectedTeamId: number | null;
}

const ToolGrid = ({ selectedTool }: Props) => {
  if (selectedTool === "NBA Home") return <NbaHome />;
  if (selectedTool === "Today’s Trends") return <NbaTrends />;
  if (selectedTool === "League History")
    return <div>Coming Soon: Historic League Data</div>;
  return null;
};

export default ToolGrid;
