// Copyright 2023 Takamitsu Endo
// SPDX-License-Identifier: Apache-2.0

export const justIntonationTable = [
  1 / 1,   // 0
  16 / 15, // 1
  15 / 14, // 1 (7-limit)
  14 / 13, // 1 (17-limit)
  10 / 9,  // 2 Pairs with 9.
  9 / 8,   // 2 Pairs with 7.
  8 / 7,   // 2 (7 or 17-limit)
  6 / 5,   // 3
  5 / 4,   // 4
  4 / 3,   // 5
  45 / 32, // 6 aug. Pairs with 11.
  25 / 18, // 6 aug. Pairs with 11.
  7 / 5,   // 6 aug. (7-limit)
  17 / 12, // 6 aug. (17-limit)
  64 / 45, // 6 dim. Pairs with 1.
  36 / 25, // 6 dim. Pairs with 1.
  10 / 7,  // 6 dim. (7-limit)
  24 / 17, // 6 dim. (17-limit)
  3 / 2,   // 7
  8 / 5,   // 8
  5 / 3,   // 9
  16 / 9,  // 10 Pairs with 5.
  9 / 5,   // 10 Pairs with 3.
  7 / 4,   // 10 (7 or 17-limit)
  15 / 8,  // 11
  13 / 7,  // 11 (17-limit)
];

export function constructIntJustScale(
  basePeriod,
  octaveStart,
  octaveRange,
  arpeggioNotes,
) {
  const justRatio = justIntonationTable.filter((_, index) => arpeggioNotes[index] > 0);

  let rootPeriod = basePeriod * (1 << (-octaveStart));
  if (justRatio.length <= 0) return [rootPeriod];

  justRatio.sort((a, b) => a - b);
  let periods = new Set();
  loop: for (let oct = octaveStart; oct < octaveStart + octaveRange; ++oct) {
    for (let rt of justRatio) {
      const newPeriod = Math.round(rootPeriod / rt);
      if (newPeriod < basePeriod) break loop;
      periods.add(newPeriod);
    }
    rootPeriod /= 2;
  }
  const lastPeriod = Math.ceil(rootPeriod / justRatio[0]);
  if (lastPeriod >= basePeriod) periods.add(lastPeriod);

  return Array.from(periods);
}
