/**
 * გვერდის გადაფურცვლის სინთეზირებული ხმის ეფექტი (Web Audio API)
 * არ საჭიროებს გარე აუდიო ფაილებს, მუშაობს ოფლაინში და არის ძალიან მსუბუქი.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * ასინთეზირებს ქაღალდის ფურცლის ნაზ გადაშლის ხმას (Paper rustle sound)
 */
export function playPaperFlipSound(volume: number = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const sampleRate = ctx.sampleRate;
    const duration = 0.18; // 180ms
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // გენერირდება გაფილტრული ვარდისფერი/თეთრი ხმაური ფურცლის შრიალისთვის
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // დაბალი სიხშირეების ფილტრი (Brownian/Pink noise)
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 3.5;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // ბანდპას ფილტრი ქაღალდის შრიალის რეზონანსისთვის (~1.8 kHz)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1400, ctx.currentTime);
    bandpass.Q.setValueAtTime(1.2, ctx.currentTime);
    // დინამიური სიხშირის დაწევა გადაფურცვლის ბოლოს
    bandpass.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + duration);

    // ხმის სიმძლავრის კონვერტი (Envelope: სწრაფი ზრდა და რბილი დაცემა)
    const gainNode = ctx.createGain();
    const effectiveVol = Math.max(0.01, Math.min(1, volume));
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(effectiveVol * 0.45, ctx.currentTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noiseSource.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start();
  } catch {
    // აუდიო შეზღუდვების შემთხვევაში უხმოდ აგრძელებს მუშაობას
  }
}
