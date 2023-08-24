// Copyright 2023 Takamitsu Endo
// SPDX-License-Identifier: Apache-2.0

import {oversampleIirItems} from "../common/dsp/multirate.js";

export const oversampleItems = oversampleIirItems;

export const enableClipperItems = [
  "Bypass",
  "tanh",
];

export const stereoSeedItems = [
  "Mono",
  "Stereo",
];
