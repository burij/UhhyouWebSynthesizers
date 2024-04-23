// Copyright Takamitsu Endo
// SPDX-License-Identifier: Apache-2.0

import {oversampleLinearPhaseItems} from "../common/dsp/multirate.js";

export const oversampleItems = oversampleLinearPhaseItems;
export const sampleRateScalerItems = ["1", "2", "4", "8", "16"];

export const basePeriodItems = [
  "2",
  "3",
  "5",
  "7",
  "11",
  "13",
  "17",
  "19",
  "23",
];

export const filterTypeItems = [
  "EmaLowpass1A1",
  "Lowpass1A1",
  "Lowpass1H1",
  "Lowpass1H1Alt",
  "BroadPeakingLowpass",
  "Lowpass2A2",
  "CascadedLowpass1",
  "Lowpass3SpringDamper - A",
  "Lowpass3SpringDamper - B",
  "Lowpass3SpringDamper - C",
  "Lowpass3SpringDamper - D",
  "DoubleSpringFilter4 - A",
  "DoubleSpringFilter4 - B",
];

export const pitchScaleItems = [
  "\"Notes in Scale\" List",
  "Just Intonation [0, 2, 5, 7]",
  "Just Intonation [0, 3, 7, 10]",
  "Just Intonation [0, 4, 7, 11]",
  "ET5",
  "Harmonic Series <= 16",
  "Harmonic Series Odd <= 15",
  "Pythagorean [0, 2, 4, 7, 9]",
  "Pythagorean [0, 3, 5, 8, 10]",
  "Detuned Major",
];

export const arpeggioScaleItems = [
  "\"Notes in Scale\" List",
  "Harmonic Series",
];
