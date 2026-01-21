# src/configs/paths.py
from pathlib import Path

PROCESSED = Path(__file__).resolve().parent.parent.parent / "data" / "processed"
PROCESSED.mkdir(parents=True, exist_ok=True)

CSV = {
  "nba_games": PROCESSED / "nba_games.csv",
  "nba_standings": PROCESSED / "nba_standings.csv",
  "nba_team_stats": PROCESSED / "nba_team_stats.csv",
  "nba_teams": PROCESSED / "nba_teams.csv",
  "nba_rosters": PROCESSED / "nba_rosters.csv",
  "nba_roster_master": PROCESSED / "nba_roster_master.csv",
  "nba_top_players": PROCESSED / "nba_top_player_stats.csv",
}