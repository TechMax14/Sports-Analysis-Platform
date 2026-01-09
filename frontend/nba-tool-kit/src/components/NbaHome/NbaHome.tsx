import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";
import TodayTab from "./TodayTab";
import ScheduleTab from "./ScheduleTab";
import StandingsTab from "./StandingsTab";
import TeamsTab from "./TeamsTab";
import LeadersTab from "./StatLeadersTab";

export default function NbaHome() {
  return (
    <Tabs colorScheme="teal" isFitted isLazy defaultIndex={0}>
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
