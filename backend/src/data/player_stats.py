# backend/src/data/player_stats.py
from __future__ import annotations

import pandas as pd
from nba_api.stats.endpoints import leaguedashplayerstats

from src.utils.nba_season import current_nba_season


def fetch_player_stats_per_game(
    season: str | None = None,
    season_type: str = "Regular Season",
) -> pd.DataFrame:
    """
    Fetch league-wide player per-game stats for the given NBA season and season type.

    Returns a DataFrame with stable join keys:
      - PLAYER_ID
      - TEAM_ID

    And common per-game fields (per NBA API output):
      - GP, MIN
      - PTS, REB, AST, STL, BLK, TOV
      - FG_PCT, FG3_PCT, FT_PCT

    Notes:
    - Uses nba_api LeaguedashPlayerStats (single request) for speed/reliability.
    - Keeps only the columns we need for roster enrichment.
    """
    season = season or current_nba_season()

    # nba_api returns totals + rate stats, but these columns are already PER GAME
    # (PTS, REB, AST, etc. are per game for this endpoint).
    resp = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star=season_type,
        per_mode_detailed="PerGame",
        # You can add more filters later (measure_type, date_from/to, etc.)
    )

    df = resp.get_data_frames()[0]
    if df.empty:
        return df

    # Normalize column names we care about
    keep = [
        "PLAYER_ID",
        "PLAYER_NAME",
        "TEAM_ID",
        "TEAM_ABBREVIATION",
        "GP",
        "MIN",
        "PTS",
        "REB",
        "AST",
        "STL",
        "BLK",
        "TOV",
        "FG_PCT",
        "FG3_PCT",
        "FT_PCT",
    ]
    # Some seasons/endpoints can omit a column; keep only those present
    keep = [c for c in keep if c in df.columns]
    df = df[keep].copy()

    # Helpful metadata columns (optional)
    df["SEASON"] = int(season.split("-")[0])  # "2025-26" -> 2025
    df["SEASON_TYPE"] = season_type

    # Ensure types are merge-friendly
    df["PLAYER_ID"] = df["PLAYER_ID"].astype(int)
    df["TEAM_ID"] = df["TEAM_ID"].astype(int)

    # Replace NaNs with None-friendly values later (Flask can handle NaN removal too)
    return df
