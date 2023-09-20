// Copyright 2023 Takamitsu Endo
// SPDX-License-Identifier: Apache-2.0

import {IntDelay, LongAllpass} from "../common/dsp/delay.js";
import {DoubleEmaADEnvelope} from "../common/dsp/envelope.js";
import {constructHouseholder} from "../common/dsp/fdn.js";
import {Limiter} from "../common/dsp/limiter.js";
import {downSampleIIR} from "../common/dsp/multirate.js";
import {nextPrime} from "../common/dsp/prime.js";
import {SlopeFilter} from "../common/dsp/slopefilter.js";
import {RateLimiter} from "../common/dsp/smoother.js";
import {MatchedBiquad, SVFHP} from "../common/dsp/svf.js";
import {circularModes, lerp, uniformDistributionMap} from "../common/util.js";
import {PcgRandom} from "../lib/pcgrandom/pcgrandom.js";

import * as menuitems from "./menuitems.js";

const exp2Scaler = Math.log(2);

// A badly tuned lowpass based on complex resonator.
class ComplexLowpass {
  // R in [0, 1].
  constructor(cutoffNormalized, R) {
    const theta = 2 * Math.PI * cutoffNormalized;
    this.a1re = R * Math.cos(theta);
    this.a1im = R * Math.sin(theta);

    this.b_re = (1 - this.a1re) / 2;
    this.b_im = -this.a1im / 2;

    this.x1 = 0;
    this.y1re = 0;
    this.y1im = 0;
  }

  process(x0) {
    const sumX = x0 + this.x1;
    this.y1re = this.b_re * sumX + this.a1re * this.y1re - this.a1im * this.y1im;
    this.y1im = this.b_im * sumX + this.a1re * this.y1im + this.a1im * this.y1re;

    this.x1 = x0;
    return this.y1re;
  }
}

class FilteredDelay {
  constructor(
    sampleRate,
    delaySamples,
    delayTimeModAmount,
    bandpassCut,
    bandpassQ,
  ) {
    this.delaySamples = delaySamples;
    this.bpCut = bandpassCut;
    this.bpQ = bandpassQ;

    this.delayTimeModAmount = delayTimeModAmount;
    this.timeSlew = new RateLimiter(0.5);

    this.delay = new IntDelay(sampleRate, 2 * delaySamples / sampleRate);
    this.bandpass = new MatchedBiquad();
  }

  process(input, mod) {
    const modScaled = Math.exp(mod);
    let sig = this.bandpass.bp(input, this.bpCut * modScaled, this.bpQ);
    this.timeSlew.process(Math.abs(this.delayTimeModAmount * input));
    return this.delay.processMod(
      sig, (this.delaySamples - this.timeSlew.value) / modScaled);
  }
}

class EasyFDN {
  constructor(sampleRate, upFold, crossGain, crossfeeds, delays) {
    const create2dArray = (x, y) => {
      let a = new Array(x);
      for (let i = 0; i < a.length; ++i) a[i] = new Array(y).fill(0);
      return a;
    };

    this.crossGainBase = crossGain;
    this.crossGain = crossGain;
    this.crossGainRate = 0.85 ** (1 / upFold);

    const size = crossfeeds.length;

    this.matrix = constructHouseholder(create2dArray(size, size), crossfeeds, true);
    this.buf = create2dArray(2, size);
    this.bufIndex = 0;

    this.delay = delays;

    const peakHoldSamples = (128 / 48000) * sampleRate;
    this.crossDecay = Math.pow(Number.EPSILON, 1 / (1024 * peakHoldSamples));
    this.threshold = this.delay.length;
  }

  process(input, mod) {
    this.bufIndex ^= 1;
    let front = this.buf[this.bufIndex];
    let back = this.buf[this.bufIndex ^ 1];
    front.fill(0);
    for (let i = 0; i < front.length; ++i) {
      for (let j = 0; j < front.length; ++j) front[i] += this.matrix[i][j] * back[j];
    }

    input /= this.delay.length;
    for (let i = 0; i < this.delay.length; ++i) {
      front[i] = this.delay[i].process(input + this.crossGain * front[i], mod);
    }

    const sum = front.reduce((sum, val) => sum + val, 0);
    if (this.threshold < sum) {
      this.crossGain *= sum > 100 ? this.crossGainRate : this.crossDecay;
    }
    return sum;
  }
}

