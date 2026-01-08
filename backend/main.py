# main.py

from src.data.fetch_data import fetch_regular_season_logs
from src.data.team_stats import generate_team_season_stats
from src.data.team_utils import standardize_team_names, extract_team_list
from src.data.team_rosters import generate_current_team_rosters
from src.data.top_player_stats import get_top_player_stats_by_team
from src.utils.image_urls import get_player_image_url
import os
from datetime import datetime

current_year = datetime.now().year

def run_pipeline():
    print("🏀 Fetching NBA game logs (regular season only)...")
    all_games = fetch_regular_season_logs(seasons=range(current_year - 15, current_year + 1))
    print("✅ Data pulled:", len(all_games), "games")

    os.makedirs("data/processed", exist_ok=True)

    # Standardize names
    all_games = standardize_team_names(all_games)

    print("📋 Available columns:", all_games.columns.tolist())
    #--- Save team stats ---
    print("📊 Generating team season stats...")
    team_stats = generate_team_season_stats(all_games)
    team_stats.to_csv("data/processed/team_stats_by_season.csv", index=False)
    print("📁 Team stats saved to team_stats_by_season.csv")

    # Extract team list
    teams_df = extract_team_list(all_games)
    teams_df.to_csv("data/processed/teams.csv", index=False)
    print("📁 Team list saved to teams.csv")

    # Generate TEAM_ID → TEAM_NAME mapping
    team_id_to_name = dict(zip(teams_df["TEAM_ID"], teams_df["TEAM_NAME"]))

    # --- Generate and save current season team rosters ---
    print("🧑‍🤝‍🧑 Fetching current rosters...")
    rosters_df = generate_current_team_rosters(
        team_ids=teams_df["TEAM_ID"].tolist(),
        team_id_to_name=team_id_to_name
    )   
    rosters_df.to_csv("data/processed/rosters.csv", index=False, encoding="utf-8")
    print("📁 Rosters saved to rosters.csv")


    # --- Get top players by stat using season averages
    # Create season string: "2024-25"
    season_str = f"{current_year - 1}-{str(current_year)[-2:]}"
    print(f"🏆 Getting top players by stat for season {season_str}...")

    top_players_df = get_top_player_stats_by_team(season_str)
    top_players_df['PLAYER_IMAGE_URL'] = top_players_df['PLAYER_ID'].apply(get_player_image_url)
    top_players_df.to_csv("data/processed/top_player_stats.csv", index=False)
    print("📁 Top player stats saved to top_player_stats.csv")

if __name__ == "__main__":
    run_pipeline()
