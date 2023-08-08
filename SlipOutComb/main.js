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

      if (Array.isArray(param[key])) {
        param[key].forEach(e => { e.normalized = Math.random(); });
      } else if (param[key].scale instanceof parameter.MenuItemScale) {
        // Do nothing for now.
      } else {
        param[key].normalized = Math.random();
      }
    }
  }

  onMatrixSizeChanged(param.matrixSize.dsp);
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

function onMatrixSizeChanged(value) {
  ui.crossFeedbackRatio.setViewRange(1, value);
  render();
}

const scales = {
  boolean: new parameter.IntScale(0, 1),

  renderDuration: new parameter.DecibelScale(-40, 40, false),
  fade: new parameter.DecibelScale(-60, 40, true),
  decayTo: new parameter.DecibelScale(util.ampToDB(1 / 2 ** 24), 0, false),
  stereoMerge: new parameter.LinearScale(0, 1),
  overSample: new parameter.MenuItemScale(menuitems.oversampleItems),
  toneSlope: new parameter.DecibelScale(-12, 0, false),

  limiterType: new parameter.MenuItemScale(menuitems.limiterTypeItems),
  limiterThreshold: new parameter.DecibelScale(-60, 40, false),
  limiterSmoothingSeconds: new parameter.DecibelScale(-80, -20, false),

  seed: new parameter.IntScale(0, 2 ** 32),
  noiseDecaySeconds: new parameter.DecibelScale(-60, 40, false),

  matrixSize: new parameter.IntScale(1, 8),
  crossFeedbackGain: new parameter.DecibelScale(-40, 40, true),
  feedbackDecaySeconds: new parameter.DecibelScale(-40, 20, false),
  crossFeedbackRatio: new parameter.LinearScale(-1, 1),

  pitchSpread: new parameter.LinearScale(0, 1),
  pitchRandomCent: new parameter.LinearScale(0, 1200),

  delayTimeHz: new parameter.DecibelScale(util.ampToDB(20), util.ampToDB(10000), false),
  delayTimeModSeconds: new parameter.DecibelScale(-80, 20, true),
  delayTimeModAmount:
    new parameter.BipolarExponentialScale(util.syntonicCommaCents / 1200, 8),
  bandpassCutHz: new parameter.DecibelScale(0, 100, false),
  bandpassQ: new parameter.DecibelScale(-40, 40, false),
  bandpassCutModRiseCents: new parameter.BipolarExponentialScale(0.01, 1200),
  bandpassCutModFallCents: new parameter.DecibelScale(-40, util.ampToDB(1200), false),
  feedbackGain: new parameter.DecibelScale(0, 40, false),
  lossThreshold: new parameter.DecibelScale(-60, 40, false),
};

