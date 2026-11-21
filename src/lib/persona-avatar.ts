/** Stable DiceBear avatar URL: the same persona always receives the same avatar. */
export function getPersonaAvatarUrl(personaId: string): string {
  const seed = encodeURIComponent(personaId);
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}
