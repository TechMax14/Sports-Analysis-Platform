from __future__ import annotations

import pandas as pd


BATTING_STATS = {
    "AVG": "Batting Average",
    "OBP": "On-Base Percentage",
    "SLG": "Slugging Percentage",
    "OPS": "OPS",
    "HR": "Home Runs",
    "RBI": "Runs Batted In",
    "SB": "Stolen Bases",
}

PITCHING_STATS = {
    "ERA": "ERA",
    "WHIP": "WHIP",
    "W": "Wins",
    "SV": "Saves",
    "SO": "Strikeouts",
}

ASCENDING_STATS = {"ERA", "WHIP"}  # lower is better


def _to_numeric(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    out = df.copy()
    for col in cols:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce")
    return out


def _build_leader_rows(
    df: pd.DataFrame,
    category: str,
    stat_map: dict[str, str],
    ascending_stats: set[str],
    top_n: int,
    season: int | None = None,
) -> list[dict]:
    rows: list[dict] = []

    for stat_code, stat_label in stat_map.items():
        if stat_code not in df.columns:
            continue

        stat_df = df[df[stat_code].notna()].copy()
        if stat_df.empty:
            continue

        ascending = stat_code in ascending_stats
        stat_df = stat_df.sort_values(stat_code, ascending=ascending).head(top_n).reset_index(drop=True)

        for i, (_, row) in enumerate(stat_df.iterrows(), start=1):
            rows.append(
                {
                    "CATEGORY": category,
                    "STAT_CODE": stat_code,
                    "STAT_LABEL": stat_label,
                    "RANK": i,
                    "PLAYER_ID": row.get("PLAYER_ID"),
                    "PLAYER_NAME": row.get("PLAYER_NAME"),
                    "TEAM_ID": row.get("TEAM_ID"),
                    "TEAM_NAME": row.get("TEAM_NAME"),
                    "POSITION_GROUP": row.get("POSITION_GROUP"),
                    "STAT_VALUE": row.get(stat_code),
                    "SEASON": season,
                }
            )

    return rows


def build_mlb_leaders(roster_master_df: pd.DataFrame, season: int | None = None, top_n: int = 10) -> pd.DataFrame:
    df = roster_master_df.copy()

    numeric_cols = [
        "AB", "AVG", "OBP", "SLG", "OPS", "HR", "RBI", "SB",
        "IP", "ERA", "WHIP", "W", "SV", "SO"
    ]
    df = _to_numeric(df, numeric_cols)

    # Batting pool
    batting_df = df[df["POSITION_GROUP"].isin(["Hitter", "Two-Way"])].copy()
    batting_df = batting_df[batting_df["AB"].fillna(0) >= 10]

    # Pitching pool
    pitching_df = df[df["POSITION_GROUP"].isin(["Pitcher", "Two-Way"])].copy()
    pitching_df = pitching_df[pitching_df["IP"].fillna(0) >= 5]

    rows: list[dict] = []
    rows.extend(
        _build_leader_rows(
            batting_df,
            category="Batting",
            stat_map=BATTING_STATS,
            ascending_stats=ASCENDING_STATS,
            top_n=top_n,
            season=season,
        )
    )
    rows.extend(
        _build_leader_rows(
            pitching_df,
            category="Pitching",
            stat_map=PITCHING_STATS,
            ascending_stats=ASCENDING_STATS,
            top_n=top_n,
            season=season,
        )
    )

    leaders_df = pd.DataFrame(rows)

    if not leaders_df.empty:
        leaders_df = leaders_df.sort_values(
            ["CATEGORY", "STAT_CODE", "RANK", "PLAYER_NAME"]
        ).reset_index(drop=True)

    return leaders_df