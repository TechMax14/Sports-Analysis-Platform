from nba_api.stats.endpoints import leaguegamelog
import pandas as pd
import time

def fetch_regular_season_logs(seasons, sleep_sec=1.0):
    """
    Fetch regular season game logs for all teams using LeagueGameLog.
    Extract SEASON_START_YEAR from SEASON_ID.
    """
    all_games = []

    for season in seasons:
        season_str = f"{season-1}-{str(season)[-2:]}"  # e.g. 2024 -> "2023-24"
        print(f"📅 Fetching season {season_str}...")

        try:
            logs = leaguegamelog.LeagueGameLog(
                season=season_str,
                season_type_all_star="Regular Season"
            )
            df = logs.get_data_frames()[0]

            # Keep only regular season games based on SEASON_ID
            df = df[df["SEASON_ID"].astype(str).str.startswith("2")].copy()

            # Extract SEASON_START_YEAR from SEASON_ID (e.g. 22024 -> 2024)
            df["SEASON"] = df["SEASON_ID"].astype(str).str[1:].astype(int)

            all_games.append(df)
            time.sleep(sleep_sec)

        except Exception as e:
            print(f"❌ Failed to fetch {season_str}: {e}")

    return pd.concat(all_games, ignore_index=True)
