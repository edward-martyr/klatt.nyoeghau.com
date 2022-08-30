from os import environ
from pathlib import Path
from shutil import rmtree
from uuid import uuid4

from flask import Flask, render_template, request, send_from_directory

from .utils import create_klattgrid_from_vowel, klattgrid_to_sound, save_sound_as_wav

app = Flask(__name__)
app.secret_key = environ.get("SECRET_KEY", "dev")

WAV_FILE_NAME = "audio.wav"
TMP_FOLDER = Path(app.root_path, ".tmp").resolve()


@app.route("/", methods=["GET", "POST"])
def index():
    FORMANT_MIN = 200
    FORMANT_MAX = 2500
    FORMANT_DEFAULTS = {1: 800, 2: 1200, 3: 2300, 4: 2800}
    FORMANT_NUMBER_RANGE = range(1, 3)
    FORMANT_INPUTS = "".join(
        render_template(
            "formant_input.html",
            formant=f,
            default_value=FORMANT_DEFAULTS[f],
            min=FORMANT_MIN,
            max=FORMANT_MAX,
        )
        for f in FORMANT_NUMBER_RANGE
    )

    if request.method == "POST":
        formants = (float(request.form.get(f"f{i}", 0)) for i in FORMANT_NUMBER_RANGE)
        klatt_grid = create_klattgrid_from_vowel(*formants)
        audio = klattgrid_to_sound(klatt_grid)

        random_tmp_folder_name = str(uuid4())
        random_tmp_folder = TMP_FOLDER / random_tmp_folder_name
        random_tmp_folder.mkdir(parents=True, exist_ok=True)
        random_file_path = random_tmp_folder / WAV_FILE_NAME

        try:
            save_sound_as_wav(audio, random_file_path.as_posix())

            return render_template(
                "index.html",
                formant_inputs=FORMANT_INPUTS,
                folder=random_tmp_folder_name,
            )
        finally:
            rmtree(random_tmp_folder)

    return render_template("index.html", formant_inputs=FORMANT_INPUTS)


@app.route("/wav/<folder>")
def wav_file(folder: str):
    return send_from_directory(TMP_FOLDER / folder, WAV_FILE_NAME)


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        Path(app.root_path, "static"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


__all__ = ["app"]