class SerialAllpass {
  constructor(upRate, gain, delaySamples) {
    this.allpass = new Array(delaySamples.length);
    for (let idx = 0; idx < delaySamples.length; ++idx) {
      this.allpass[idx] = new LongAllpass(upRate, delaySamples[idx] / upRate);
      this.allpass[idx].prepare(delaySamples[idx], gain);
    }
  }

  process(input) {
    let sum = 0;
    for (let idx = 0; idx < this.allpass.length; ++idx) {
      input = this.allpass[idx].process(input);
      sum += input;
    }
    return sum;
  }
}

class WireEnvelope {
  constructor(decaySamples, decayCurve) {
    this.gain = Math.exp(exp2Scaler * decayCurve);
    this.decay = Math.pow(Number.EPSILON, 1 / decaySamples);
  }

  process() {
    const out = this.gain;
    this.gain *= this.decay;
    return Math.tanh(out);
  }
}

class Tanh {
  constructor(gain) { this.invGain = 1 / Math.max(gain, Number.EPSILON); }
  process(input) { return Math.tanh(input * this.invGain); }
}

class Bypass {
  process(input) { return input; }
}

// Unused. Staying here for further experimentation.
class EnergyStoreNoise {
  constructor() { this.sum = 0; }

  process(value, rng) {
    this.sum += Math.abs(value);
    const out = uniformDistributionMap(rng.number(), -this.sum, this.sum);
    this.sum -= Math.abs(out);
    return out;
  }
}

// `EnergyStore` thinly spreads the energy of collisions over time. This acts as a
// mitigation to not blow up FDN with collision.
//
// - Reference: https://www.gaussianwaves.com/2013/12/power-and-energy-of-a-signal/
class EnergyStore {
  constructor(decaySamples) {
    this.sum = 0;
    this.decay = -Math.log(Number.EPSILON) / decaySamples;
    this.gain = Math.exp(-this.decay);
  }

  process(value) {
    const absed = Math.abs(value);
    if (absed > Number.EPSILON) this.sum = (this.sum + value) * this.decay;
    return this.sum *= this.gain;
  }
}

function solveCollision(pos0, pos1, vel0, vel1, distance) {
  const dist = pos0 - pos1;
  if (dist >= distance) return [0, 0];

  let sum = Math.abs(pos0) + Math.abs(pos1);
  const v0 = Math.abs(vel0);
  const v1 = Math.abs(vel1);
  if (v0 + v1 >= Number.EPSILON) sum /= v0 + v1;
  return [sum * v1, -sum * v0];
}

function process(upRate, pv, dsp) {
  let sig = 0;

  if (dsp.noiseGain > Number.EPSILON) {
    const noise = dsp.noiseGain * uniformDistributionMap(dsp.rng.number(), -1, 1);
    dsp.noiseGain *= dsp.noiseDecay;
    sig += dsp.noiseLowpass.process(noise);
  }

  const env = dsp.envelope.process();

  const hit = Math.tanh(dsp.longAllpass.process(sig));
  const wire = dsp.wireAllpass.process(hit) * dsp.wireEnvelope.process();
  sig = lerp(hit, wire, pv.wireMix);

  if (pv.fdnMix > Number.EPSILON) {
    for (let idx = 0; idx < dsp.position.length - 1; ++idx) {
      [dsp.position[idx], dsp.position[idx + 1]] = solveCollision(
        dsp.position[idx],
        dsp.position[idx + 1],
        dsp.velocity[idx],
        dsp.velocity[idx + 1],
        pv.collisionDistance,
      );
    }

    for (let idx = 0; idx < dsp.fdn.length; ++idx) {
      const collision = dsp.energyStore[idx].process(dsp.position[idx]);
      const p0 = dsp.fdn[idx].process(sig * pv.matrixSize + collision, env);
      dsp.velocity[idx] = p0 - dsp.position[idx];
      dsp.position[idx] = p0;
    }

    sig = lerp(dsp.position[0], dsp.position[1], pv.fdnMix);
  } else {
    sig = dsp.fdn[0].process(sig * pv.matrixSize, env);
  }

  if (pv.dcHighpassHz > 0) sig = dsp.dcHighpass.hp(sig);
  if (pv.toneSlope < 1) sig = dsp.slopeFilter.process(sig);
  sig = dsp.limiter.process(sig);
  return sig;
}

