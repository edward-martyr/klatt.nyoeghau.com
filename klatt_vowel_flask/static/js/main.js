function uuid4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

const formants_form = document.getElementById("formants_form");
const formants_button = document.getElementById("formants_button");
const audio = document.getElementById("audio");

formants_button.addEventListener("click", (e) => {
  const uuid = uuid4();
  const urlSearchParams = new URLSearchParams(new FormData(formants_form));
  fetch(`/process/${uuid}?${urlSearchParams}`).then((response) => {
    audio.innerHTML = `<audio autoplay><source src="/wav/${uuid}" type="audio/wav"></audio>`;
  });
});

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

  formant_input_range.addEventListener("change", eventListener);
  formant_input_range.addEventListener("input", eventListener);
}
