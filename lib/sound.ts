'use client';

import { useSyncExternalStore } from 'react';

// Shared "sound on/off" state for every trailer on the site.
//
// Browsers only allow a video to autoplay WITH sound after the visitor has
// interacted with the page, and websites cannot see the phone's hardware
// volume buttons. So trailers start muted, and the first tap / click / key
// press anywhere on the page turns sound on for all of them (unless the visitor
// pressed the mute button before -- that choice is remembered).

const KEY = 'bantan_sound';

let soundOn = false;
let userMuted = false;
let wired = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

// Done synchronously inside the gesture handler: iOS Safari only allows
// unmuting a video while the tap that caused it is still being handled.
function unmuteVideos() {
  document.querySelectorAll('video').forEach((v) => {
    v.muted = false;
  });
}

function wire() {
  if (wired || typeof document === 'undefined') return;
  wired = true;

  try {
    userMuted = localStorage.getItem(KEY) === 'off';
  } catch {
    /* storage blocked: default behaviour */
  }
  if (userMuted) return;

  const events = ['pointerdown', 'touchend', 'click', 'keydown'] as const;
  const onGesture = () => {
    events.forEach((e) => document.removeEventListener(e, onGesture, true));
    if (userMuted || soundOn) return;
    soundOn = true;
    unmuteVideos();
    emit();
  };
  events.forEach((e) => document.addEventListener(e, onGesture, true));
}

function subscribe(cb: () => void) {
  wire();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setSound(on: boolean) {
  soundOn = on;
  userMuted = !on;
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, 'off');
  } catch {
    /* ignore */
  }
  if (on) unmuteVideos();
  emit();
}

/** [soundOn, setSound] -- soundOn is false until the visitor first interacts. */
export function useSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    subscribe,
    () => soundOn,
    () => false
  );
  return [on, setSound];
}
