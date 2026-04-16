from __future__ import annotations

import pandas as pd
import statsapi


def _safe_get(d: dict, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
        if cur is None:
            return default
    return cur


def fetch_team_roster(team_id: int) -> list[dict]:
    """
    Fetch roster for a single team.
    """
    data = statsapi.get(
        "team_roster",
        {
            "teamId": team_id,
            "rosterType": "active",  # start simple
        },
    )

    rows = []

    for player in data.get("roster", []):
        person = player.get("person", {})
        position = player.get("position", {})

        rows.append(
            {
                "TEAM_ID": team_id,
                "PLAYER_ID": person.get("id"),
                "PLAYER_NAME": person.get("fullName"),
                "JERSEY_NUMBER": player.get("jerseyNumber"),
                "POSITION": position.get("abbreviation"),
                "POSITION_TYPE": position.get("type"),
                "STATUS": player.get("status", {}).get("description"),
                #"BATS": _safe_get(person, "batSide", "code"),
                #"THROWS": _safe_get(person, "pitchHand", "code"),
            }
        )

    return rows


def fetch_all_rosters(teams_df: pd.DataFrame) -> pd.DataFrame:
    """
    Loop through all teams and build full roster table.
    """
    all_rows = []

    for _, row in teams_df.iterrows():
        team_id = row["TEAM_ID"]
        team_name = row["TEAM_NAME"]

        print(f"📥 Fetching roster for {team_name} ({team_id})...")

        roster_rows = fetch_team_roster(team_id)

        for r in roster_rows:
            r["TEAM_NAME"] = team_name

        all_rows.extend(roster_rows)

    df = pd.DataFrame(all_rows)

    if not df.empty:
        df = df.sort_values(["TEAM_ID", "PLAYER_NAME"]).reset_index(drop=True)

    return df