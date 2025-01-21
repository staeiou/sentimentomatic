#!/usr/bin/python3
import sys, os
import logging

logging.basicConfig(stream=sys.stderr)
sys.path.insert(0,"/var/www/sentiment/FlaskApp")

from flaskapp import app as application
