# backend/app.py
from __future__ import annotations

from datetime import date

import pandas as pd
import numpy as np

from flask import Flask, jsonify, request
from flask_cors import CORS

from src.common.paths import CSV
from src.common.response import csv_resp
from src.leagues.nba.api.nba_data import load_games_df
from src.leagues.nba.api.nba_leaders import get_leaders_payload

app = Flask(__name__)
CORS(app, supports_credentials=True)


def _records(df: pd.DataFrame):
    """Convert dataframe to JSON-serializable records (NaN -> None)."""
    return df.where(pd.notnull(df), None).to_dict(orient="records")


@app.get("/api/health")
def health():
    return jsonify({k: v.exists() for k, v in CSV.items()})


# ---------------- NBA: schedule ----------------
@app.get("/api/nba/schedule/daily")
def nba_daily_schedule():
    target = request.args.get("date") or date.today().isoformat()
    try:
        df = load_games_df()
        day_df = df[df["GAME_DATE_EST"] == target].copy().sort_values(["GAME_DATE_EST", "GAME_ID"])
        return jsonify(_records(day_df))
    except Exception as e:
        print("nba_daily_schedule error:", e)
        return jsonify([])


@app.get("/api/nba/schedule/range")
def nba_schedule_range():
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return jsonify([])

    try:
        df = load_games_df()
        out = df[(df["GAME_DATE_EST"] >= start) & (df["GAME_DATE_EST"] <= end)].copy()
        out = out.sort_values(["GAME_DATE_EST", "GAME_ID"])
        return jsonify(_records(out))
    except Exception as e:
        print("nba_schedule_range error:", e)
        return jsonify([])


# Optional: raw games CSV (handy for debugging / reuse)
@app.get("/api/nba/games")
def nba_games():
    return csv_resp("nba_games")


# ---------------- NBA: CSV-backed endpoints ----------------
@app.get("/api/nba/standings")
def nba_standings():
    return csv_resp("nba_standings")


@app.get("/api/nba/team-stats")
def nba_team_stats_all():
    return csv_resp("nba_team_stats")


@app.get("/api/nba/teams")
def nba_teams():
    return csv_resp("nba_teams")


@app.get("/api/nba/teams/<int:team_id>/stats")
def nba_team_stats(team_id: int):
    return csv_resp("nba_team_stats", "TEAM_ID", team_id)


@app.get("/api/nba/teams/<int:team_id>/roster")
def nba_team_roster(team_id: int):
    return csv_resp("nba_roster_master", "TEAM_ID", team_id)


@app.get("/api/nba/top-players")
def nba_top_players():
    return csv_resp("nba_top_players")


# ---------------- NBA: computed endpoints ----------------
@app.get("/api/nba/leaders")
def nba_league_leaders():
    min_gp = request.args.get("min_gp") or request.args.get("minGp") or 10
    limit = request.args.get("limit") or 5

    try:
        payload = get_leaders_payload(min_gp=int(min_gp), limit=int(limit))
        return jsonify(payload)
    except Exception as e:
        print("nba_league_leaders error:", e)
        return jsonify({"minGp": int(min_gp), "limit": int(limit), "cards": []})


# ---------------- NBA: search endpoints ----------------
@app.get("/api/nba/players/search")
def nba_player_search():
    q = (request.args.get("q") or "").strip().lower()
    if not q:
        return jsonify([])

    try:
        df = pd.read_csv(CSV["nba_roster_master"])

        cols = [c for c in ["PLAYER_ID", "PLAYER_NAME", "TEAM_ID", "TEAM_ABBREVIATION"] if c in df.columns]
        df = df[cols].drop_duplicates(subset=["PLAYER_ID"]).copy()

        df["PLAYER_NAME"] = df["PLAYER_NAME"].astype(str)
        mask = df["PLAYER_NAME"].str.lower().str.contains(q, na=False)
        out = df[mask].head(25).copy()

        out = out.where(pd.notnull(out), None)

        return jsonify(
            [
                {
                    "playerId": int(r["PLAYER_ID"]) if r.get("PLAYER_ID") is not None else None,
                    "name": r.get("PLAYER_NAME"),
                    "teamId": int(r["TEAM_ID"]) if r.get("TEAM_ID") is not None else None,
                    "teamAbbr": r.get("TEAM_ABBREVIATION"),
                }
                for r in out.to_dict(orient="records")
            ]
        )
    except Exception as e:
        print("nba_player_search error:", e)
        return jsonify([])

# ---------------- NBA: player game logs ----------------
@app.get("/api/nba/players/<int:player_id>/gamelog")
def nba_player_gamelog(player_id: int):
    # last N games
    last = request.args.get("last") or 5
    try:
        last_n = max(1, min(int(last), 50))
    except Exception:
        last_n = 5

    # Optional filters (future-proof, can ignore in frontend for now)
    opp = (request.args.get("opp") or "").strip().upper() or None
    home = request.args.get("home")
    away = request.args.get("away")

    def _to_bool(v):
        if v is None:
            return None
        return str(v).strip().lower() in ("1", "true", "t", "yes", "y")

    home_b = _to_bool(home)
    away_b = _to_bool(away)

    try:
        path = CSV["nba_player_game_logs"]
        if not path.exists():
            return jsonify({"error": "player game logs not generated yet"}), 404

        df = pd.read_csv(path)

        if "PLAYER_ID" not in df.columns:
            return jsonify({"error": "invalid game logs schema"}), 500

        df["PLAYER_ID"] = pd.to_numeric(df["PLAYER_ID"], errors="coerce")
        df = df[df["PLAYER_ID"] == player_id].copy()

        if df.empty:
            return jsonify([])

        # Optional filters
        if opp and "OPP_TEAM_ABBR" in df.columns:
            df["OPP_TEAM_ABBR"] = df["OPP_TEAM_ABBR"].astype(str).str.upper()
            df = df[df["OPP_TEAM_ABBR"] == opp]

        if home_b is True and "IS_HOME" in df.columns:
            df = df[df["IS_HOME"] == True]
        if away_b is True and "IS_AWAY" in df.columns:
            df = df[df["IS_AWAY"] == True]

        # Sort newest first
        if "GAME_DATE" in df.columns:
            df["GAME_DATE"] = pd.to_datetime(df["GAME_DATE"], errors="coerce")
            sort_cols = ["GAME_DATE"]
            if "GAME_ID" in df.columns:
                sort_cols.append("GAME_ID")
            df = df.sort_values(sort_cols, ascending=[False] * len(sort_cols))

            # Convert back to ISO string for frontend
            df["GAME_DATE"] = df["GAME_DATE"].dt.strftime("%Y-%m-%d")


        df = df.head(last_n)

        df = df.where(pd.notnull(df), None)
        df = df.replace([np.nan, np.inf, -np.inf], None)
        return jsonify(df.to_dict(orient="records"))

    except Exception as e:
        print("nba_player_gamelog error:", e)
        return jsonify([])


if __name__ == "__main__":
    app.run(debug=True)
