'use client';

import { useSyncExternalStore } from 'react';

// Trailers play with sound, and there is no mute button.
//
// Browsers decide whether a page may start sound by itself: Chrome allows it on
// sites people often watch with sound, while phones and Safari usually wait until
// the visitor has tapped, clicked or pressed a key on the page. So each trailer
// first tries to start with sound (playTrailer). If the browser refuses, it plays
// muted, and the visitor's first tap / click / key press anywhere on the page
// turns sound on for every trailer.

type State = 'unknown' | 'on' | 'blocked';

let state: State = 'unknown';
let wired = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function turnOn() {
  if (state === 'on') return;
  state = 'on';
  emit();
}

type ActivationNavigator = Navigator & { userActivation?: { isActive: boolean } };

function wire() {
  if (wired || typeof document === 'undefined') return;
  wired = true;

  try {
    localStorage.removeItem('bantan_sound'); // left behind by the old mute button
  } catch {
    /* storage blocked */
  }

  const events = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
  const onGesture = (e: Event) => {
    // Sound can only be switched on during a real tap / click / key press. The
    // start of a touch (pointerdown) does not count yet: wait for the tap to end.
    const activation = (navigator as ActivationNavigator).userActivation;
    const counts = activation
      ? activation.isActive
      : !(e.type === 'pointerdown' && (e as PointerEvent).pointerType !== 'mouse');
    if (!counts) return;

    events.forEach((name) => document.removeEventListener(name, onGesture, true));
    // Synchronously, inside the gesture: iOS Safari only allows unmuting while
    // the tap that caused it is still being handled.
    document.querySelectorAll('video').forEach((v) => {
      v.muted = false;
    });
    turnOn();
  };
  events.forEach((name) => document.addEventListener(name, onGesture, true));
}

function subscribe(cb: () => void) {
  wire();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** True once trailers on this page may play with sound. */
export function useSoundOn(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state === 'on',
    () => false
  );
}

/**
 * Starts a trailer with sound when the browser allows it; otherwise muted until
 * the visitor's first tap / click / key press.
 */
export function playTrailer(video: HTMLVideoElement): void {
  if (state === 'blocked') {
    video.muted = true;
    video.play().catch(() => {});
    return;
  }
  video.muted = false;
  video.play().then(turnOn, (err: unknown) => {
    // Anything but a refusal (e.g. the play() was cut short by a pause()) is
    // not about sound; the next play attempt will try again.
    if ((err as { name?: string } | null)?.name !== 'NotAllowedError') return;
    if (state === 'unknown') state = 'blocked';
    video.muted = true;
    video.play().catch(() => {});
  });
}
