import { useAudioPlayer } from 'expo-audio';

const BEEP_SOURCE = require('../../assets/sounds/anando_beep.wav');

/** Short alert beep played whenever a genuinely new Anando ride is discovered via polling. */
export function useAnandoBeep() {
  const player = useAudioPlayer(BEEP_SOURCE);

  return () => {
    player.seekTo(0).catch(() => {});
    player.play();
  };
}
