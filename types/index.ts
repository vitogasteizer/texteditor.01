export interface Comment {
  id: string;
  text: string;
  createdAt: number;
  resolved: boolean;
  selectionId: string;
}

export type PageSize = 'Letter' | 'Legal' | 'Tabloid' | 'Statement' | 'Executive' | 'A3' | 'A4' | 'A5' | 'B4' | 'B5';
export type PageOrientation = 'portrait' | 'landscape';
export interface PageMargins {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface Doc {
  id: string;
  name: string;
  content: string;
  comments: Comment[];
  createdAt: number;
  updatedAt: number;
  pageSize?: PageSize;
  pageOrientation?: PageOrientation;
  pageMargins?: PageMargins;
  pageColor?: string;
  googleDriveId?: string;
}

export interface WordCountStats {
  words: number;
  characters: number;
}

export interface CopiedFormatting {
  fontName: string;
  fontSize: string;
  foreColor: string;
  hiliteColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

export type ShapeType = 'textbox' | 'rectangle' | 'circle' | 'triangle' | 'line';
export type ActivePanel = 'link' | 'image' | 'table' | 'findReplace' | 'shape' | null;

export interface ImageOptions {
    src: string;
    width: string;
    height: string;
    align: 'none' | 'left' | 'center' | 'right' | 'absolute';
}

export type ChatMessage = {
    role: 'user' | 'model';
    text: string;
    isThinking?: boolean;
    sources?: any[];
};
