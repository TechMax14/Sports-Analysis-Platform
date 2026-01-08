from flask import Flask, jsonify
import pandas as pd
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Enable cross-origin requests from frontend

@app.route('/api/team-stats')
def get_team_stats():
    try: 
        csv_path = os.path.join(os.path.dirname(__file__), 'data', 'processed', 'team_stats_by_season.csv')
        df = pd.read_csv(csv_path)
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return jsonify({"error": "Failed to load team stats"}), 500
    

@app.route('/api/teams')
def get_teams():
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'data', 'processed', 'teams.csv')
        df = pd.read_csv(csv_path)
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        print(f"❌ Error getting teams: {e}")
        return jsonify({"error": "Failed to load teams"}), 500


@app.route('/api/teams/<team_id>/stats')
def get_team_stats_by_id(team_id):
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'data', 'processed', 'team_stats_by_season.csv')
        df = pd.read_csv(csv_path)
        team_df = df[df['TEAM_ID'] == int(team_id)]

        if team_df.empty:
            return jsonify({"error": "Team not found"}), 404

        return jsonify(team_df.to_dict(orient='records'))
    except Exception as e:
        print(f"❌ Error getting team stats: {e}")
        return jsonify({"error": "Failed to load team stats"}), 500
    
    
@app.route('/api/teams/<team_id>/roster')
def get_team_roster(team_id):
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'data', 'processed', 'rosters.csv')
        df = pd.read_csv(csv_path)
        team_df = df[df['TEAM_ID'] == int(team_id)]

        if team_df.empty:
            return jsonify({"error": "Roster not found"}), 404

        return jsonify(team_df.to_dict(orient='records'))
    except Exception as e:
        print(f"❌ Error getting roster: {e}")
        return jsonify({"error": "Failed to load roster"}), 500


@app.route('/api/top-players')
def get_top_players():
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'data', 'processed', 'top_player_stats.csv')
        df = pd.read_csv(csv_path)
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        print(f"❌ Error getting top players: {e}")
        return jsonify({"error": "Failed to load top player stats"}), 500


if __name__ == '__main__':
    app.run(debug=True)
