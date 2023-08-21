// Copyright 2023 Takamitsu Endo
// SPDX-License-Identifier: Apache-2.0

import {uiSize} from "../common/gui/palette.js";
import * as widget from "../common/gui/widget.js";
import * as parameter from "../common/parameter.js";
import * as util from "../common/util.js";
import * as wave from "../common/wave.js";

import * as menuitems from "./menuitems.js";

function randomize() {
  if (selectRandom.value === "Default") {
    for (const key in param) {
      if (key === "renderDuration") continue;
      if (key === "fadeIn") continue;
      if (key === "fadeOut") continue;
      if (key === "decayTo") continue;
      if (key === "stereoMerge") continue;
      if (key === "dcHighpassHz") continue;
      if (key === "toneSlope") continue;

      if (key === "noteNumber") continue;
      if (key === "mainPwmAmount") continue;
      if (key === "chorusAM") continue;

      if (Array.isArray(param[key])) {
        param[key].forEach(e => { e.normalized = Math.random(); });
      } else if (param[key].scale instanceof parameter.MenuItemScale) {
        // Do nothing for now.
      } else {
        param[key].normalized = Math.random();
      }
    }
  }

  render();
  widget.refresh(ui);
}

function createArrayParameters(defaultDspValues, scale, size) {
  let arr = new Array(size);
  for (let i = 0; i < arr.length; ++i) {
    arr[i] = new parameter.Parameter(defaultDspValues[i], scale, true);
  }
  return arr;
}

function render() {
  audio.render(
    parameter.toMessage(param, {
      sampleRate: audio.audioContext.sampleRate,
    }),
    "perChannel",
    togglebuttonQuickSave.state === 1,
  );
}

const scales = {
  boolean: new parameter.IntScale(0, 1),

  renderDuration: new parameter.DecibelScale(-40, 40, false),
  fade: new parameter.DecibelScale(-60, 40, true),
  decayTo: new parameter.DecibelScale(util.ampToDB(1 / 2 ** 24), 0, false),
  stereoMerge: new parameter.LinearScale(0, 1),
  overSample: new parameter.MenuItemScale(menuitems.oversampleItems),
  toneSlope: new parameter.DecibelScale(-12, 0, false),
  dcHighpassHz: new parameter.DecibelScale(-20, 40, true),

  envelopeTimeSeconds: new parameter.DecibelScale(-40, 60, false),
  ratio: new parameter.LinearScale(0, 1),
  envelopeLevel: new parameter.LinearScale(0, 1),
  pitchEnvOctave: new parameter.DecibelScale(util.ampToDB(0.02), util.ampToDB(20), true),
  noteNumber: new parameter.MidiPitchScale(-24, 128, false),
  frequencyHz: new parameter.DecibelScale(util.ampToDB(1), util.ampToDB(10000), false),
  lfoRateHz: new parameter.DecibelScale(-40, 40, true),

  chorusAM: new parameter.DecibelScale(-30, 0, true),
  chorusTimeSeconds:
    new parameter.DecibelScale(util.ampToDB(1e-4), util.ampToDB(0.2), true),
  chorusDelayCount: new parameter.IntScale(1, 8),
};

const param = {
  renderDuration: new parameter.Parameter(2, scales.renderDuration, true),
  fadeIn: new parameter.Parameter(0.0, scales.fade, true),
  fadeOut: new parameter.Parameter(0.002, scales.fade, true),
  decayTo: new parameter.Parameter(1, scales.decayTo, false),
  stereoMerge: new parameter.Parameter(0.5, scales.stereoMerge),
  overSample: new parameter.Parameter(2, scales.overSample),
  toneSlope: new parameter.Parameter(1, scales.toneSlope, false),
  dcHighpassHz: new parameter.Parameter(16, scales.dcHighpassHz, true),

  attackTimeSeconds: new parameter.Parameter(0.1, scales.envelopeTimeSeconds, true),
  attackLevel: new parameter.Parameter(0.5, scales.envelopeLevel, true),
  decayTimeSeconds: new parameter.Parameter(1, scales.envelopeTimeSeconds, true),
  decayLevel: new parameter.Parameter(0, scales.envelopeLevel, true),

  noteNumber: new parameter.Parameter(util.midiPitchToFreq(36), scales.noteNumber, false),
  mainPwmAmount: new parameter.Parameter(1, scales.ratio, true),
  pitchEnvOctave: new parameter.Parameter(1, scales.pitchEnvOctave, true),
  subExtraMix: new parameter.Parameter(0, scales.ratio, true),
  subPwmAmount: new parameter.Parameter(0, scales.ratio, true),
  pwmLfoRateHz: new parameter.Parameter(1.5, scales.lfoRateHz, true),
  pwmLfoRateEnvOctave: new parameter.Parameter(1, scales.pitchEnvOctave, true),

  chorusMix: new parameter.Parameter(1, scales.ratio, true),
  chorusAM: new parameter.Parameter(0, scales.chorusAM, true),
  chorusTimeBaseSeconds: new parameter.Parameter(0.01, scales.chorusTimeSeconds, true),
  chorusTimeModSeconds: new parameter.Parameter(0.01, scales.chorusTimeSeconds, true),
  chorusDelayCount: new parameter.Parameter(1, scales.chorusDelayCount, true),
  chorusLfoSpread: new parameter.Parameter(1, scales.ratio, true),
};

