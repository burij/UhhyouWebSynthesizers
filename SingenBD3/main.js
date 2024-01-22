// Copyright 2022 Takamitsu Endo
// SPDX-License-Identifier: Apache-2.0

import {palette, uiSize} from "../common/gui/palette.js";
import * as widget from "../common/gui/widget.js";
import * as parameter from "../common/parameter.js";
import * as util from "../common/util.js";
import * as wave from "../common/wave.js";

import * as menuitems from "./menuitems.js";

const version = 0;

const localRecipeBook = {
  "Default": {
    renderDuration:
      (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 0.1, 0.8); },
    fadeIn: () => {},
    fadeOut: () => {},
    decayTo: (prm) => { prm.ui = util.uniformDistributionMap(Math.random(), -40, 0); },
    overSample: () => {},
    sampleRateScaler: () => {},
    baseFreq: (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 10, 90); },
    pitchSuperellipseCurve: () => {},
    modCurve: () => {},
    limiterAttack: () => {},
    limiterRelease: () => {},
  },
  "Dry BD": {
    renderDuration: () => {},
    fadeIn: () => {},
    fadeOut: () => {},
    decayTo:
      (prm) => { prm.dsp = util.exponentialMap(Math.random(), util.dbToAmp(-20), 1); },
    stereoMerge: () => {},
    overSample: () => {},
    sampleRateScaler: () => {},
    baseFreq: (prm) => { prm.dsp = util.exponentialMap(Math.random(), 10, 90); },
    pitchDropBezier:
      (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 1, 3); },
    pitchDropBezierPower:
      (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 0.9, 1.1); },
    pitchDropSuperellipse:
      (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 3.0, 10.0); },
    pitchSuperellipseCurve: () => {},
    pitchSuperellipseDuration: (prm) => {
      prm.dsp = util.exponentialMap(Math.random(), 0.1, scales.decaySecond.maxDsp);
    },
    modCurve: () => {},
    overtoneRandomizeType: (prm) => { prm.normalized = 0; },
    limiterAttack: () => {},
    limiterRelease: () => {},
    limiterInputGain: () => {},
    reverbMix: (prm) => { prm.normalized = 0; },
  },
  "Micro BD": {
    renderDuration:
      (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 0.05, 0.3); },
    fadeIn: () => {},
    fadeOut: () => {},
    decayTo: (prm) => { prm.ui = util.uniformDistributionMap(Math.random(), -20, 0); },
    overSample: () => {},
    sampleRateScaler: () => {},
    overtoneRandomizeType: () => {},
    nOvertone: () => {},
    limiterAttack: () => {},
    limiterSustain: () => {},
    limiterRelease: () => {},
    limiterInputGain: (prm) => { prm.normalized = 0; },
    gainBezier: (prm) => {
      prm[2].normalized = 1; // x2
      prm[3].normalized = 0; // y2
    },
    baseFreq: (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 10, 90); },
    pitchDropBezier: (prm) => { prm.normalized = 0; },
    pitchDropSuperellipse: (prm) => { prm.normalized = 0; },
    mod1Amount: (prm) => { prm.normalized = 0; },
    reverbMix: (prm) => { prm.normalized = 0; },
  },
  "Short Bass": {
    renderDuration:
      (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 0.05, 0.3); },
    fadeIn: () => {},
    fadeOut: () => {},
    decayTo: (prm) => { prm.ui = util.uniformDistributionMap(Math.random(), -40, 0); },
    stereoMerge: () => {},
    overSample: () => {},
    sampleRateScaler: () => {},
    limiterAttack: () => {},
    limiterSustain: () => {},
    limiterRelease: () => {},
    baseFreq: (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 10, 90); },
    pitchDropBezier: (prm) => { prm.normalized = 0; },
    pitchDropSuperellipse: (prm) => { prm.normalized = 0; },
    mod1Amount: (prm) => { prm.normalized = 0; },
  },
  "FM Bass": {
    renderDuration:
      (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 0.05, 0.8); },
    fadeIn: () => {},
    fadeOut: () => {},
    decayTo: (prm) => { prm.ui = util.uniformDistributionMap(Math.random(), -40, 0); },
    stereoMerge: () => {},
    overSample: () => {},
    sampleRateScaler: () => {},
    limiterAttack: () => {},
    limiterSustain: () => {},
    limiterRelease: () => {},
    baseFreq: (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 10, 90); },
    pitchDropBezier: (prm) => { prm.normalized = 0; },
    pitchDropSuperellipse: (prm) => { prm.normalized = 0; },
    modDecayDuration:
      (prm) => { prm.dsp = util.uniformDistributionMap(Math.random(), 0.01, 10); },
    mod2Amount: (prm) => {
      prm.normalized = util.exponentialMap(Math.random(), Number.EPSILON, 0.2);
    },
  },
};

