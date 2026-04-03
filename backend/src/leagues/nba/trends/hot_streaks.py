from __future__ import annotations

import os
from typing import Any, Dict, List, Literal

import pandas as pd

from src.common.paths import CSV
from src.leagues.nba.api.nba_data import load_master_roster_df

StatKey = Literal["PTS", "REB", "AST", "FG3M", "BLK", "STL"]

THRESHOLDS: Dict[StatKey, List[int]] = {
    "PTS": [5, 10, 15, 20, 25, 30, 35],
    "REB": [4, 6, 8, 10, 12],
    "AST": [2, 4, 6, 8, 10],
    "FG3M": [1, 2, 3, 4, 5],
    "BLK": [1, 2, 3, 4],
    "STL": [1, 2, 3, 4],
}

_LOGS_CACHE: Dict[str, Any] = {"path": None, "mtime": None, "df": None}


def _load_csv_cached(cache: Dict[str, Any], path: str) -> pd.DataFrame:
    mtime = os.path.getmtime(path)
    if cache["df"] is None or cache["path"] != path or cache["mtime"] != mtime:
        cache["df"] = pd.read_csv(path)
        cache["path"] = path
        cache["mtime"] = mtime
    return cache["df"].copy()


def load_player_logs_df() -> pd.DataFrame:
    path = str(CSV["nba_player_game_logs"])
    df = _load_csv_cached(_LOGS_CACHE, path)

    if "GAME_DATE" in df.columns:
        df["GAME_DATE"] = pd.to_datetime(df["GAME_DATE"], errors="coerce")

    for col in ["PLAYER_ID", "TEAM_ID", "PTS", "REB", "AST", "FG3M", "BLK", "STL"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


def _team_abbr_col(df: pd.DataFrame) -> str | None:
    for col in ["TEAM_ABBREVIATION", "TEAM_SHORT_NAME"]:
        if col in df.columns:
            return col
    return None


def _current_team_logs(
    logs: pd.DataFrame,
    *,
    player_id: int,
    team_id: int | None,
    team_abbr: str | None,
) -> pd.DataFrame:
    out = logs[logs["PLAYER_ID"] == player_id].copy()

    if team_id is not None and "TEAM_ID" in out.columns:
        out = out[out["TEAM_ID"] == team_id]

    if team_abbr:
        log_team_abbr_col = _team_abbr_col(out)
        if log_team_abbr_col:
            out = out[out[log_team_abbr_col].astype(str) == str(team_abbr)]

    if "GAME_DATE" in out.columns:
        sort_cols = ["GAME_DATE"]
        if "GAME_ID" in out.columns:
            sort_cols.append("GAME_ID")
        out = out.sort_values(sort_cols, ascending=[False] * len(sort_cols))

    return out


def _get_nearest_thresholds(avg: float, thresholds: list[int]) -> list[int]:
    below = next((t for t in sorted(thresholds, reverse=True) if t <= avg), thresholds[0])
    above = next((t for t in sorted(thresholds) if t >= avg), thresholds[-1])
    return list(dict.fromkeys([below, above]))


def _compute_active_streak(values: list[float], threshold: int) -> int:
    streak = 0
    for value in values:
        if float(value) >= threshold:
            streak += 1
        else:
            break
    return streak


def _compute_hit_count(values: list[float], threshold: int) -> int:
    return sum(1 for value in values if float(value) >= threshold)


def _is_player_active(
    latest_league_date: pd.Timestamp | None,
    last_game_date: pd.Timestamp | None,
    *,
    inactive_days: int,
) -> bool:
    if latest_league_date is None or pd.isna(latest_league_date):
        return True
    if last_game_date is None or pd.isna(last_game_date):
        return False
    return (latest_league_date - last_game_date).days <= inactive_days


def _parse_window(window: str) -> int | None:
    s = str(window).strip().lower()
    if s == "season":
        return None
    try:
        n = int(s)
        return n if n > 0 else 10
    except Exception:
        return 10


def get_hot_streaks_payload(
    *,
    team_id: int | None = None,
    stat: StatKey = "PTS",
    threshold: int | None = None,
    team_window: str = "10",
    include_inactive: bool = False,
    inactive_days: int = 10,
    leader_hit_window: int = 10,
) -> dict[str, Any]:
    roster = load_master_roster_df()
    logs = load_player_logs_df()

    roster_team_abbr_col = _team_abbr_col(roster)
    latest_league_date = logs["GAME_DATE"].max() if "GAME_DATE" in logs.columns and not logs.empty else None

    if stat not in THRESHOLDS:
        stat = "PTS"

    valid_thresholds = THRESHOLDS[stat]
    if threshold is None:
        threshold = valid_thresholds[0]
    try:
        threshold = int(threshold)
    except Exception:
        threshold = valid_thresholds[0]

    if threshold not in valid_thresholds:
        threshold = min(valid_thresholds, key=lambda x: abs(x - threshold))

    team_window_n = _parse_window(team_window)

    category_leaders: list[dict[str, Any]] = []

    for leader_stat in THRESHOLDS.keys():
        candidates: list[dict[str, Any]] = []

        for row in roster.itertuples(index=False):
            player_id = int(getattr(row, "PLAYER_ID", 0) or 0)
            if not player_id:
                continue

            avg = float(pd.to_numeric(getattr(row, leader_stat, None), errors="coerce") or 0)
            if avg <= 0:
                continue

            player_team_id = getattr(row, "TEAM_ID", None)
            player_team_id = int(player_team_id) if pd.notna(player_team_id) else None

            player_team_abbr = getattr(row, roster_team_abbr_col, None) if roster_team_abbr_col else None
            player_logs = _current_team_logs(
                logs,
                player_id=player_id,
                team_id=player_team_id,
                team_abbr=player_team_abbr,
            )

            if player_logs.empty:
                continue

            last_game_date = player_logs["GAME_DATE"].max() if "GAME_DATE" in player_logs.columns else None
            is_active = _is_player_active(latest_league_date, last_game_date, inactive_days=inactive_days)

            if not include_inactive and not is_active:
                continue

            values = pd.to_numeric(player_logs[leader_stat], errors="coerce").fillna(0).tolist()
            if not values:
                continue

            recent_hit_values = values[:leader_hit_window]
            nearest_thresholds = _get_nearest_thresholds(avg, THRESHOLDS[leader_stat])

            best = sorted(
                [
                    {
                        "threshold": t,
                        "streak": _compute_active_streak(values, t),
                        "hitCount": _compute_hit_count(recent_hit_values, t),
                        "hitTotal": len(recent_hit_values),
                    }
                    for t in nearest_thresholds
                ],
                key=lambda d: (d["streak"], d["hitCount"], d["threshold"]),
                reverse=True,
            )[0]

            candidates.append(
                {
                    "stat": leader_stat,
                    "playerId": player_id,
                    "playerName": getattr(row, "PLAYER_NAME", ""),
                    "teamId": player_team_id,
                    "teamAbbr": player_team_abbr,
                    "threshold": best["threshold"],
                    "streak": best["streak"],
                    "hitRate": f'{best["hitCount"]}/{best["hitTotal"]}',
                    "avg": round(avg, 1),
                    "isActive": is_active,
                    "lastGameDate": last_game_date.strftime("%Y-%m-%d") if pd.notna(last_game_date) else None,
                }
            )

        if candidates:
            leader = sorted(
                candidates,
                key=lambda d: (d["streak"], d["threshold"], d["avg"]),
                reverse=True,
            )[0]
            category_leaders.append(leader)

    team_rows: list[dict[str, Any]] = []
    selected_team_name = None
    selected_team_abbr = None

    if team_id is not None and "TEAM_ID" in roster.columns:
        selected_roster = roster[roster["TEAM_ID"] == team_id].copy()
        if not selected_roster.empty:
            if "TEAM_NAME" in selected_roster.columns:
                selected_team_name = selected_roster["TEAM_NAME"].dropna().astype(str).iloc[0]
            if roster_team_abbr_col:
                selected_team_abbr = selected_roster[roster_team_abbr_col].dropna().astype(str).iloc[0]

            for row in selected_roster.itertuples(index=False):
                player_id = int(getattr(row, "PLAYER_ID", 0) or 0)
                if not player_id:
                    continue

                avg = float(pd.to_numeric(getattr(row, stat, None), errors="coerce") or 0)
                player_team_abbr = getattr(row, roster_team_abbr_col, None) if roster_team_abbr_col else selected_team_abbr

                player_logs = _current_team_logs(
                    logs,
                    player_id=player_id,
                    team_id=team_id,
                    team_abbr=player_team_abbr,
                )

                if player_logs.empty:
                    continue

                last_game_date = player_logs["GAME_DATE"].max() if "GAME_DATE" in player_logs.columns else None
                is_active = _is_player_active(latest_league_date, last_game_date, inactive_days=inactive_days)

                values_all = pd.to_numeric(player_logs[stat], errors="coerce").fillna(0).tolist()
                values = values_all if team_window_n is None else values_all[:team_window_n]

                if len(values) == 0:
                    continue

                team_rows.append(
                    {
                        "playerId": player_id,
                        "playerName": getattr(row, "PLAYER_NAME", ""),
                        "teamAbbr": player_team_abbr,
                        "avg": round(avg, 1),
                        "threshold": threshold,
                        "hitCount": _compute_hit_count(values, threshold),
                        "totalGames": len(values),
                        "currentStreak": _compute_active_streak(values, threshold),
                        "recentPattern": [float(v) >= threshold for v in values],
                        "isActive": is_active,
                        "lastGameDate": last_game_date.strftime("%Y-%m-%d") if pd.notna(last_game_date) else None,
                    }
                )

            team_rows = sorted(
                team_rows,
                key=lambda d: (d["hitCount"], d["currentStreak"], d["avg"]),
                reverse=True,
            )

    return {
        "categoryLeaders": category_leaders,
        "teamRows": team_rows,
        "meta": {
            "stat": stat,
            "threshold": threshold,
            "teamWindow": team_window,
            "teamId": team_id,
            "teamName": selected_team_name,
            "teamAbbr": selected_team_abbr,
            "includeInactive": include_inactive,
            "inactiveDays": inactive_days,
        },
    }