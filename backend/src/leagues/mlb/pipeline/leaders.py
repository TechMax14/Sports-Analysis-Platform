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
    "IP": "Innings Pitched",
    "W": "Wins",
    "SV": "Saves",
    "SO": "Strikeouts",
}

ASCENDING_STATS = {"ERA", "WHIP"}  # lower is better

BATTING_RATE_STATS = {"AVG", "OBP", "SLG", "OPS"}
PITCHING_RATE_STATS = {"ERA", "WHIP"}


def _to_numeric(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    out = df.copy()
    for col in cols:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce")
    return out


def _add_team_games_estimate(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    if "TEAM_ID" not in out.columns:
        out["TEAM_GAMES"] = None
        return out

    if "G_HIT" not in out.columns:
        out["G_HIT"] = pd.NA
    if "G_PIT" not in out.columns:
        out["G_PIT"] = pd.NA

    out["G_HIT"] = pd.to_numeric(out["G_HIT"], errors="coerce")
    out["G_PIT"] = pd.to_numeric(out["G_PIT"], errors="coerce")

    team_games = (
        out.groupby("TEAM_ID")[["G_HIT", "G_PIT"]]
        .max()
        .max(axis=1)
        .rename("TEAM_GAMES")
        .reset_index()
    )

    out = out.merge(team_games, on="TEAM_ID", how="left")
    return out


def _eligible_for_stat(stat_df: pd.DataFrame, stat_code: str) -> pd.DataFrame:
    """
    Apply eligibility rules only to the relevant percentage/rate stats.
    """
    out = stat_df.copy()

    if stat_code in BATTING_RATE_STATS:
        # MLB-qualified style approximation: 3.1 PA per team game
        out = out[out["PA"].fillna(0) >= (3.1 * out["TEAM_GAMES"].fillna(0))]

    elif stat_code in PITCHING_RATE_STATS:
        # Qualified pitchers: at least 1 IP per team game
        out = out[out["IP"].fillna(0) >= out["TEAM_GAMES"].fillna(0)]

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

        stat_df = _eligible_for_stat(stat_df, stat_code)
        if stat_df.empty:
            continue

        ascending = stat_code in ascending_stats
        stat_df = (
            stat_df.sort_values(stat_code, ascending=ascending)
            .head(top_n)
            .reset_index(drop=True)
        )

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


def build_mlb_leaders(
    roster_master_df: pd.DataFrame,
    season: int | None = None,
    top_n: int = 10,
) -> pd.DataFrame:
    df = roster_master_df.copy()

    numeric_cols = [
        "PA",
        "AB",
        "AVG",
        "OBP",
        "SLG",
        "OPS",
        "HR",
        "RBI",
        "SB",
        "G_HIT",
        "G_PIT",
        "IP",
        "ERA",
        "WHIP",
        "W",
        "SV",
        "SO",
    ]
    df = _to_numeric(df, numeric_cols)
    df = _add_team_games_estimate(df)

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