function applyLocalRecipe(param, recipe) {
  for (const key in param) {
    if (recipe.hasOwnProperty(key)) {
      recipe[key](param[key]);
    } else if (Array.isArray(param[key])) {
      param[key].forEach(e => { e.normalized = Math.random(); });
    } else if (param[key].scale instanceof parameter.MenuItemScale) {
      // Do nothing.
    } else {
      param[key].normalized = Math.random();
    }
  };
}

function addLocalRecipes(source, target) {
  let tgt = new Map(target); // Don't mutate original.
  for (const [key, recipe] of Object.entries(source)) {
    tgt.set(` - ${key}`, {randomize: (param) => applyLocalRecipe(param, recipe)});
  }
  return new Map([...tgt.entries()].sort()); // Sort by key.
}

function getSampleRateScaler() {
  return parseInt(menuitems.sampleRateScalerItems[param.sampleRateScaler.dsp]);
}

function createBezierEnvelopeParameters(x1 = 0.2, y1 = 0.2, x2 = 0.8, y2 = 0.8) {
  return [
    new parameter.Parameter(x1, scales.defaultScale, false, "x1"),
    new parameter.Parameter(y1, scales.defaultScale, false, "y1"),
    new parameter.Parameter(x2, scales.defaultScale, false, "x2"),
    new parameter.Parameter(y2, scales.defaultScale, false, "y2"),
  ];
}

function render() {
  audio.render(
    parameter.toMessage(param, {
      sampleRate: audio.audioContext.sampleRate * getSampleRateScaler(),
      maxDelayTime: 2 * scales.reverbSecond.maxDsp,
    }),
    "perChannel",
    playControl.togglebuttonQuickSave.state === 1,
  );
}

const scales = {
  defaultScale: new parameter.LinearScale(0, 1),

  renderDuration: new parameter.DecibelScale(-40, 40, false),
  fade: new parameter.DecibelScale(-60, 40, true),
  decayTo: new parameter.DecibelScale(util.ampToDB(1 / 2 ** 24), 0, false),
  stereoMerge: new parameter.LinearScale(0, 1),
  overSample: new parameter.MenuItemScale(menuitems.oversampleItems),
  sampleRateScaler: new parameter.MenuItemScale(menuitems.sampleRateScalerItems),

  seed: new parameter.IntScale(0, 2 ** 53),
  bezierPower: new parameter.DecibelScale(-20, util.ampToDB(128), true),
  baseFreq: new parameter.MidiPitchScale(-24, 96, false),
  superellipseCurve: new parameter.DecibelScale(-20, 0, false),
  decaySecond: new parameter.DecibelScale(-60, util.ampToDB(10), true),
  pitchDropOctave: new parameter.DecibelScale(-40, 40, true),
  pitchRatio: new parameter.LinearScale(0, 32),
  modAmount: new parameter.DecibelScale(-40, 40, true),

  nOvertone: new parameter.IntScale(1, 64),
  overtoneRandomizeType: new parameter.MenuItemScale(menuitems.overtoneRandomizeItems),
  pitchRandomRange: new parameter.LinearScale(1, 5),
  overtoneAmp: new parameter.DecibelScale(0, 40, false),

  limiterAttack: new parameter.DecibelScale(-80, -40, false),
  limiterRelease: new parameter.DecibelScale(-60, 0, true),
  limiterInputGain: new parameter.DecibelScale(0, 20, false),

  reverbMix: new parameter.DecibelScale(-60, 0, true),
  matrixSize: new parameter.IntScale(1, 64),
  reverbSecond: new parameter.DecibelScale(-60, -20, true),
  reverbLowpassHz: new parameter.MidiPitchScale(
    util.freqToMidiPitch(100), util.freqToMidiPitch(48000), false),
  feedback: new parameter.NegativeDecibelScale(-60, 0, 1, true),
};

