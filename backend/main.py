# main.py
from datetime import datetime
import numpy as np
from src.configs.paths import CSV, PROCESSED
from src.data.fetch_data       import fetch_regular_season_logs
from src.data.team_stats       import generate_team_season_stats
from src.data.team_utils       import standardize_team_names, extract_team_list
from src.data.team_rosters     import generate_current_team_rosters
from src.data.schedule         import fetch_schedule
from src.data.standings        import fetch_standings
from src.data.top_player_stats import get_top_player_stats_by_team
from src.utils.image_urls      import get_player_image_url
from src.data.player_stats import fetch_player_stats_per_game
from src.utils.nba_season import current_nba_season 

CURRENT_YEAR = datetime.now().year

def run_pipeline():
    PROCESSED.mkdir(parents=True, exist_ok=True)

    # Keep your historical game logs pipeline
    print("🏀 Fetching NBA game logs (regular season only)...")
    games = fetch_regular_season_logs(seasons=range(CURRENT_YEAR - 15, CURRENT_YEAR + 1))
    games = standardize_team_names(games)
    print("✅ Data pulled:", len(games), "games")

    # ----- core files -----
    team_stats = generate_team_season_stats(games)
    teams_df   = extract_team_list(games)

    team_stats.to_csv(CSV["nba_team_stats"], index=False)
    teams_df.to_csv(CSV["nba_teams"],       index=False)

    # ----- season string for "current season" endpoints -----
    season_str = current_nba_season()  # e.g., "2025-26"

    # ----- rosters (current season / current rosters) -----
    id_map = dict(zip(teams_df.TEAM_ID, teams_df.TEAM_NAME))
    rosters = generate_current_team_rosters(teams_df.TEAM_ID.tolist(), id_map)
    rosters.to_csv(CSV["nba_rosters"], index=False, encoding="utf-8")  # optional debug output

    # ----- player stats (league-wide per game) -----
    print(f"📊 Fetching player per-game stats for {season_str}...")
    player_stats = fetch_player_stats_per_game(season=season_str, season_type="Regular Season")

    # ----- master roster = roster bio + per-game stats -----
    # Merge on PLAYER_ID first; TEAM_ID should generally match but trades can cause edge cases.
    # If you prefer strict matching, change to on=["PLAYER_ID", "TEAM_ID"].
    master_roster = rosters.merge(
        player_stats,
        on=["PLAYER_ID"],   # safer across trade edge cases
        how="left",
        suffixes=("", "_STATS"),
    )

    # If merge brought in a duplicate TeamID column, drop it (do NOT overwrite TEAM_ID)
    if "TeamID" in master_roster.columns:
        master_roster = master_roster.drop(columns=["TeamID"])

    # If merge brought in TEAM_ID_STATS, drop it (roster TEAM_ID is source of truth)
    if "TEAM_ID_STATS" in master_roster.columns:
        master_roster = master_roster.drop(columns=["TEAM_ID_STATS"])

    # Ensure correct type (and safe if already int)
    master_roster["TEAM_ID"] = master_roster["TEAM_ID"].astype(int)

    # replace NaN/inf with None so JSON never breaks downstream
    master_roster = master_roster.replace([np.nan, np.inf, -np.inf], None)

    master_roster.to_csv(CSV["nba_roster_master"], index=False, encoding="utf-8")
    print("✅ Wrote:", CSV["nba_roster_master"].name)

    # ----- schedule & standings -----
    schedule = fetch_schedule(CURRENT_YEAR)
    schedule.to_csv(CSV["nba_games"], index=False)

    standings = fetch_standings(CURRENT_YEAR)
    standings.to_csv(CSV["nba_standings"], index=False)

    # ----- top players -----
    top = get_top_player_stats_by_team(season_str)
    top["PLAYER_IMAGE_URL"] = top["PLAYER_ID"].apply(get_player_image_url)
    top.to_csv(CSV["nba_top_players"], index=False)

    print("✅ Pipeline complete – all CSVs refreshed")

if __name__ == "__main__":
    run_pipeline()
