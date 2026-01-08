import TeamInfoTool from "./TeamInfoTool/TITindex";

interface Props {
  selectedTool: string;
  selectedTeamId: number | null;
}

const ToolGrid = ({ selectedTool, selectedTeamId }: Props) => {
  if (selectedTool === "Team Info") return <TeamInfoTool />;
  if (selectedTool === "Matchup History")
    return <div>Coming Soon: Matchup History</div>;
  if (selectedTool === "Forecasting")
    return <div>Coming Soon: Forecasting Tool</div>;
  return null;
};

export default ToolGrid;
