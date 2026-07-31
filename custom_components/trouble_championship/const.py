"""Constants."""
DOMAIN = "trouble_championship"
PLATFORMS = ["sensor", "select", "button"]
CONF_CHAMPIONSHIP_NAME = "championship_name"
CONF_PLAYER_1 = "player_1"
CONF_PLAYER_2 = "player_2"
CONF_PLAYER_3 = "player_3"
CONF_PLAYER_4 = "player_4"
CONF_PLAYER_5 = "player_5"
DEFAULT_NAME = "Trouble Championship"
DEFAULT_PLAYERS = ["Nick", "Leah", "Kinsley", "Jaxon", "Guest"]
STORAGE_VERSION = 1
STORAGE_KEY_PREFIX = "trouble_championship"
UPDATE_SIGNAL = f"{DOMAIN}_updated"
DEFAULT_ACTIVE_DAYS = 7
DEFAULT_MIN_GAMES = 3

DUPLICATE_WINDOW_SECONDS = 8
