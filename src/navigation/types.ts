import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ImageEdits } from '../services/imaging/imagingService';

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Scanner: undefined;
  Editor: EditorParams;
  Processing: ProcessingParams;
  Result: { scanId: string; source?: 'flow' | 'history' };
  NoText: undefined;
};

export interface EditorParams {
  sourceUri: string;
  exifOrientation?: number | null;
}

export type ProcessingParams = {
  sourceUri: string;
  edits: ImageEdits;
};
