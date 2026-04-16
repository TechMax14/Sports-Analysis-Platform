# src/leagues/mlb/pipeline/standings.py
from __future__ import annotations

import pandas as pd
import statsapi


DIVISION_MAP = {
    200: "AL West",
    201: "AL East",
    202: "AL Central",
    203: "NL West",
    204: "NL East",
    205: "NL Central",
}

LEAGUE_MAP = {
    103: "AL",
    104: "NL",
}


def _safe_get(d: dict, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
        if cur is None:
            return default
    return cur


def _get_team_abbreviation_map() -> dict[int, str]:
    """
    Pull MLB teams and build a TEAM_ID -> TEAM_ABBREVIATION lookup.
    """
    data = statsapi.get("teams", {"sportId": 1})
    team_map: dict[int, str] = {}

    for team in data.get("teams", []):
        team_id = team.get("id")
        team_abbr = team.get("abbreviation")

        if team_id is not None and team_abbr:
            team_map[int(team_id)] = str(team_abbr)

    return team_map


def fetch_mlb_standings(season: int | None = None) -> pd.DataFrame:
    """
    Pull MLB standings and return a flat DataFrame.
    """
    params = {"leagueId": "103,104", "standingsType": "regularSeason"}
    if season is not None:
        params["season"] = season

    data = statsapi.get("standings", params)
    team_abbr_map = _get_team_abbreviation_map()

    rows_out: list[dict] = []

    for record_group in data.get("records", []):
        league_id = _safe_get(record_group, "league", "id")
        division_id = _safe_get(record_group, "division", "id")

        league_name = LEAGUE_MAP.get(
            league_id, _safe_get(record_group, "league", "name")
        )
        division_name = DIVISION_MAP.get(
            division_id, _safe_get(record_group, "division", "name")
        )

        for row in record_group.get("teamRecords", []):
            team = row.get("team", {})
            team_id = team.get("id")

            runs_scored = row.get("runsScored")
            runs_allowed = row.get("runsAllowed")

            rows_out.append(
                {
                    "TEAM_ID": team_id,
                    "TEAM_NAME": team.get("name"),
                    "TEAM_ABBREVIATION": team_abbr_map.get(team_id),
                    "LEAGUE": league_name,
                    "DIVISION": division_name,
                    "W": row.get("wins"),
                    "L": row.get("losses"),
                    "PCT": row.get("winningPercentage"),
                    "GB": row.get("gamesBack"),
                    "HOME": row.get("records", {}).get("splitRecords", [{}])[0].get("wins"),
                    "AWAY": None,  # placeholder for v1
                    "RS": runs_scored,
                    "RA": runs_allowed,
                    "RUN_DIFF": (
                        runs_scored - runs_allowed
                        if runs_scored is not None and runs_allowed is not None
                        else None
                    ),
                    "STREAK": _safe_get(row, "streak", "streakCode"),
                    "LAST_10": None,  # can backfill once we inspect structure
                    "DIV_RANK": row.get("divisionRank"),
                    "WC_RANK": row.get("wildCardRank"),
                }
            )

    df = pd.DataFrame(rows_out)

    sort_cols = ["LEAGUE", "DIVISION", "DIV_RANK"]
    existing_sort_cols = [c for c in sort_cols if c in df.columns]
    if existing_sort_cols:
        df = df.sort_values(existing_sort_cols).reset_index(drop=True)

    return df