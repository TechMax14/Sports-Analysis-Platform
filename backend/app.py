# backend/app.py
from __future__ import annotations

from datetime import date

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from src.configs.paths import CSV
from src.utils.nba_data import load_games_df
from src.utils.nba_leaders import get_leaders_payload
from src.utils.response import csv_resp

app = Flask(__name__)
CORS(app, supports_credentials=True)


@app.get("/api/health")
def health():
    return jsonify({k: v.exists() for k, v in CSV.items()})


@app.get("/api/schedule/daily")
def daily_schedule():
    target = request.args.get("date") or date.today().isoformat()
    try:
        df = load_games_df()
        day_df = df[df["GAME_DATE_EST"] == target].copy().sort_values(["GAME_DATE_EST", "GAME_ID"])
        day_df = day_df.where(pd.notnull(day_df), None)
        return jsonify(day_df.to_dict(orient="records"))
    except Exception as e:
        print("daily_schedule error:", e)
        return jsonify([])


@app.get("/api/schedule/range")
def schedule_range():
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return jsonify([])
    try:
        df = load_games_df()
        out = df[(df["GAME_DATE_EST"] >= start) & (df["GAME_DATE_EST"] <= end)].copy()
        out = out.sort_values(["GAME_DATE_EST", "GAME_ID"]).where(pd.notnull(out), None)
        return jsonify(out.to_dict(orient="records"))
    except Exception as e:
        print("schedule_range error:", e)
        return jsonify([])


# CSV-backed endpoints
@app.get("/api/standings")
def standings():
    return csv_resp("nba_standings")


@app.get("/api/team-stats")
def team_stats_all():
    return csv_resp("nba_team_stats")


@app.get("/api/teams")
def teams():
    return csv_resp("nba_teams")


@app.get("/api/teams/<int:team_id>/stats")
def team_stats(team_id: int):
    return csv_resp("nba_team_stats", "TEAM_ID", team_id)


@app.get("/api/teams/<int:team_id>/roster")
def team_roster(team_id: int):
    return csv_resp("nba_roster_master", "TEAM_ID", team_id)


@app.get("/api/top-players")
def top_players():
    return csv_resp("nba_top_players")


# New: League leaders
@app.get("/api/leaders")
def league_leaders():
    min_gp = request.args.get("min_gp") or request.args.get("minGp") or 10
    limit = request.args.get("limit") or 5

    try:
        payload = get_leaders_payload(min_gp=int(min_gp), limit=int(limit))
        return jsonify(payload)
    except Exception as e:
        print("/api/leaders error:", e)
        return jsonify({"minGp": int(min_gp), "limit": int(limit), "cards": []})


if __name__ == "__main__":
    app.run(debug=True)