function getPrimeRatios(length, octaveWrap = 0) {
  const ratios = new Array(length).fill(0);
  ratios[0] = 2;
  for (let i = 1; i < ratios.length; ++i) ratios[i] = nextPrime(ratios[i - 1]);

  if (octaveWrap === 0) {
    for (let i = 0; i < ratios.length; ++i) ratios[i] *= 0.5;
  } else {
    for (let i = 0; i < ratios.length; ++i) ratios[i] = 2 ** (Math.log2(ratios[i]) % 1);
  }

  return ratios;
}

function getPitchFunc(pv) {
  const pitchType = menuitems.pitchTypeItems[pv.pitchType];
  if (pitchType === "Harmonic") {
    return (index) => index + 1;
  } else if (pitchType === "Harmonic+12") {
    const series = [1, 4, 5, 12, 13, 15, 16, 24, 25, 31, 32, 33, 48, 49, 63, 64];
    return (index) => series[index % series.length];
  } else if (pitchType === "Harmonic*5") {
    const series = [1, 5, 8, 10, 15, 16, 20, 24, 25, 30, 32, 35, 40, 45, 50, 55, 60];
    return (index) => series[index % series.length];
  } else if (pitchType === "Harmonic Cycle(1, 5)") {
    const series = [1, 5];
    return (index) => series[index % 2];
  } else if (pitchType === "Harmonic Odd") {
    return (index) => 2 * index + 1;
  } else if (pitchType === "Semitone (1, 2, 7, 9)") {
    const series = [1, 8 / 7, 3 / 2, 5 / 3];
    return (index) => series[index % series.length];
  } else if (pitchType === "Circular Membrane Mode") {
    return (index) => circularModes[index % circularModes.length];
  } else if (pitchType === "Octave") {
    return (index) => 2 ** index;
  }
  const primeRatios = getPrimeRatios(pv.matrixSize);
  return (index) => primeRatios[index];
}

function prepareFdn(upRate, upFold, sampleRateScaler, pv, rng, isSecondary) {
  const delayOffset = isSecondary ? 2 ** pv.secondaryDelayOffset : 1;
  const bandpassCutHz = delayOffset * pv.delayTimeHz * 2 ** pv.bandpassCutRatio;
  const delayTimeHz = delayOffset * pv.delayTimeHz;

  const pitchFunc = getPitchFunc(pv);
  const pitchRatio = (index, spread, rndCent) => {
    const rndRange = exp2Scaler * rndCent / 1200;
    const freqSpread = lerp(1, pitchFunc(index), spread);
    return freqSpread
      * Math.exp(uniformDistributionMap(rng.number(), rndRange, rndRange));
  };

  let combs = new Array(pv.matrixSize);
  for (let idx = 0; idx < combs.length; ++idx) {
    const delayCutRatio = pitchRatio(idx, pv.delayTimeSpread, pv.pitchRandomCent);
    const bpCutRatio = pitchRatio(idx, pv.bandpassCutSpread, pv.pitchRandomCent);
    combs[idx] = new FilteredDelay(
      upRate,
      upRate / (delayTimeHz * delayCutRatio),
      pv.delayTimeModAmount * upFold * sampleRateScaler,
      bandpassCutHz * bpCutRatio / upRate,
      pv.bandpassQ,
    );
  }

  let crossFeedbackGain = pv.crossFeedbackGain;
  // if (pv.bandpassQ < 0.1 && pv.fdnMix > Number.EPSILON) crossFeedbackGain *= 0.25;
  // if (isSecondary) crossFeedbackGain *= Math.SQRT1_2;
  return new EasyFDN(
    upRate,
    upFold,
    crossFeedbackGain,
    pv.crossFeedbackRatio.slice(0, pv.matrixSize).map(v => v * v),
    combs,
  );
}

