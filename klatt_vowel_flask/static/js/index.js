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
const wav_play_button = document.getElementById("wav_play_button");
const loading_spinner = document.getElementById("loading_spinner");
const formant_input_ranges = document.getElementsByClassName(
  "formant_input_range"
);
const formant_input_1 = document.getElementById("formant_input_1");
const formant_input_2 = document.getElementById("formant_input_2");
const formant_plot = document.getElementById("formant_plot");

const when_loading = () => {
  document.body.style.cursor = "progress";
  formants_button.style.cursor = "progress";
  wav_play_button.style.cursor = "progress";
  formants_button.disabled = true;
  wav_play_button.disabled = true;

  formants_button.innerHTML = `<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
  <span class="visually-hidden">Loading…</span>`;
};

const not_loading = () => {
  document.body.style.cursor = "default";
  formants_button.style.cursor = "pointer";
  wav_play_button.style.cursor = "pointer";
  formants_button.disabled = false;
  wav_play_button.disabled = false;

  formants_button.innerHTML = "Synthesise";
};

const formants_button_event = (e) => {
  const uuid = uuid4();
  const formantsFormData = new FormData(formants_form);
  when_loading();
  fetch(`/process/${uuid}`, {
    method: "POST",
    form: formantsFormData,
  }).then((response) => {
    const audioCtx = new AudioContext();
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

const f1_min = new Number(formant_input_1.min);
const f1_max = new Number(formant_input_1.max);
const f2_min = new Number(formant_input_2.min);
const f2_max = new Number(formant_input_2.max);

const rem = parseFloat(getComputedStyle(document.body).fontSize);

function f1_f2_to_coordinates(f1, f2) {
  const y = (f1 - f1_min) / ((f1_max - f1_min) / 300) + 1;
  const x = (-f2 + f2_max) / ((f2_max - f2_min) / 300) + 1;
  return [x, y];
}

function plot_formants() {
  const dark = "#292b2c";
  const lightGrey = "#f8f9fA";
  const darkGrey = "#dee2e5";
  const white = "#fff";
  const red = "#dc3545";

  const thinStrokeStyle = {
    color: dark,
    width: 1,
    linecap: "sharp",
    linejoin: "sharp",
  };
  const thinGreyStrokeStyle = {
    color: darkGrey,
    width: 1,
    linecap: "sharp",
    linejoin: "sharp",
  };
  const thickStrokeStyle = {
    color: dark,
    width: 2,
    linecap: "sharp",
    linejoin: "sharp",
  };
  const anchorMiddleStyle = {
    anchor: "middle",
  };

  var plot = SVG().addTo("#formant_plot");
  plot.viewbox(0, 0, 300, 300);
  plot.css({ overflow: "visible" });

  var frame = plot
    .polygon([
      f1_f2_to_coordinates(f1_min, f2_min),
      f1_f2_to_coordinates(f1_min, f2_max),
      f1_f2_to_coordinates(f1_max, f2_max),
      f1_f2_to_coordinates(f1_max, f2_min),
    ])
    .fill(lightGrey)
    .stroke(thinStrokeStyle);

  const highFrontCoord = f1_f2_to_coordinates(270, 2500);
  const highBackCoord = f1_f2_to_coordinates(300, 600);
  const lowBackCoord = f1_f2_to_coordinates(800, 1000);
  const lowFrontCoord = f1_f2_to_coordinates(1000, 2000);

  var vowelSpace = plot
    .polygon([highFrontCoord, highBackCoord, lowBackCoord, lowFrontCoord])
    .fill(white)
    .stroke(thickStrokeStyle);

  var shade = plot
    .polygon([
      f1_f2_to_coordinates(f2_min, f2_min),
      f1_f2_to_coordinates(f1_max, f1_max),
      f1_f2_to_coordinates(f1_max, f2_min),
    ])
    .fill(darkGrey)
    .stroke(thinGreyStrokeStyle);

  var highFront = plot
    .text("i·y")
    .move(highFrontCoord[0] - 10, highFrontCoord[1] - 20)
    .font(anchorMiddleStyle);
  var highBack = plot
    .text("ɯ·u")
    .move(highBackCoord[0] - 10, highBackCoord[1] - 25)
    .font(anchorMiddleStyle);
  var lowBack = plot
    .text("ɑ·ɒ")
    .move(lowBackCoord[0], lowBackCoord[1])
    .font(anchorMiddleStyle);
  var lowFront = plot
    .text("a·ɶ")
    .move(lowFrontCoord[0], lowFrontCoord[1] - 5)
    .font(anchorMiddleStyle);

  var formant_point = plot.circle(5).fill(red);

  var xLabel = plot.text("F2 (Hz)");
  xLabel
    .move(
      (f1_f2_to_coordinates(0, f2_min)[0] +
        f1_f2_to_coordinates(0, f2_max)[0]) /
        2,
      f1_f2_to_coordinates(f1_max, 0)[1]
    )
    .font(anchorMiddleStyle);
  var yLabel = plot.text("F1 (Hz)");
  yLabel
    .move(
      f1_f2_to_coordinates(0, f2_max)[0] - yLabel.bbox().height / 2,
      (f1_f2_to_coordinates(f1_min, 0)[1] +
        f1_f2_to_coordinates(f1_max, 0)[1] -
        yLabel.bbox().height) /
        2
    )
    .font(anchorMiddleStyle);
  yLabel.rotate(-90);

  var xMaxLabel = plot.text(f2_max.toString());
  xMaxLabel
    .move(
      f1_f2_to_coordinates(0, f2_max)[0] + xMaxLabel.bbox().width / 2,
      f1_f2_to_coordinates(f1_max, 0)[1]
    )
    .font(anchorMiddleStyle);
  var xMinLabel = plot.text(f2_min.toString());
  xMinLabel
    .move(
      f1_f2_to_coordinates(0, f2_min)[0] - xMinLabel.bbox().width / 2,
      f1_f2_to_coordinates(f1_max, 0)[1]
    )
    .font(anchorMiddleStyle);
  var yMaxLabel = plot.text(f1_max.toString());
  yMaxLabel
    .move(
      f1_f2_to_coordinates(0, f2_max)[0] - yMaxLabel.bbox().height / 2,
      f1_f2_to_coordinates(f1_max, 0)[1] - yMaxLabel.bbox().height
    )
    .font(anchorMiddleStyle);
  yMaxLabel.rotate(-90);
  var yMinLabel = plot.text(f1_min.toString());
  yMinLabel
    .move(
      f1_f2_to_coordinates(0, f2_max)[0] - yMinLabel.bbox().height / 2,
      f1_f2_to_coordinates(f1_min, 0)[1]
    )
    .font(anchorMiddleStyle);
  yMinLabel.rotate(-90);

  var title = plot.text("Vowel Space");
  title
    .move(
      (f1_f2_to_coordinates(0, f2_min)[0] +
        f1_f2_to_coordinates(0, f2_max)[0]) /
        2,
      f1_f2_to_coordinates(f1_max, 0)[1] - title.bbox().height
    )
    .font(anchorMiddleStyle);

  return formant_point;
}

const formant_point = plot_formants();

for (let i = 0; i < formant_input_ranges.length; i++) {
  const formant_input_range = formant_input_ranges[i];
  const f = new Number(
    formant_input_range.name[formant_input_range.name.length - 1]
  );
  const formant_value = document.getElementById(`formant_value_${f}`);

  const eventListener = (e) => {
    const self = e.target;
    self.value = Math.max(self.min, Math.min(self.max, new Number(self.value)));
    formant_value.value = self.value;

    // a formant cannot be larger than its higher neighbor
    for (let j = 0; j < formant_input_ranges.length; j++) {
      if (i !== j) {
        const formant_input_range_2 = formant_input_ranges[j];
        const f2 = new Number(
          formant_input_range_2.name[formant_input_range_2.name.length - 1]
        );
        const formant_input_range_2_value = new Number(
          formant_input_range_2.value
        );
        const update_other_formant_input = () => {
          formant_input_range_2.value = self.value;
          formant_input_range_2.dispatchEvent(new Event("input"));
        };
        if (f < f2) {
          if (self.value > formant_input_range_2_value) {
            update_other_formant_input();
          }
        } else if (f > f2) {
          if (self.value < formant_input_range_2_value) {
            update_other_formant_input();
          }
        }
      }
    }

    if (f == 1 || f == 2) {
      formant_point.center(
        ...f1_f2_to_coordinates(formant_input_1.value, formant_input_2.value)
      );
    }
  };

  formant_input_range.addEventListener("input", eventListener);
  formant_input_range.dispatchEvent(new Event("input"));
}
