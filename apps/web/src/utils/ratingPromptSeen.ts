const STORAGE_KEY = 'intercity_rating_prompts_seen';
const MAX_ENTRIES = 50;

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * The post-trip rating popup on Home is meant to nudge the rider once per
 * completed ride, not every time they revisit Home before actually
 * submitting a star rating — the backend's pending-rating lookup only
 * clears once a rating is saved, so without this, closing the popup (or
 * just navigating away and back) brought it right back. Riders can still
 * rate later from their history list, so it's safe to mark a prompt "seen"
 * the moment it's shown, whether or not the rider ends up submitting.
 */
export function hasSeenRatingPrompt(type: string, id: number): boolean {
  return readSeen().includes(`${type}-${id}`);
}

export function markRatingPromptSeen(type: string, id: number): void {
  try {
    const seen = readSeen();
    const key = `${type}-${id}`;
    if (seen.includes(key)) return;
    const updated = [...seen, key].slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Best-effort — if storage is unavailable the popup just shows every
    // visit again, no worse than before this fix.
  }
}
