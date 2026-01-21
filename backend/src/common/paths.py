# src/common/paths.py
from pathlib import Path

DATA_ROOT = Path(__file__).resolve().parent.parent.parent / "data"

NBA_PROCESSED = DATA_ROOT / "nba" / "processed"
NBA_PROCESSED.mkdir(parents=True, exist_ok=True)

CSV = {
    # NBA
    "nba_games": NBA_PROCESSED / "games.csv",
    "nba_standings": NBA_PROCESSED / "standings.csv",
    "nba_team_stats": NBA_PROCESSED / "team_stats.csv",
    "nba_teams": NBA_PROCESSED / "teams.csv",
    "nba_rosters": NBA_PROCESSED / "rosters.csv",
    "nba_roster_master": NBA_PROCESSED / "roster_master.csv",
    "nba_top_players": NBA_PROCESSED / "top_players.csv",
    "nba_player_game_logs": NBA_PROCESSED / "player_game_logs.csv",
}
