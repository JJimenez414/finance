import logging
import os
from logging.handlers import RotatingFileHandler

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FILE = os.getenv("LOG_FILE", "app.log")

formatter = logging.Formatter(
	fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
	datefmt="%Y-%m-%d %H:%M:%S",
)

def get_logger(name: str) -> logging.Logger:
	logger = logging.getLogger(name)

	if logger.handlers:
		return logger

	logger.setLevel(LOG_LEVEL)

	console = logging.StreamHandler()
	console.setFormatter(formatter)
	logger.addHandler(console)

	file_handler = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3)
	file_handler.setFormatter(formatter)
	logger.addHandler(file_handler)

	return logger
