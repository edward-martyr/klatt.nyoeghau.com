function uuid4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

const audioCtx = new AudioContext();

const formants_form = document.getElementById("formants_form");
const formants_button = document.getElementById("formants_button");
const wav_play_button = document.getElementById("wav_play_button");

const when_loading = () => {
  document.body.style.cursor = "progress";
  formants_button.style.cursor = "progress";
  wav_play_button.style.cursor = "progress";
};

const not_loading = () => {
  document.body.style.cursor = "default";
  formants_button.style.cursor = "pointer";
  wav_play_button.style.cursor = "pointer";
};

const formants_button_event = (e) => {
  const uuid = uuid4();
  const urlSearchParams = new URLSearchParams(new FormData(formants_form));
  when_loading();
  fetch(`/process/${uuid}?${urlSearchParams}`).then((response) => {
    fetch(`/wav/${uuid}`)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
      .then((decodedAudioData) => {
        const audio_data = decodedAudioData;
        function play_audio() {
          const source = audioCtx.createBufferSource();
          source.buffer = audio_data;
          source.connect(audioCtx.destination);
          source.start(0);
        }
        // play_audio();
        not_loading();
        wav_play_button.hidden = false;
        wav_play_button.onclick = play_audio;
      });
  });
};
formants_button.addEventListener("click", formants_button_event);

const formant_input_ranges = document.getElementsByClassName(
  "formant_input_range"
);

for (let i = 0; i < formant_input_ranges.length; i++) {
  const formant_input_range = formant_input_ranges[i];
  const f = formant_input_range.name[formant_input_range.name.length - 1];
  const formant_value = document.getElementById(`formant_value_${f}`);

  const eventListener = (e) => {
    const self = e.target;
    self.value = Math.max(self.min, Math.min(self.max, new Number(self.value)));
    formant_value.value = self.value;

    // a formant cannot be larger than its higher neighbor
    for (let j = 0; j < formant_input_ranges.length; j++) {
      if (i !== j) {
        const formant_input_range_2 = formant_input_ranges[j];
        const f2 =
          formant_input_range_2.name[formant_input_range_2.name.length - 1];
        const formant_input_range_2_value = new Number(
          formant_input_range_2.value
        );
        if (f < f2) {
          if (self.value > formant_input_range_2_value) {
            formant_input_range_2.value = self.value;
            formant_input_range_2.dispatchEvent(new Event("input"));
          }
        } else if (f > f2) {
          if (self.value < formant_input_range_2_value) {
            formant_input_range_2.value = self.value;
            formant_input_range_2.dispatchEvent(new Event("input"));
          }
        }
      }
    }
  };

  formant_input_range.addEventListener("input", eventListener);
}
