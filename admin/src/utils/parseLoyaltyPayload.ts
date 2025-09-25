export function parseLoyaltyPayload(raw: string): { uid?: string; cardId?: string } | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  if (s.startsWith('loyalty:')) {
    const query = s.slice('loyalty:'.length);
    try {
      const params = new URLSearchParams(query);
      const uid = params.get('uid') || undefined;
      const card = params.get('cardId') || params.get('card') || undefined;
      if (uid) return { uid };
      if (card) return { cardId: card.toUpperCase() };
      return null;
    } catch {
      return null;
    }
  }

  // Firebase UID: [a-zA-Z0-9_-]{6,}
  if (/^[A-Za-z0-9_-]{6,}$/.test(s)) {
    return { uid: s };
  }

  // Short cardId: [A-Z0-9]{4,12}
  const up = s.toUpperCase();
  if (/^[A-Z0-9]{4,12}$/.test(up)) {
    return { cardId: up };
  }

  return null;
}
