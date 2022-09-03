#!/usr/bin/python3

from wsgiref.handlers import CGIHandler

from klatt_vowel_flask import app

CGIHandler().run(app)
