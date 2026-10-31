/**
 * ტელესუფლიორისა და სუბტიტრების შემოსვლისა და გასვლის ანიმაციების ძრავი
 */

import { SentenceEntranceEffect, SentenceExitEffect } from '../types/teleprompter';

// Transform-ზე დაფუძნებული ეფექტები (Web Animations API)
export const XF_EFFECTS: Record<string, Keyframe[]> = {
  slide: [
    { transform: 'translateX(-30px)', opacity: 0 }, 
    { transform: 'none', opacity: 1 }
  ],
  scale: [
    { transform: 'scale(0.85)', opacity: 0 }, 
    { transform: 'none', opacity: 1 }
  ],
  up: [
    { transform: 'translateY(24px)', opacity: 0 }, 
    { transform: 'none', opacity: 1 }
  ],
  down: [
    { transform: 'translateY(-24px)', opacity: 0 }, 
    { transform: 'none', opacity: 1 }
  ],
  flip: [
    { transform: 'perspective(500px) rotateX(-60deg)', opacity: 0 }, 
    { transform: 'none', opacity: 1 }
  ],
  bounce: [
    { transform: 'scale(0.8)', opacity: 0 },
    { transform: 'scale(1.06)', opacity: 1, offset: 0.6 },
    { transform: 'scale(0.98)', offset: 0.8 },
    { transform: 'scale(1)', opacity: 1 }
  ]
};

export const KF_EFFECTS: Record<string, Keyframe[]> = {
  fade: [
    { opacity: 0 }, 
    { opacity: 1 }
  ],
  blur: [
    { filter: 'blur(16px)', opacity: 0 }, 
    { filter: 'none', opacity: 1 }
  ]
};

export const EXIT_DURATIONS_MS: Record<SentenceExitEffect, number> = {
  none: 0,
  fade: 500,
  slow: 1400,
  rise: 900
};

/**
 * შემოსვლის ეფექტის გაშვება ნებისმიერ DOM ელემენტზე (სრული 12 ეფექტის მხარდაჭერა)
 */
export function playEntranceEffect(
  el: HTMLElement,
  effect: SentenceEntranceEffect,
  dur: number,
  highlightColor: string,
  textColor: string,
  onProgress?: () => void
): Promise<void> | void {
  // წინა მიმდინარე ანიმაციების გაუქმება
  el.getAnimations().filter(a => !(a instanceof CSSTransition)).forEach(a => a.cancel());
  
  const fullText = el.dataset.full || el.textContent || '';
  el.textContent = fullText;

  if (effect === 'none') {
    el.style.opacity = '1';
    return;
  }

  // 1. Keyframe / Transform ეფექტები (fade, slide, scale, up, down, flip, bounce, blur)
  const kf = XF_EFFECTS[effect] || KF_EFFECTS[effect];
  if (kf) {
    if (XF_EFFECTS[effect]) el.style.display = 'inline-block';
    const anim = el.animate(kf, { duration: dur, easing: 'ease-out' });
    anim.onfinish = () => { 
      el.style.display = ''; 
      if (onProgress) onProgress();
    };
    return;
  }

  // 2. Typewriter (საბეჭდი მანქანა) ან Word (სიტყვა-სიტყვით)
  if (effect === 'typewriter' || effect === 'word') {
    const tokens = effect === 'word' ? fullText.split(/(\s+)/).filter(Boolean) : [...fullText];
    let idx = 0;
    el.textContent = '';

    return new Promise<void>(resolve => {
      const stepInterval = effect === 'word' ? Math.max(60, Math.min(180, dur / Math.max(1, tokens.length))) : 40;
      const intervalId = window.setInterval(() => {
        if (idx < tokens.length) {
          el.textContent += tokens[idx++];
          if (onProgress) onProgress();
        } else {
          clearInterval(intervalId);
          resolve();
        }
      }, stepInterval);
    });
  }

  // 3. Wave (ასო-ასო ტალღა) ან Karaoke (ფერის თანმიმდევრული შევსება)
  if (effect === 'wave' || effect === 'karaoke') {
    const wordTokens = fullText.split(/(\s+)/);
    const letterSpans: HTMLSpanElement[] = [];
    const wordSpans: HTMLSpanElement[] = [];
    el.textContent = '';

    wordTokens.forEach(word => {
      if (!word.trim()) {
        el.append(word);
        return;
      }

      if (effect === 'karaoke') {
        const s = document.createElement('span');
        s.textContent = word;
        s.style.color = textColor;
        s.style.transition = 'color 0.15s ease-out';
        el.append(s);
        wordSpans.push(s);
        return;
      }

      // Wave ეფექტი: თითოეული ასო inline-block სპანში
      const wrap = document.createElement('span');
      wrap.style.whiteSpace = 'nowrap';
      [...word].forEach(ch => {
        const s = document.createElement('span');
        s.textContent = ch;
        s.style.display = 'inline-block';
        wrap.append(s);
        letterSpans.push(s);
      });
      el.append(wrap);
    });

    if (effect === 'wave') {
      const staggerDelay = Math.min(35, Math.max(15, dur / Math.max(1, letterSpans.length)));
      letterSpans.forEach((s, i) => {
        s.animate([
          { transform: 'translateY(16px)', opacity: 0 },
          { transform: 'none', opacity: 1 }
        ], { 
          duration: Math.max(250, dur * 0.7), 
          delay: i * staggerDelay, 
          fill: 'backwards', 
          easing: 'ease-out' 
        });
      });
      return;
    }

    // Karaoke ეფექტი: სიტყვების თანმიმდევრული შევსება
    let wIdx = 0;
    return new Promise<void>(resolve => {
      const stepTime = Math.max(40, Math.min(300, dur / Math.max(1, wordSpans.length)));
      const intervalId = window.setInterval(() => {
        if (wIdx < wordSpans.length) {
          wordSpans[wIdx++].style.color = highlightColor;
          if (onProgress) onProgress();
        } else {
          clearInterval(intervalId);
          resolve();
        }
      }, stepTime);
    });
  }
}

/**
 * წინა წინადადების გასვლის ეფექტის შესრულება
 */
export function playExitEffect(
  el: HTMLElement,
  exitFx: SentenceExitEffect,
  textColor: string
): void {
  // წინა ანიმაციების გაუქმება
  el.getAnimations().filter(a => !(a instanceof CSSTransition)).forEach(a => a.cancel());
  el.textContent = el.dataset.full || el.textContent;

  const dur = EXIT_DURATIONS_MS[exitFx] || 300;

  if (exitFx === 'none') {
    el.style.opacity = '0.2';
    el.style.color = textColor;
    el.style.fontWeight = 'normal';
    el.style.textShadow = 'none';
    el.style.background = 'transparent';
    return;
  }

  if (exitFx === 'rise') {
    el.animate([
      { opacity: 1, transform: 'none' },
      { opacity: 0.2, transform: 'translateY(-18px)' }
    ], { duration: dur, easing: 'ease-out' }).onfinish = () => {
      el.style.opacity = '0.2';
      el.style.color = textColor;
      el.style.fontWeight = 'normal';
      el.style.textShadow = 'none';
      el.style.background = 'transparent';
    };
    return;
  }

  // fade (500ms) ან slow (1400ms)
  el.animate([
    { opacity: 1 }, 
    { opacity: 0.2 }
  ], { duration: dur, easing: 'ease-out' }).onfinish = () => {
    el.style.opacity = '0.2';
    el.style.color = textColor;
    el.style.fontWeight = 'normal';
    el.style.textShadow = 'none';
    el.style.background = 'transparent';
  };
}
