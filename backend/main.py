# main.py
from datetime import datetime
from src.configs.paths import CSV, PROCESSED   # <-- new
from src.data.fetch_data       import fetch_regular_season_logs
from src.data.team_stats       import generate_team_season_stats
from src.data.team_utils       import standardize_team_names, extract_team_list
from src.data.team_rosters     import generate_current_team_rosters
from src.data.schedule         import fetch_schedule  
from src.data.standings        import fetch_standings  
from src.data.top_player_stats import get_top_player_stats_by_team
from src.utils.image_urls      import get_player_image_url

CURRENT_YEAR = datetime.now().year
SEASON_STR   = f"{CURRENT_YEAR - 1}-{str(CURRENT_YEAR)[2:]}"

def run_pipeline():
    PROCESSED.mkdir(parents=True, exist_ok=True)
    print("🏀 Fetching NBA game logs (regular season only)...")
    games = fetch_regular_season_logs(seasons=range(CURRENT_YEAR - 15, CURRENT_YEAR + 1))
    games = standardize_team_names(games)
    print("✅ Data pulled:", len(games), "games")

    # ----- core files -----
    team_stats = generate_team_season_stats(games)
    teams_df   = extract_team_list(games)

    team_stats.to_csv(CSV["nba_team_stats"], index=False)
    teams_df.to_csv(CSV["nba_teams"],       index=False)

    # ----- rosters -----
    id_map = dict(zip(teams_df.TEAM_ID, teams_df.TEAM_NAME))
    rosters = generate_current_team_rosters(teams_df.TEAM_ID.tolist(), id_map)
    rosters.to_csv(CSV["nba_rosters"], index=False, encoding="utf-8")

    # ----- schedule & standings -----
    schedule  = fetch_schedule(CURRENT_YEAR)
    schedule.to_csv(CSV["nba_games"], index=False)

    standings = fetch_standings(CURRENT_YEAR)
    standings.to_csv(CSV["nba_standings"], index=False)

    # ----- top players -----
    top = get_top_player_stats_by_team(SEASON_STR)
    top["PLAYER_IMAGE_URL"] = top["PLAYER_ID"].apply(get_player_image_url)
    top.to_csv(CSV["nba_top_players"], index=False)

    print("✅ Pipeline complete – all CSVs refreshed")

if __name__ == "__main__":
    run_pipeline()