const param = {
  renderDuration: new parameter.Parameter(1 / 3, scales.renderDuration, true),
  fadeIn: new parameter.Parameter(0.001, scales.fade, true),
  fadeOut: new parameter.Parameter(0.002, scales.fade, true),
  decayTo: new parameter.Parameter(0.01, scales.decayTo, false),
  stereoMerge: new parameter.Parameter(0, scales.stereoMerge),
  overSample: new parameter.Parameter(0, scales.overSample),
  sampleRateScaler: new parameter.Parameter(0, scales.sampleRateScaler),
  seed: new parameter.Parameter(0, scales.seed),

  overtoneRandomizeType: new parameter.Parameter(
    menuitems.overtoneRandomizeItems.indexOf("Stereo"), scales.overtoneRandomizeType),
  nOvertone: new parameter.Parameter(2, scales.nOvertone, true),
  pitchRandomRange: new parameter.Parameter(1, scales.pitchRandomRange, true),
  overtoneAmp: new parameter.Parameter(1, scales.overtoneAmp, true),

  gainBezier: createBezierEnvelopeParameters(0.6, 0.4, 0.95, 0.6),
  pitchBezier: createBezierEnvelopeParameters(),
  baseFreq: new parameter.Parameter(30, scales.baseFreq, true),
  pitchDropBezier: new parameter.Parameter(1, scales.pitchDropOctave, true),
  pitchDropBezierPower: new parameter.Parameter(1, scales.bezierPower, true),
  pitchDropSuperellipse: new parameter.Parameter(12, scales.pitchDropOctave, true),
  pitchSuperellipseCurve: new parameter.Parameter(0.3, scales.superellipseCurve, true),
  pitchSuperellipseDuration: new parameter.Parameter(0.5, scales.decaySecond, true),

  modDecayDuration: new parameter.Parameter(0.5, scales.decaySecond, true),
  modCurve: new parameter.Parameter(0.2, scales.superellipseCurve, true),
  mod1PitchRatio: new parameter.Parameter(8, scales.pitchRatio),
  mod2PitchRatio: new parameter.Parameter(8, scales.pitchRatio),
  mod1Amount: new parameter.Parameter(1, scales.modAmount, true),
  mod2Amount: new parameter.Parameter(0.62, scales.modAmount, true),

  limiterAttack: new parameter.Parameter(4 / 3000, scales.limiterAttack, true),
  limiterSustain: new parameter.Parameter(5 / 3000, scales.limiterAttack, true),
  limiterRelease: new parameter.Parameter(0, scales.limiterRelease, true),
  limiterInputGain: new parameter.Parameter(1, scales.limiterInputGain, false),

  reverbMix: new parameter.Parameter(0.1, scales.reverbMix),
  matrixSize: new parameter.Parameter(8, scales.matrixSize),
  reverbBaseSecond: new parameter.Parameter(0.01, scales.reverbSecond, true),
  reverbLowpassHz:
    new parameter.Parameter(scales.reverbLowpassHz.maxDsp, scales.reverbLowpassHz, true),
  feedback: new parameter.Parameter(0.98, scales.feedback, true),
};

const recipeBook = addLocalRecipes(localRecipeBook, await parameter.loadJson(param, [
  "recipe/full.json",
  "recipe/init.json",
]));

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
const divRight = widget.div(divMain, undefined, "controlBlock");

const headingWaveform = widget.heading(divLeft, 6, "Waveform");
const waveView = [
  new widget.WaveView(
    divLeft, uiSize.waveViewWidth, uiSize.waveViewHeight, audio.wave.data[0], false),
  new widget.WaveView(
    divLeft, uiSize.waveViewWidth, uiSize.waveViewHeight, audio.wave.data[1], false),
];

const pRenderStatus = widget.paragraph(divLeft, "renderStatus", undefined);
audio.renderStatusElement = pRenderStatus;

const recipeExportDialog = new widget.RecipeExportDialog(document.body, (ev) => {
  parameter.downloadJson(
    param, version, recipeExportDialog.author, recipeExportDialog.recipeName);
});
const recipeImportDialog = new widget.RecipeImportDialog(document.body, (ev, data) => {
  widget.option(playControl.selectRandom, parameter.addRecipe(param, recipeBook, data));
});

const playControl = widget.playControl(
  divLeft,
  (ev) => { audio.play(getSampleRateScaler()); },
  (ev) => { audio.stop(); },
  (ev) => { audio.save(false, [], getSampleRateScaler()); },
  (ev) => {},
  (ev) => {
    recipeBook.get(playControl.selectRandom.value).randomize(param);
    render();
    widget.refresh(ui);
  },
  [...recipeBook.keys()],
  (ev) => {
    const recipeOptions = {author: "temp", recipeName: util.getTimeStamp()};
    const currentRecipe = parameter.dumpJsonObject(param, version, recipeOptions);
    const optionName = parameter.addRecipe(param, recipeBook, currentRecipe);
    widget.option(playControl.selectRandom, optionName);
  },
  (ev) => { recipeExportDialog.open(); },
  (ev) => { recipeImportDialog.open(); },
);

