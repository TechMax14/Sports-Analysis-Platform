from datetime import date

def current_nba_season(today: date | None = None) -> str:
    """
    Returns NBA season in 'YYYY-YY' format based on today's date.
    NBA season starts in Oct and runs through June.
    Example:
      Jan 2026 -> '2025-26'
      Nov 2025 -> '2025-26'
      Mar 2025 -> '2024-25'
    """
    today = today or date.today()
    start_year = today.year if today.month >= 10 else today.year - 1
    return f"{start_year}-{str(start_year + 1)[-2:]}"