function prepareSerialAllpass(upRate, nAllpass, allpassMaxTimeHz, rng) {
  // Randomly set `delaySamples` with following conditions:
  // - The sum of `delaySamples` equals to `scaler`.
  // - Minimum delay time is 2 samples for each all-pass.
  let delaySamples = new Array(nAllpass).fill(0);
  const scaler
    = Math.max(0, Math.ceil(upRate * nAllpass / allpassMaxTimeHz) - 2 * nAllpass);
  let sumSamples = 0;
  for (let idx = 0; idx < nAllpass; ++idx) {
    delaySamples[idx] = rng.number();
    sumSamples += delaySamples[idx];
  }
  let sumFraction = 0;
  for (let idx = 0; idx < nAllpass; ++idx) {
    const samples = 2 + scaler * delaySamples[idx] / sumSamples;
    delaySamples[idx] = Math.floor(samples);
    sumFraction += samples - delaySamples[idx];
  }
  delaySamples[0] += Math.round(sumFraction);
  return new SerialAllpass(upRate, 0.95, delaySamples);
}

onmessage = async (event) => {
  const pv = event.data; // Parameter values.

  const upFold = parseInt(menuitems.oversampleItems[pv.overSample]);
  const upRate = upFold * pv.sampleRate;
  const sampleRateScaler = menuitems.sampleRateScalerItems[pv.sampleRateScaler];

  const stereoSeed = pv.stereoSeed === 0 ? 0 : 65537;
  const rng = new PcgRandom(BigInt(pv.seed + pv.channel * stereoSeed));

  let dsp = {};
  dsp.rng = rng;
  dsp.noiseGain = 1;
  dsp.noiseDecay = Math.pow(1e-3, 1 / (upRate * pv.noiseDecaySeconds));
  dsp.noiseLowpass = new ComplexLowpass(pv.noiseLowpassHz / upRate, 0.9);

  dsp.envelope = new DoubleEmaADEnvelope();
  dsp.envelope.noteOn(
    pv.envelopeModAmount * exp2Scaler, upRate * pv.envelopeAttackSeconds,
    upRate * pv.envelopeDecaySeconds);

  dsp.longAllpass = prepareSerialAllpass(upRate, 4, pv.allpassMaxTimeHz, dsp.rng);

  dsp.nWireAllpass = 4;
  dsp.wireAllpass
    = prepareSerialAllpass(upRate, dsp.nWireAllpass, pv.wireFrequencyHz, dsp.rng);
  dsp.wireEnvelope = new WireEnvelope(pv.wireDecaySeconds * upRate, 2);

  dsp.fdn = [prepareFdn(upRate, upFold, sampleRateScaler, pv, rng, false)];
  if (pv.fdnMix > Number.EPSILON) {
    dsp.fdn.push(prepareFdn(upRate, upFold, sampleRateScaler, pv, rng, true));
    dsp.position = [0, 0];
    dsp.velocity = [0, 0];
    const decaySamples = upRate * 0.001;
    dsp.energyStore = [new EnergyStore(decaySamples), new EnergyStore(decaySamples)];
  }

  dsp.slopeFilter = new SlopeFilter(Math.floor(Math.log2(24000 / 1000)));
  dsp.slopeFilter.setCutoff(upRate, 1000, pv.toneSlope, true);
  dsp.dcHighpass = new SVFHP(pv.dcHighpassHz / upRate, Math.SQRT1_2);

  if (pv.limiterType === 1) {
    dsp.limiter = new Limiter(
      pv.limiterSmoothingSeconds * upRate, 0.001 * upRate, 0, pv.limiterThreshold);
  } else if (pv.limiterType === 2) {
    dsp.limiter = new Tanh(pv.limiterThreshold);
  } else {
    dsp.limiter = new Bypass();
  }

  // Discard silence at start.
  let sig = 0;
  while (sig === 0) sig = process(upRate, pv, dsp);

  // Process.
  let sound = new Array(Math.floor(upRate * pv.renderDuration)).fill(0);
  sound[0] = sig;
  for (let i = 1; i < sound.length; ++i) sound[i] = process(upRate, pv, dsp);
  sound = downSampleIIR(sound, upFold);

  // Post effect.
  let gainEnv = 1;
  let decay = Math.pow(pv.decayTo, 1.0 / sound.length);
  for (let i = 0; i < sound.length; ++i) {
    sound[i] *= gainEnv;
    gainEnv *= decay;
  }

  postMessage({sound: sound});
}