const param = {
  renderDuration: new parameter.Parameter(0.5, scales.renderDuration, true),
  fadeIn: new parameter.Parameter(0.01, scales.fade, true),
  fadeOut: new parameter.Parameter(0.002, scales.fade, true),
  decayTo: new parameter.Parameter(1, scales.decayTo, false),
  stereoMerge: new parameter.Parameter(0, scales.stereoMerge),
  overSample: new parameter.Parameter(1, scales.overSample),
  toneSlope: new parameter.Parameter(1, scales.toneSlope, false),

  limiterType: new parameter.Parameter(1, scales.limiterType, true),
  limiterThreshold: new parameter.Parameter(1, scales.limiterThreshold, false),
  limiterSmoothingSeconds:
    new parameter.Parameter(0.02, scales.limiterSmoothingSeconds, true),

  seed: new parameter.Parameter(0, scales.seed, true),
  noiseDecaySeconds: new parameter.Parameter(0.5, scales.noiseDecaySeconds, true),

  matrixSize: new parameter.Parameter(3, scales.matrixSize, true),
  crossFeedbackGain: new parameter.Parameter(1, scales.crossFeedbackGain, false),
  crossFeedbackLossThreshold: new parameter.Parameter(1, scales.lossThreshold, false),
  crossFeedbackDecaySeconds:
    new parameter.Parameter(1, scales.feedbackDecaySeconds, true),
  crossFeedbackRatio: createArrayParameters(
    new Array(scales.matrixSize.max).fill(0), scales.crossFeedbackRatio,
    scales.matrixSize.max),

  delayTimeSpread: new parameter.Parameter(1, scales.pitchSpread, true),
  delayTimeRandomCent:
    new parameter.Parameter(util.syntonicCommaCents, scales.pitchRandomCent, true),
  bandpassCutSpread: new parameter.Parameter(1, scales.pitchSpread, true),
  bandpassCutRandomCent:
    new parameter.Parameter(util.syntonicCommaCents, scales.pitchRandomCent, true),

  delayTimeHz: new parameter.Parameter(100, scales.delayTimeHz, true),
  delayTimeModSeconds: new parameter.Parameter(0.125, scales.delayTimeModSeconds, true),
  delayTimeModAmount: new parameter.Parameter(0.0, scales.delayTimeModAmount, true),
  bandpassCutHz: new parameter.Parameter(100, scales.bandpassCutHz, true),
  bandpassQ: new parameter.Parameter(Math.SQRT1_2, scales.bandpassQ, true),
  bandpassCutModRiseCents:
    new parameter.Parameter(1, scales.bandpassCutModRiseCents, true),
  bandpassCutModFallCents:
    new parameter.Parameter(1, scales.bandpassCutModFallCents, true),
  bandpassLossThreshold: new parameter.Parameter(1, scales.lossThreshold, false),
  feedbackGain: new parameter.Parameter(1, scales.feedbackGain, false),
  feedbackLossThreshold: new parameter.Parameter(1, scales.lossThreshold, false),
  feedbackDecaySeconds: new parameter.Parameter(1, scales.feedbackDecaySeconds, true),
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
const detailLimiter = widget.details(divLeft, "Limiter");
const detailOsc = widget.details(divRightA, "Oscillator");
const detailFDN = widget.details(divRightA, "FDN");
const detailPitch = widget.details(divRightB, "Pitch");
const detailComb = widget.details(divRightB, "Comb");

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

  limiterType: new widget.ComboBoxLine(detailLimiter, "Type", param.limiterType, render),
  limiterThreshold: new widget.NumberInput(
    detailLimiter, "Threshold [dB]", param.limiterThreshold, render),
  limiterSmoothingSeconds: new widget.NumberInput(
    detailLimiter, "Smoothing [s]", param.limiterSmoothingSeconds, render),

  seed: new widget.NumberInput(detailOsc, "Seed", param.seed, render),
  noiseDecaySeconds:
    new widget.NumberInput(detailOsc, "Noise Decay [s]", param.noiseDecaySeconds, render),

  matrixSize: new widget.NumberInput(
    detailFDN, "Matrix Size", param.matrixSize, onMatrixSizeChanged),
  crossFeedbackGain: new widget.NumberInput(
    detailFDN, "Cross Feedback Gain [dB]", param.crossFeedbackGain, render),
  crossFeedbackLossThreshold: new widget.NumberInput(
    detailFDN, "Cross Feedback Loss Threshold [dB]", param.crossFeedbackLossThreshold,
    render),
  crossFeedbackDecaySeconds: new widget.NumberInput(
    detailFDN, "Cross Feedback Decay [s]", param.crossFeedbackDecaySeconds, render),
  crossFeedbackRatio: new widget.BarBox(
    detailFDN, "Cross Feedback Ratio", uiSize.barboxWidth, uiSize.barboxHeight,
    param.crossFeedbackRatio, render),

  delayTimeSpread: new widget.NumberInput(
    detailPitch, "Delay Time Spread", param.delayTimeSpread, render),
  delayTimeRandomCent: new widget.NumberInput(
    detailPitch, "Delay Time Random [cent]", param.delayTimeRandomCent, render),
  bandpassCutSpread:
    new widget.NumberInput(detailPitch, "BP Cut Spread", param.bandpassCutSpread, render),
  bandpassCutRandomCent: new widget.NumberInput(
    detailPitch, "BP Cut Random [cent]", param.bandpassCutRandomCent, render),

  delayTimeHz:
    new widget.NumberInput(detailComb, "Delay [Hz]", param.delayTimeHz, render),
  delayTimeModSeconds: new widget.NumberInput(
    detailComb, "Delay Moddulation Smoothing [s]", param.delayTimeModSeconds, render),
  delayTimeModAmount: new widget.NumberInput(
    detailComb, "Delay Moddulation Amount [oct]", param.delayTimeModAmount, render),
  bandpassCutHz:
    new widget.NumberInput(detailComb, "BP Cut [Hz]", param.bandpassCutHz, render),
  bandpassQ: new widget.NumberInput(detailComb, "BP Q", param.bandpassQ, render),
  bandpassCutModRiseCents: new widget.NumberInput(
    detailComb, "BP Cut Modulation Rise [cent]", param.bandpassCutModRiseCents, render),
  bandpassCutModFallCents: new widget.NumberInput(
    detailComb, "BP Cut Modulation Fall [cent]", param.bandpassCutModFallCents, render),
  bandpassLossThreshold: new widget.NumberInput(
    detailComb, "BP Loss Threshold [dB]", param.bandpassLossThreshold, render),
  feedbackGain:
    new widget.NumberInput(detailComb, "Feedback Gain [dB]", param.feedbackGain, render),
  feedbackLossThreshold: new widget.NumberInput(
    detailComb, "Feedback Loss Threshold [dB]", param.feedbackLossThreshold, render),
  feedbackDecaySeconds: new widget.NumberInput(
    detailComb, "Feedback Decay [s]", param.feedbackDecaySeconds, render),
};

ui.crossFeedbackRatio.sliderZero = 0.5;

onMatrixSizeChanged(param.matrixSize.defaultDsp);
window.addEventListener("load", (ev) => { widget.refresh(ui); });
