from numbers import Real
from os import environ
from pathlib import Path
from shutil import rmtree
from typing import NamedTuple

from flask import Flask, render_template, request, send_from_directory
from flask_minify import Minify

from .utils import create_klattgrid_from_vowel, klattgrid_to_sound, save_sound_as_wav

app = Flask(__name__)
Minify(app=app, html=True, js=True, cssless=True, static=True)
app.secret_key = environ.get("SECRET_KEY", "dev")

WAV_FILE_NAME = "audio.wav"
TMP_FOLDER = Path(app.root_path, ".tmp").resolve()


class FormantDefaultValue(NamedTuple):
    default: Real
    min: Real
    max: Real


FORMANT_DEFAULTS = {
    1: FormantDefaultValue(800, 150, 1500),
    2: FormantDefaultValue(1200, 750, 3000),
    3: FormantDefaultValue(2300, 1500, 4000),
    # 4: 2800,
}
FORMANT_NUMBER_RANGE = sorted(FORMANT_DEFAULTS.keys())


@app.route("/")
def index():
    formant_inputs = "".join(
        render_template(
            "formant_input.html",
            formant=f,
            default_value=FORMANT_DEFAULTS[f],
        )
        for f in FORMANT_NUMBER_RANGE
    )
    return render_template("index.html", formant_inputs=formant_inputs)


@app.route("/process/<uuid>")
def process(uuid: str):
    json_response = {"uuid": uuid}
    try:
        formants = (float(request.args.get(f"f{i}", 0)) for i in FORMANT_NUMBER_RANGE)
        klatt_grid = create_klattgrid_from_vowel(*formants)
        audio = klattgrid_to_sound(klatt_grid)

        tmp_folder = TMP_FOLDER / uuid
        tmp_folder.mkdir(parents=True, exist_ok=True)
        save_path = tmp_folder / WAV_FILE_NAME

        save_sound_as_wav(audio, save_path.as_posix())

        return json_response | {"success": True}
    except:
        return json_response | {"success": False}


@app.route("/wav/<uuid>")
def wav_file(uuid: str):
    tmp_folder = TMP_FOLDER / uuid
    try:
        return send_from_directory(tmp_folder, WAV_FILE_NAME)
    finally:
        rmtree(tmp_folder)


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        Path(app.root_path, "static"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


__all__ = ["app"]
