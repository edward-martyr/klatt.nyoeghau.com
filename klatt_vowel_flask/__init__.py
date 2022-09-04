from functools import wraps
from numbers import Real
from os import environ
from pathlib import Path
from shutil import rmtree
from typing import NamedTuple

from flask import Flask, Response, abort, render_template, request, send_from_directory
from flask_compress import Compress
from flask_minify import Minify
from werkzeug.urls import url_parse

from .utils import create_klattgrid_from_vowel, klattgrid_to_sound, save_sound_as_wav

app = Flask(__name__, static_folder=None)
Compress(app)
Minify(app=app, html=True, js=True, cssless=True, static=True)
app.secret_key = environ.get("SECRET_KEY", "dev")

STATIC_FOLDER = Path(app.root_path, "static")
CACHE_FOLDER = Path(app.root_path, ".klatt_cache").resolve()
WAV_FILE_NAME = "audio.wav"


def reject_outside_referrers(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if (
            request.referrer is None
            or url_parse(request.referrer).ascii_host
            != url_parse(request.root_url).ascii_host
        ):
            abort(403, description="Invalid referrer.")
        return func(*args, **kwargs)

    return wrapper


class FormantDefaultValue(NamedTuple):
    default: Real
    min: Real
    max: Real


FORMANT_DEFAULTS = {
    1: FormantDefaultValue(800, 100, 1250),
    2: FormantDefaultValue(1200, 500, 3250),
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


@app.route("/process/<path:uuid>", methods=["POST"])
@reject_outside_referrers
def process(uuid: str):
    json_response = {}  # {"uuid": uuid, "args": request.args}
    try:
        formants = (float(request.form.get(f"f{i}", 0)) for i in FORMANT_NUMBER_RANGE)
        klatt_grid = create_klattgrid_from_vowel(*formants)
        audio = klattgrid_to_sound(klatt_grid)

        tmp_folder = CACHE_FOLDER / uuid
        tmp_folder.mkdir(parents=True, exist_ok=True)
        save_path = tmp_folder / WAV_FILE_NAME

        save_sound_as_wav(audio, save_path.as_posix())

        json_response.update({"success": True})
        return json_response, 201  # , {"Location": f"/wav/{uuid}"}
    except Exception as e:
        app.logger.error(
            f"{e}. Error processing request for {uuid}, {request.args}.",
            exc_info=True,
        )
        json_response.update({"success": False, "error": str(e), "form": request.form})
        return json_response, 500


@app.route("/wav/<path:uuid>")
def wav_file(uuid: str):
    tmp_folder = CACHE_FOLDER / uuid
    wav_file_name = tmp_folder / WAV_FILE_NAME
    try:
        wav_file = open(wav_file_name, "rb")
    except FileNotFoundError:
        return abort(410, description="Requested item already deleted from cache.")

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


@app.route("/static/<path:filename>")
@reject_outside_referrers
def static(filename: str):
    return send_from_directory(STATIC_FOLDER, filename)


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        STATIC_FOLDER,
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


__all__ = ["app"]
