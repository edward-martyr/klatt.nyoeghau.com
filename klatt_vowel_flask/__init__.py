from numbers import Real
from os import environ
from pathlib import Path
from shutil import rmtree
from typing import NamedTuple

from flask import Flask, Response, render_template, request, send_from_directory
from flask_minify import Minify

from .utils import create_klattgrid_from_vowel, klattgrid_to_sound, save_sound_as_wav

app = Flask(__name__)
Minify(app=app, html=True, js=True, cssless=True, static=True)
app.secret_key = environ.get("SECRET_KEY", "dev")

WAV_FILE_NAME = "audio.wav"
CACHE_FOLDER = Path(app.root_path, ".klatt_cache").resolve()


class FormantDefaultValue(NamedTuple):
    default: Real
    min: Real
    max: Real


FORMANT_DEFAULTS = {
    1: FormantDefaultValue(800, 100, 1500),
    2: FormantDefaultValue(1200, 500, 4000),
    3: FormantDefaultValue(2300, 1000, 4500),
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
    try:
        if request.referrer == request.root_url:
            formants = (
                float(request.args.get(f"f{i}", 0)) for i in FORMANT_NUMBER_RANGE
            )
            klatt_grid = create_klattgrid_from_vowel(*formants)
            audio = klattgrid_to_sound(klatt_grid)

            tmp_folder = CACHE_FOLDER / uuid
            tmp_folder.mkdir(parents=True, exist_ok=True)
            save_path = tmp_folder / WAV_FILE_NAME

            save_sound_as_wav(audio, save_path.as_posix())
    except Exception as e:
        app.logger.error(
            f"{e}. Error processing request for {uuid}, {request.args}.", exc_info=True
        )
    finally:
        return "", 204


@app.route("/wav/<uuid>")
def wav_file(uuid: str):
    tmp_folder = CACHE_FOLDER / uuid
    wav_file_name = tmp_folder / WAV_FILE_NAME
    try:
        wav_file = open(wav_file_name, "rb")
    except FileNotFoundError:
        return "Audio already deleted from cache.", 404

    def stream_and_remove_wav_file():
        try:
            yield from wav_file
        finally:
            wav_file.close()
            rmtree(tmp_folder)

    return Response(
        stream_and_remove_wav_file(),
        mimetype="audio/wav",
        headers={"Content-Disposition": "attachment", "filename": wav_file_name.name},
    )


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        Path(app.root_path, "static"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


__all__ = ["app"]