const detailRender = widget.details(divLeft, "Render");
const detailOvertone = widget.details(divLeft, "Overtone");
const detailLimiter = widget.details(divLeft, "Limiter");
const detailBody = widget.details(divRight, "Body");
const detailClick = widget.details(divRight, "Click");
const detailReverb = widget.details(divRight, "Reverb");

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
  sampleRateScaler: new widget.ComboBoxLine(
    detailRender, "Sample Rate Scale", param.sampleRateScaler, render),
  seed: new widget.NumberInput(detailRender, "Seed", param.seed, render),

  overtoneRandomizeType: new widget.CheckBoxLine(
    detailOvertone, "Randomize Type", ["𐄢 Mono", "𐄣 Stereo"], param.overtoneRandomizeType,
    render),
  nOvertone: new widget.NumberInput(detailOvertone, "nOvertone", param.nOvertone, render),
  pitchRandomRange: new widget.NumberInput(
    detailOvertone, "Pitch Random Range", param.pitchRandomRange, render),
  overtoneAmp:
    new widget.NumberInput(detailOvertone, "Amp Descend", param.overtoneAmp, render),

  gainBezier: new widget.BezierEnvelopeView(
    detailBody, palette.fontSize * 15, palette.fontSize * 8, param.gainBezier, "Gain",
    render),
  pitchBezier: new widget.BezierEnvelopeView(
    detailBody, palette.fontSize * 15, palette.fontSize * 8, param.pitchBezier, "Pitch",
    render),
  baseFreq:
    new widget.NumberInput(detailBody, "Base Frequency [Hz]", param.baseFreq, render),
  pitchDropBezier: new widget.NumberInput(
    detailBody, "Bezier Range [oct]", param.pitchDropBezier, render),
  pitchDropBezierPower: new widget.NumberInput(
    detailBody, "Bezier Power", param.pitchDropBezierPower, render),
  pitchDropSuperellipse: new widget.NumberInput(
    detailBody, "S.ellip Range [oct]", param.pitchDropSuperellipse, render),
  pitchSuperellipseCurve: new widget.NumberInput(
    detailBody, "S.ellip Curve", param.pitchSuperellipseCurve, render),
  pitchSuperellipseDuration: new widget.NumberInput(
    detailBody, "S.ellip Duration", param.pitchSuperellipseDuration, render),

  modDecayDuration:
    new widget.NumberInput(detailClick, "Duration [s]", param.modDecayDuration, render),
  modCurve: new widget.NumberInput(detailClick, "Curve", param.modCurve, render),
  mod1PitchRatio: new widget.NumberInput(
    detailClick, "Mod. 1 Pitch Ratio", param.mod1PitchRatio, render),
  mod2PitchRatio: new widget.NumberInput(
    detailClick, "Mod. 2 Pitch Ratio", param.mod2PitchRatio, render),
  mod1Amount:
    new widget.NumberInput(detailClick, "Mod. 1 Amount", param.mod1Amount, render),
  mod2Amount:
    new widget.NumberInput(detailClick, "Mod. 2 Amount", param.mod2Amount, render),

  limiterAttack:
    new widget.NumberInput(detailLimiter, "Attack [s]", param.limiterAttack, render),
  limiterSustain:
    new widget.NumberInput(detailLimiter, "Sustain [s]", param.limiterSustain, render),
  limiterRelease:
    new widget.NumberInput(detailLimiter, "Release [s]", param.limiterRelease, render),
  limiterInputGain: new widget.NumberInput(
    detailLimiter, "Input Gain [dB]", param.limiterInputGain, render),

  reverbMix: new widget.NumberInput(detailReverb, "Mix [dB]", param.reverbMix, render),
  matrixSize:
    new widget.NumberInput(detailReverb, "Matrix Size", param.matrixSize, render),
  reverbBaseSecond:
    new widget.NumberInput(detailReverb, "Time Base [s]", param.reverbBaseSecond, render),
  reverbLowpassHz: new widget.NumberInput(
    detailReverb, "Lowpass Cutoff [Hz]", param.reverbLowpassHz, render),
  feedback: new widget.NumberInput(detailReverb, "Feedback", param.feedback, render),
};

ui.mod1PitchRatio.number.step = 1;
ui.mod2PitchRatio.number.step = 1;

render();
window.addEventListener("load", (ev) => { widget.refresh(ui); });
