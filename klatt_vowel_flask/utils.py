from numbers import Real

from parselmouth import Data as PraatData, Sound, SoundFileFormat
from parselmouth.praat import call as praat_call  # type: ignore


class KlattGrid(PraatData):
    ...


def create_klattgrid_from_vowel(
    f1: Real,
    f2: Real,
    f3: Real = 0,
    f4: Real = 0,
    b1: Real = 50,
    b2: Real = 50,
    b3: Real = 100,
    vowel_name: str = "V",
    duration: Real = 0.4,
    pitch: Real = 125,
    bandwidth_fraction: Real = 0.05,
    formant_frequency_interval: Real = 1000,
) -> KlattGrid:
    """
    Creates a Praat KlattGrid from a vowel.
    """
    klatt_grid = praat_call(
        "Create KlattGrid from vowel",
        vowel_name,
        duration,
        pitch,
        f1,
        b1,
        f2,
        b2,
        f3,
        b3,
        f4,
        bandwidth_fraction,
        formant_frequency_interval,
    )
    return klatt_grid


def klattgrid_to_sound(klatt_grid: KlattGrid) -> Sound:
    """
    Creates a Praat Sound from a Praat KlattGrid.
    """
    sound = praat_call(klatt_grid, "To Sound")
    return sound


def save_sound_as_wav(sound: Sound, file_name: str) -> None:
    """
    Saves a Praat Sound as a WAV file.
    """
    sound.save(file_name, SoundFileFormat.WAV)
