from nba_api.stats.endpoints import commonteamroster
from src.common.constants import PLAYER_ID_FIXES
from src.leagues.nba.pipeline.nba_season import current_nba_season
import pandas as pd
import time
from datetime import datetime

def generate_current_team_rosters(team_ids: list[int], team_id_to_name: dict, delay_sec: float = 1.0) -> pd.DataFrame:
    all_rosters = []
    current_season = current_nba_season()

    for team_id in team_ids:
        try:
            team_name = team_id_to_name.get(team_id, "Unknown")
            print(f"📥 Fetching roster for {team_name} (ID: {team_id}) - Season {current_season}")
            roster = commonteamroster.CommonTeamRoster(team_id=team_id, season=current_season)
            players = roster.get_data_frames()[0]
            players["TEAM_ID"] = team_id
            players["SEASON"] = int(current_season.split("-")[0])  # "2024-25" -> 2024
            players["TEAM_NAME"] = team_name
            all_rosters.append(players)
            time.sleep(delay_sec)
        except Exception as e:
            print(f"❌ Failed to fetch roster for {team_id}: {e}")

    if not all_rosters:
        return pd.DataFrame()

    df = pd.concat(all_rosters, ignore_index=True)

    # Fix corrupted names using PLAYER_ID
    df["PLAYER"] = df.apply(
        lambda row: PLAYER_ID_FIXES.get(row["PLAYER_ID"], row["PLAYER"]), axis=1
    )

    # Force NUM to string and fill missing with placeholder
    df["NUM"] = df["NUM"].replace("", pd.NA).astype("string").fillna("--")

    # Fill missing values
    df = df.fillna({
        "POSITION": "Unknown",
        "HEIGHT": "Unknown",
        "WEIGHT": 0,
        "AGE": 0,
        "EXP": "Unknown",
        "SCHOOL": "Unknown",
        "HOW_ACQUIRED": "No Info"
    })

    # Drop unwanted columns
    df.drop(columns=["NICKNAME", "BIRTH_DATE", "LeagueID", "PLAYER_SLUG"], inplace=True, errors="ignore")

    # Optional: sort cleanly
    df.sort_values(["TEAM_NAME", "PLAYER"], inplace=True)

    df = df.rename(columns={
        "PLAYER": "PLAYER_NAME",
        "NUM": "JERSEY_NUMBER",
    })

    return df




# PLAYER_ID_FIXES = {
#     1630249: "Vit Krejci",
#     204001: "Kristaps Porzingis",
#     203994: "Jusuf Nurkić",
#     1631217: "Moussa Diabaté",
#     1642275: "Tidjane Salaün",
#     202696: "Nikola Vučević",
#     203957: "Danté Exum",
#     203967: "Dario Šarić",
#     1628427: "Vlatko Čančar",
#     203999: "Nikola Jokić",
#     203471: "Dennis Schröder",
#     203992: "Bogdan Bogdanović",
#     1629029: "Luka Dončić",
#     1631107: "Nikola Jović",
#     1631255: "Karlo Matković",
#     1642359: "Pacôme Dadiet",
#     1642260: "Nikola Topić",
#     1628420: "Monté Morris",
#     203995: "Vasilije Micić",
#     202685: "Jonas Valančiūnas",
# }