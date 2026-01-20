import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TodayTab from "./tabs/TodayTab";
import ScheduleTab from "./tabs/ScheduleTab";
import StandingsTab from "./tabs/StandingsTab";
import TeamsTab from "./tabs/TeamsTab";
import LeadersTab from "./tabs/StatLeadersTab";

const TAB_KEYS = [
  "matchups",
  "schedule",
  "standings",
  "teams",
  "leaders",
] as const;

export default function NbaHome() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const tabIndex = useMemo(() => {
    const tab = (params.get("tab") || "matchups").toLowerCase();
    const idx = TAB_KEYS.indexOf(tab as any);
    return idx === -1 ? 0 : idx;
  }, [params]);

  const onTabChange = (idx: number) => {
    const key = TAB_KEYS[idx] || "matchups";

    // preserve teamId if present (so switching tabs doesn't erase it)
    const teamId = params.get("teamId");
    const next: Record<string, string> = { tab: key };
    if (teamId) next.teamId = teamId;

    setParams(next, { replace: true });
  };

  return (
    <Tabs
      colorScheme="teal"
      isFitted
      isLazy
      index={tabIndex}
      onChange={onTabChange}
    >
      <TabList>
        <Tab>Matchups</Tab>
        <Tab>Schedule</Tab>
        <Tab>Standings</Tab>
        <Tab>Teams</Tab>
        <Tab>Stat Leaders</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <TodayTab />
        </TabPanel>
        <TabPanel>
          <ScheduleTab />
        </TabPanel>
        <TabPanel>
          <StandingsTab />
        </TabPanel>
        <TabPanel>
          <TeamsTab />
        </TabPanel>
        <TabPanel>
          <LeadersTab />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
