# src/common/image_urls.py

def get_nba_player_image_url(player_id: int, size: str = "1040x760") -> str:
    """
    Returns NBA headshot URL for a player.
    Valid sizes: '1040x760', '260x190'
    """
    return f"https://cdn.nba.com/headshots/nba/latest/{size}/{player_id}.png"


def get_nba_team_logo_url(team_id: int, size: str = "L") -> str:
    """
    Returns NBA team logo URL.
    Valid sizes: 'L', 'primary', 'wordmark', etc.
    """
    return f"https://cdn.nba.com/logos/nba/{team_id}/global/{size}/logo.svg"
