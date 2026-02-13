# backend/main.py
from datetime import datetime
import argparse
import numpy as np
from pathlib import Path

from src.common.paths import CSV, NBA_PROCESSED
from src.common.cache import ensure_fresh
from src.common.image_urls import get_nba_player_image_url

from src.leagues.nba.pipeline.fetch_data       import fetch_regular_season_logs
from src.leagues.nba.pipeline.team_stats       import generate_team_season_stats
from src.leagues.nba.pipeline.team_utils       import standardize_team_names, extract_team_list
from src.leagues.nba.pipeline.team_rosters     import generate_current_team_rosters
from src.leagues.nba.pipeline.schedule         import fetch_schedule
from src.leagues.nba.pipeline.standings        import fetch_standings
from src.leagues.nba.pipeline.top_player_stats import get_top_player_stats_by_team
from src.leagues.nba.pipeline.player_stats     import fetch_player_stats_per_game
from src.leagues.nba.pipeline.nba_season       import current_nba_season
from src.leagues.nba.pipeline.player_game_logs import build_player_game_logs_csv

CURRENT_YEAR = datetime.now().year

# ---------------- TTL defaults (tune anytime) ----------------
TTL = {
    "nba_core":        12 * 60 * 60,   # 12h
    "nba_schedule":    30 * 60,        # 30m
    "nba_standings":   60 * 60,        # 1h
    "nba_top_players": 6 * 60 * 60,    # 6h
    "nba_pgl":         12 * 60 * 60,   # 12h (player game logs)
}

def cache_marker(name: str) -> Path:
    # small marker files live in a cache folder
    cache_dir = NBA_PROCESSED / ".cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir / f"{name}.done"

# ---------------- BUILDERS ----------------
def build_nba_core():
    NBA_PROCESSED.mkdir(parents=True, exist_ok=True)

    print("🏀 Fetching NBA game logs (regular season only)...")
    games = fetch_regular_season_logs(seasons=range(CURRENT_YEAR - 15, CURRENT_YEAR + 1))
    games = standardize_team_names(games)
    print("✅ Data pulled:", len(games), "games")

    team_stats = generate_team_season_stats(games)
    teams_df   = extract_team_list(games)

    team_stats.to_csv(CSV["nba_team_stats"], index=False)
    teams_df.to_csv(CSV["nba_teams"],       index=False)

    season_str = current_nba_season()  # e.g., "2025-26"

    # rosters
    id_map = dict(zip(teams_df.TEAM_ID, teams_df.TEAM_NAME))
    rosters = generate_current_team_rosters(teams_df.TEAM_ID.tolist(), id_map)
    rosters.to_csv(CSV["nba_rosters"], index=False, encoding="utf-8")

    # player stats
    print(f"📊 Fetching player per-game stats for {season_str}...")
    player_stats = fetch_player_stats_per_game(season=season_str, season_type="Regular Season")

    master_roster = rosters.merge(
        player_stats,
        on=["PLAYER_ID"],
        how="left",
        suffixes=("", "_STATS"),
    )

    if "TeamID" in master_roster.columns:
        master_roster = master_roster.drop(columns=["TeamID"])
    if "TEAM_ID_STATS" in master_roster.columns:
        master_roster = master_roster.drop(columns=["TEAM_ID_STATS"])

    master_roster["TEAM_ID"] = master_roster["TEAM_ID"].astype(int)
    master_roster = master_roster.replace([np.nan, np.inf, -np.inf], None)

    master_roster.to_csv(CSV["nba_roster_master"], index=False, encoding="utf-8")
    print("✅ Wrote:", CSV["nba_roster_master"].name)

def build_nba_player_game_logs():
    build_player_game_logs_csv()
    print("✅ Wrote:", CSV["nba_player_game_logs"].name)

def build_nba_schedule():
    schedule = fetch_schedule(CURRENT_YEAR)
    schedule.to_csv(CSV["nba_games"], index=False)
    print("✅ Wrote:", CSV["nba_games"].name)

def build_nba_standings():
    standings = fetch_standings(CURRENT_YEAR)
    standings.to_csv(CSV["nba_standings"], index=False)
    print("✅ Wrote:", CSV["nba_standings"].name)

def build_nba_top_players():
    season_str = current_nba_season()
    top = get_top_player_stats_by_team(season_str)
    top["PLAYER_IMAGE_URL"] = top["PLAYER_ID"].apply(get_nba_player_image_url)
    top.to_csv(CSV["nba_top_players"], index=False)
    print("✅ Wrote:", CSV["nba_top_players"].name)

# ---------------- ORCHESTRATOR ----------------
def run_nba(groups: list[str], force: bool):
    # core
    if "core" in groups or "all" in groups:
        rebuilt = ensure_fresh(
            marker_path=cache_marker("nba_core"),
            ttl_seconds=TTL["nba_core"],
            build_fn=build_nba_core,
            force=force,
        )
        print("NBA core:", "rebuilt" if rebuilt else "fresh (skipped)")

    # player game logs
    if "pgl" in groups or "all" in groups:
        rebuilt = ensure_fresh(
            marker_path=cache_marker("nba_pgl"),
            ttl_seconds=TTL["nba_pgl"],
            build_fn=build_nba_player_game_logs,
            force=force,
        )
        print("NBA player game logs:", "rebuilt" if rebuilt else "fresh (skipped)")

    # schedule
    if "schedule" in groups or "all" in groups:
        rebuilt = ensure_fresh(
            marker_path=cache_marker("nba_schedule"),
            ttl_seconds=TTL["nba_schedule"],
            build_fn=build_nba_schedule,
            force=force,
        )
        print("NBA schedule:", "rebuilt" if rebuilt else "fresh (skipped)")

    # standings
    if "standings" in groups or "all" in groups:
        rebuilt = ensure_fresh(
            marker_path=cache_marker("nba_standings"),
            ttl_seconds=TTL["nba_standings"],
            build_fn=build_nba_standings,
            force=force,
        )
        print("NBA standings:", "rebuilt" if rebuilt else "fresh (skipped)")

    # top players
    if "top" in groups or "all" in groups:
        rebuilt = ensure_fresh(
            marker_path=cache_marker("nba_top_players"),
            ttl_seconds=TTL["nba_top_players"],
            build_fn=build_nba_top_players,
            force=force,
        )
        print("NBA top players:", "rebuilt" if rebuilt else "fresh (skipped)")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--league", choices=["nba", "nfl", "all"], default="nba")
    parser.add_argument(
        "--group",
        nargs="+",
        default=["all"],
        help="Groups: core, schedule, standings, top, pgl, all",
    )
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    groups = [g.lower() for g in args.group]
    league = args.league.lower()

    if league in ("nba", "all"):
        run_nba(groups, force=args.force)

    # NFL hooks later:
    if league in ("nfl", "all"):
        print("🏈 NFL pipeline not wired yet (next step).")

    print("✅ Done")

if __name__ == "__main__":
    main()
