import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import MlbTodayTab from "./tabs/MlbTodayTab";
import MlbScheduleTab from "./tabs/MlbScheduleTab";
import MlbStandingsTab from "./tabs/MlbStandingsTab";
import MlbTeamsTab from "./tabs/MlbTeamsTab";
import MlbLeadersTab from "./tabs/MlbLeadersTab";

const TAB_KEYS = [
  "today",
  "schedule",
  "standings",
  "teams",
  "leaders",
] as const;

export default function MlbHome() {
  const [params, setParams] = useSearchParams();

  const tabIndex = useMemo(() => {
    const tab = (params.get("tab") || "today").toLowerCase();
    const idx = TAB_KEYS.indexOf(tab as any);
    return idx === -1 ? 0 : idx;
  }, [params]);

  const onTabChange = (idx: number) => {
    const key = TAB_KEYS[idx] || "today";
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
        <Tab>Today&apos;s Games</Tab>
        <Tab>Schedule</Tab>
        <Tab>Standings</Tab>
        <Tab>Teams</Tab>
        <Tab>Stat Leaders</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
          <MlbTodayTab />
        </TabPanel>
        <TabPanel>
          <MlbScheduleTab />
        </TabPanel>
        <TabPanel>
          <MlbStandingsTab />
        </TabPanel>
        <TabPanel>
          <MlbTeamsTab />
        </TabPanel>
        <TabPanel>
          <MlbLeadersTab />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
