// Web Audio API Sound Synthesizer for premium interface feedback
export function playSound(type: 'correct' | 'incorrect' | 'complete' | 'click') {
  if (typeof window === 'undefined') return;
  const enabled = localStorage.getItem('emagyne_sound_enabled') !== 'false';
  if (!enabled) return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'correct') {
      // Ascending major chord chime (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

        gain.gain.setValueAtTime(0.05, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.07 + 0.25);

        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.25);
      });
    } else if (type === 'incorrect') {
      // Low dual-tone buzzer
      [130, 125].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth'; // Slightly buzzy
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.3);

        // Lowpass filter to soften the sawtooth buzz
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, ctx.currentTime);
        
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      });
    } else if (type === 'complete') {
      // Uplifting fanfare (D5 -> D5 -> D5 -> G5 -> B5)
      const fanfare = [
        { note: 587.33, time: 0, dur: 0.12 },
        { note: 587.33, time: 0.15, dur: 0.12 },
        { note: 587.33, time: 0.30, dur: 0.12 },
        { note: 783.99, time: 0.45, dur: 0.25 },
        { note: 987.77, time: 0.75, dur: 0.45 }
      ];

      fanfare.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f.note, ctx.currentTime + f.time);

        gain.gain.setValueAtTime(0.06, ctx.currentTime + f.time);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + f.time + f.dur);

        osc.start(ctx.currentTime + f.time);
        osc.stop(ctx.currentTime + f.time + f.dur);
      });
    }
  } catch (e) {
    console.warn("Audio Context failed to initialize", e);
  }
}
