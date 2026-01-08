import pandas as pd
from nba_api.stats.endpoints import leaguedashplayerstats
from src.configs.constants import PLAYER_ID_FIXES

def get_top_player_stats_by_team(season: str) -> pd.DataFrame:
    """
    Returns the top scorer, passer, and rebounder for each team (based on per-game averages).
    :param season: Season string in format '2023-24'
    :return: DataFrame with top players by PTS, AST, REB for each team
    """
    print(f"📊 Fetching player season averages for {season}...")

    # Fetch season averages
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star="Regular Season",
        per_mode_detailed="PerGame",
        measure_type_detailed_defense="Base",
        plus_minus="N",
        pace_adjust="N",
        rank="N"
    )

    df = stats.get_data_frames()[0]

    # Select necessary columns
    df = df[['PLAYER_ID', 'PLAYER_NAME', 'TEAM_ID', 'TEAM_ABBREVIATION', 'PTS', 'AST', 'REB']]

    # Apply name fixes
    df["PLAYER_NAME"] = df.apply(
        lambda row: PLAYER_ID_FIXES.get(row["PLAYER_ID"], row["PLAYER_NAME"]), axis=1
    )

    # Get top players by stat for each team
    top_players = []

    for team in df['TEAM_ABBREVIATION'].unique():
        team_players = df[df['TEAM_ABBREVIATION'] == team]

        for stat in ['PTS', 'AST', 'REB']:
            top_row = team_players.loc[team_players[stat].idxmax()]
            top_players.append({
                'TEAM_ABBREVIATION': team,
                'PLAYER_ID': top_row['PLAYER_ID'],
                'PLAYER_NAME': top_row['PLAYER_NAME'],
                'STAT': stat,
                'VALUE': round(top_row[stat], 1),
                'SEASON': season
            })

    return pd.DataFrame(top_players)
