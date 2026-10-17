import { Share } from 'react-native';

export type ShareOutcome = 'shared' | 'dismissed';

export async function shareText(text: string): Promise<ShareOutcome> {
  const result = await Share.share({ message: text });
  if (result.action === Share.sharedAction) return 'shared';
  return 'dismissed';
}

/**
 * Export abstraction for future TXT/PDF/DOCX output. V1 shares plain text via
 * the native share sheet; file exporters can be registered here later without
 * touching UI code.
 */
export interface FileExporter {
  format: string;
  export(text: string, suggestedName: string): Promise<{ uri: string } | null>;
}
