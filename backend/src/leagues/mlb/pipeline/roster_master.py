from __future__ import annotations

from datetime import date, datetime
import math
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


def map_position_group(position_type: str | None) -> str | None:
    if not position_type:
        return None

    pt = str(position_type).strip().lower()

    if pt == "pitcher":
        return "Pitcher"
    if pt == "two-way player":
        return "Two-Way"
    if pt in {"infielder", "outfielder", "catcher"}:
        return "Hitter"

    return position_type


def parse_height_to_inches(height_str: str | None) -> int | None:
    """
    Converts heights like 6' 2" to 74.
    """
    if not height_str or not isinstance(height_str, str):
        return None

    try:
        cleaned = height_str.replace('"', "").strip()
        feet_str, inches_str = cleaned.split("'")
        feet = int(feet_str.strip())
        inches = int(inches_str.strip())
        return feet * 12 + inches
    except Exception:
        return None


def calc_age(birth_date_str: str | None) -> int | None:
    if not birth_date_str:
        return None
    try:
        born = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
        today = date.today()
        return today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    except Exception:
        return None


def get_player_bio(player_id: int) -> dict:
    """
    Pull player bio/person metadata from MLB Stats API.
    """
    data = statsapi.get("person", {"personId": player_id})
    people = data.get("people", [])
    if not people:
        return {}

    p = people[0]

    birth_date = p.get("birthDate")

    return {
        "USE_NAME": p.get("useName"),
        "NICKNAME": p.get("nickName"),
        "BATS": _safe_get(p, "batSide", "code"),
        "THROWS": _safe_get(p, "pitchHand", "code"),
        "BIRTH_DATE": birth_date,
        "AGE": calc_age(birth_date),
        "HEIGHT": p.get("height"),
        "HEIGHT_IN": parse_height_to_inches(p.get("height")),
        "WEIGHT": p.get("weight"),
        "BIRTH_CITY": p.get("birthCity"),
        "BIRTH_STATE_PROVINCE": p.get("birthStateProvince"),
        "BIRTH_COUNTRY": p.get("birthCountry"),
    }


def get_player_hitting_stats(player_id: int, season: int) -> dict:
    try:
        data = statsapi.player_stat_data(
            player_id,
            group="hitting",
            type="season",
            season=season,
        )

        stats_list = data.get("stats") or []
        if not stats_list:
            return {}

        first_block = stats_list[0] or {}
        stat = first_block.get("stats") or {}
        if not stat:
            return {}

        return {
            "G_HIT": stat.get("gamesPlayed"),
            "AB": stat.get("atBats"),
            "R": stat.get("runs"),
            "H": stat.get("hits"),
            "HR": stat.get("homeRuns"),
            "RBI": stat.get("rbi"),
            "SB": stat.get("stolenBases"),
            "AVG": stat.get("avg"),
            "OBP": stat.get("obp"),
            "SLG": stat.get("slg"),
            "OPS": stat.get("ops"),
        }
    except Exception as e:
        print(f"⚠️ Hitting stats failed for {player_id}: {e}")
        return {}


def get_player_pitching_stats(player_id: int, season: int) -> dict:
    try:
        data = statsapi.player_stat_data(
            player_id,
            group="pitching",
            type="season",
            season=season,
        )

        stats_list = data.get("stats") or []
        if not stats_list:
            return {}

        first_block = stats_list[0] or {}
        stat = first_block.get("stats") or {}
        if not stat:
            return {}

        return {
            "G_PIT": stat.get("gamesPlayed"),
            "GS": stat.get("gamesStarted"),
            "IP": stat.get("inningsPitched"),
            "W": stat.get("wins"),
            "L": stat.get("losses"),
            "ERA": stat.get("era"),
            "WHIP": stat.get("whip"),
            "SO": stat.get("strikeOuts"),
            "BB_ALLOWED": stat.get("baseOnBalls"),
            "SV": stat.get("saves"),
        }
    except Exception as e:
        print(f"⚠️ Pitching stats failed for {player_id}: {e}")
        return {}


def build_mlb_roster_master(rosters_df: pd.DataFrame, season: int) -> pd.DataFrame:
    rows = []
    total = len(rosters_df)

    for i, (_, row) in enumerate(rosters_df.iterrows(), start=1):
        player_id = int(row["PLAYER_ID"])

        if i == 1 or i % 25 == 0 or i == total:
            print(f"📥 MLB roster master progress: {i}/{total}")

        base = row.to_dict()
        base["POSITION_GROUP"] = map_position_group(row.get("POSITION_TYPE"))

        bio = get_player_bio(player_id)
        hitting = get_player_hitting_stats(player_id, season)
        pitching = get_player_pitching_stats(player_id, season)

        merged = {**base, **bio, **hitting, **pitching}
        rows.append(merged)

    df = pd.DataFrame(rows)

    if not df.empty:
        df = df.sort_values(["TEAM_ID", "POSITION_GROUP", "PLAYER_NAME"]).reset_index(drop=True)

    df = df.replace({pd.NA: None})
    df = df.where(pd.notnull(df), None)

    return df