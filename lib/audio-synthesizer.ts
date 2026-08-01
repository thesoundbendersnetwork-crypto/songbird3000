// Utility to generate real, playable WAV audio Blobs/Data URLs on the fly using Web Audio API / PCM synthesis.
// Guarantees every generated song or separated stem has actual, working audio!

export function createSynthesizedAudioWav(
  genre: string = "Hip Hop",
  bpm: number = 120,
  durationSec: number = 15,
  stemType: 'full' | 'vocals' | 'drums' | 'bass' | 'instruments' = 'full'
): string {
  const sampleRate = 44100;
  const numChannels = 2;
  const totalFrames = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(totalFrames * numChannels);

  // Musical parameters
  const beatSec = 60 / Math.max(60, Math.min(180, bpm));
  const framesPerBeat = Math.floor(sampleRate * beatSec);

  // Scale frequencies (C Major / A Minor chord progression: C, G, Am, F)
  const chordFreqs = [
    [261.63, 329.63, 392.00], // C
    [196.00, 246.94, 293.66], // G
    [220.00, 261.63, 329.63], // Am
    [174.61, 220.00, 261.63], // F
  ];
  
  const bassFreqs = [130.81, 98.00, 110.00, 87.31]; // C2, G1, A1, F1

  for (let i = 0; i < totalFrames; i++) {
    const t = i / sampleRate;
    const currentBeat = t / beatSec;
    const measureIndex = Math.floor(currentBeat / 4) % 4;
    const beatInMeasure = currentBeat % 4;
    const frameInBeat = i % framesPerBeat;

    let left = 0;
    let right = 0;

    // --- 1. DRUMS STEM ---
    if (stemType === 'full' || stemType === 'drums') {
      // Kick drum on beats 0 & 2 (and 2.5 for syncopation)
      if (beatInMeasure < 0.2 || (beatInMeasure >= 2.0 && beatInMeasure < 2.2) || (beatInMeasure >= 3.5 && beatInMeasure < 3.7)) {
        const kickT = (frameInBeat % (framesPerBeat / 2)) / sampleRate;
        const kickEnv = Math.exp(-kickT * 35);
        const kickPitch = 120 * Math.exp(-kickT * 50) + 40;
        const kickSample = Math.sin(2 * Math.PI * kickPitch * kickT) * kickEnv * 0.7;
        left += kickSample;
        right += kickSample;
      }

      // Snare / Clack on beats 1 & 3
      if ((beatInMeasure >= 1.0 && beatInMeasure < 1.25) || (beatInMeasure >= 3.0 && beatInMeasure < 3.25)) {
        const snareT = (frameInBeat % framesPerBeat) / sampleRate;
        const snareEnv = Math.exp(-snareT * 25);
        const noise = (Math.random() * 2 - 1) * snareEnv * 0.4;
        const tone = Math.sin(2 * Math.PI * 180 * snareT) * snareEnv * 0.3;
        left += (noise + tone);
        right += (noise + tone);
      }

      // Hi-Hat on 8th notes
      const eighthNote = (frameInBeat % (framesPerBeat / 2)) / sampleRate;
      const hatEnv = Math.exp(-eighthNote * 80);
      const hatSample = (Math.random() * 2 - 1) * hatEnv * 0.15;
      left += hatSample * 0.8;
      right += hatSample * 1.2;
    }

    // --- 2. BASS STEM ---
    if (stemType === 'full' || stemType === 'bass') {
      const bassFreq = bassFreqs[measureIndex];
      const bassEnv = Math.max(0, Math.sin(Math.PI * (currentBeat % 1))); // Pulse per beat
      const bassSample = (Math.sin(2 * Math.PI * bassFreq * t) + 0.5 * Math.sin(2 * Math.PI * bassFreq * 2 * t)) * 0.35 * bassEnv;
      left += bassSample;
      right += bassSample;
    }

    // --- 3. INSTRUMENTS / SYNTH STEM ---
    if (stemType === 'full' || stemType === 'instruments') {
      const currentChord = chordFreqs[measureIndex];
      for (let c = 0; c < currentChord.length; c++) {
        const freq = currentChord[c];
        const padSample = (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.cos(2 * Math.PI * freq * 1.5 * t)) * 0.08;
        const pan = (c - 1) * 0.3; // Stereo spread
        left += padSample * (1 - pan);
        right += padSample * (1 + pan);
      }

      // Arpeggio Lead
      const arpNote = Math.floor((currentBeat * 4) % 3);
      const arpFreq = currentChord[arpNote] * 2; // Octave higher
      const arpEnv = Math.exp(-((currentBeat * 4) % 1) * 8);
      const arpSample = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.12;
      left += arpSample * 1.1;
      right += arpSample * 0.9;
    }

    // --- 4. VOCALS STEM ---
    if (stemType === 'full' || stemType === 'vocals') {
      // Formant-synthesized vocal melody / humming hook
      const vocalPhase = (t * 2.5) % (Math.PI * 2);
      const vocalMelodyNote = [523.25, 587.33, 659.25, 523.25][Math.floor(currentBeat / 2) % 4]; // C5, D5, E5
      const formant1 = vocalMelodyNote;
      const formant2 = vocalMelodyNote * 1.5;
      const vibrato = Math.sin(2 * Math.PI * 6 * t) * 4;
      const vocalEnv = Math.sin(Math.PI * (t % 2) / 2) * 0.25;

      const vocalSample = (
        Math.sin(2 * Math.PI * (formant1 + vibrato) * t) +
        0.5 * Math.sin(2 * Math.PI * (formant2 + vibrato) * t)
      ) * vocalEnv;

      left += vocalSample;
      right += vocalSample;
    }

    // Hard limiting to prevent clipping
    buffer[i * 2] = Math.max(-0.95, Math.min(0.95, left));
    buffer[i * 2 + 1] = Math.max(-0.95, Math.min(0.95, right));
  }

  // Encode Float32Array into WAV file format
  return encodeWAVBuffer(buffer, numChannels, sampleRate);
}

function encodeWAVBuffer(samples: Float32Array, numChannels: number, sampleRate: number): string {
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataSize, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
