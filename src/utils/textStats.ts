export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export function countCharacters(text: string): number {
  return text.length;
}