// Add controls.
const audio = new wave.Audio(
  2,
  "./renderer.js",
  undefined,
  (wave) => {
    for (let i = 0; i < waveView.length; ++i) waveView[i].set(wave.data[i]);
  },
);

const pageTitle = widget.pageTitle(document.body);
const divMain = widget.div(document.body, "main", undefined);

const divLeft = widget.div(divMain, undefined, "controlBlock");
const divRightA = widget.div(divMain, undefined, "controlBlock");
const divRightB = widget.div(divMain, undefined, "controlBlock");

const headingWaveform = widget.heading(divLeft, 6, "Waveform");
const waveView = [
  new widget.WaveView(
    divLeft, uiSize.waveViewWidth, uiSize.waveViewHeight, audio.wave.data[0], false),
  new widget.WaveView(
    divLeft, uiSize.waveViewWidth, uiSize.waveViewHeight, audio.wave.data[1], false),
];

const pRenderStatus = widget.paragraph(divLeft, "renderStatus", undefined);
audio.renderStatusElement = pRenderStatus;

const divPlayControl = widget.div(divLeft, "playControl", undefined);
const selectRandom = widget.select(
  divPlayControl, "Randomize Recipe", "randomRecipe", undefined, ["Default"], "Default",
  (ev) => { randomize(); });
const buttonRandom = widget.Button(divPlayControl, "Random", (ev) => { randomize(); });
buttonRandom.id = "randomRecipe";
const spanPlayControlFiller = widget.span(divPlayControl, "playControlFiller", undefined);
const buttonPlay = widget.Button(divPlayControl, "Play", (ev) => { audio.play(); });
const buttonStop = widget.Button(divPlayControl, "Stop", (ev) => { audio.stop(); });
const buttonSave = widget.Button(divPlayControl, "Save", (ev) => { audio.save(); });
const togglebuttonQuickSave = new widget.ToggleButton(
  divPlayControl, "QuickSave", undefined, undefined, 0, (ev) => {});

const detailRender = widget.details(divLeft, "Render");
const detailEnvelope = widget.details(divRightA, "Envelope");
const detailOscillator = widget.details(divRightA, "Oscillator");
const detailChorus = widget.details(divRightA, "Chorus");

const ui = {
  renderDuration:
    new widget.NumberInput(detailRender, "Duration [s]", param.renderDuration, render),
  fadeIn: new widget.NumberInput(detailRender, "Fade-in [s]", param.fadeIn, render),
  fadeOut: new widget.NumberInput(detailRender, "Fade-out [s]", param.fadeOut, render),
  decayTo: new widget.NumberInput(detailRender, "Decay To [dB]", param.decayTo, render),
  stereoMerge:
    new widget.NumberInput(detailRender, "Stereo Merge", param.stereoMerge, render),
  overSample:
    new widget.ComboBoxLine(detailRender, "Over-sample", param.overSample, render),
  toneSlope:
    new widget.NumberInput(detailRender, "Tone Slope [dB/oct]", param.toneSlope, render),
  dcHighpassHz:
    new widget.NumberInput(detailRender, "DC Highpass [Hz]", param.dcHighpassHz, render),

  attackTimeSeconds: new widget.NumberInput(
    detailEnvelope, "Attack Time [s]", param.attackTimeSeconds, render),
  attackLevel:
    new widget.NumberInput(detailEnvelope, "Attack Level", param.attackLevel, render),
  decayTimeSeconds: new widget.NumberInput(
    detailEnvelope, "Decay Time [s]", param.decayTimeSeconds, render),
  decayLevel:
    new widget.NumberInput(detailEnvelope, "Decay Level", param.decayLevel, render),
  pitchEnvOctave: new widget.NumberInput(
    detailEnvelope, "Env -> Pitch [oct]", param.pitchEnvOctave, render),
  pwmLfoRateEnvOctave: new widget.NumberInput(
    detailEnvelope, "Env -> PWM Rate [oct]", param.pwmLfoRateEnvOctave, render),

  noteNumber:
    new widget.NumberInput(detailOscillator, "Note Number", param.noteNumber, render),
  pwmLfoRateHz:
    new widget.NumberInput(detailOscillator, "PWM Rate [Hz]", param.pwmLfoRateHz, render),
  mainPwmAmount:
    new widget.NumberInput(detailOscillator, "Main PWM", param.mainPwmAmount, render),
  subPwmAmount:
    new widget.NumberInput(detailOscillator, "Sub PWM", param.subPwmAmount, render),
  subExtraMix:
    new widget.NumberInput(detailOscillator, "Sub Extra", param.subExtraMix, render),

  chorusMix: new widget.NumberInput(detailChorus, "Mix", param.chorusMix, render),
  chorusAM: new widget.NumberInput(detailChorus, "AM", param.chorusAM, render),
  chorusTimeBaseSeconds: new widget.NumberInput(
    detailChorus, "Base Time [s]", param.chorusTimeBaseSeconds, render),
  chorusTimeModSeconds: new widget.NumberInput(
    detailChorus, "Mod Time [s]", param.chorusTimeModSeconds, render),
  chorusDelayCount:
    new widget.NumberInput(detailChorus, "Delay Count", param.chorusDelayCount, render),
  chorusLfoSpread:
    new widget.NumberInput(detailChorus, "LFO Spread", param.chorusLfoSpread, render),
};

render();
window.addEventListener("load", (ev) => { widget.refresh(ui); });
