# src/data/team_stats.py

import pandas as pd

def generate_team_season_stats(games_df):
    """Creates a row for each team-season with wins, losses, and average stats."""
    games_df["WIN"] = games_df["WL"] == "W"

    team_stats = (
        games_df
        .groupby(["TEAM_ID", "TEAM_NAME", "SEASON"])
        .agg(
            games_played=("GAME_ID", "count"),
            wins=("WIN", "sum"),
            losses=("WIN", lambda x: (~x).sum()),
            avg_pts=("PTS", "mean"),
            avg_ast=("AST", "mean"),
            avg_reb=("REB", "mean"),
            avg_fg_pct=("FG_PCT", "mean"),
            avg_fg3_pct=("FG3_PCT", "mean"),
            avg_ft_pct=("FT_PCT", "mean")
        )
        .reset_index()
    )

    # ✅ Convert FG%, 3P%, FT% from decimals to percentages
    team_stats["avg_fg_pct"] *= 100
    team_stats["avg_fg3_pct"] *= 100
    team_stats["avg_ft_pct"] *= 100

    return team_stats
