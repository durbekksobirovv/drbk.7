export interface UserSettings {
  defaultColor: string;
  defaultBrushSize: number;
  fontFamily: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  settings?: UserSettings;
}

export interface Room {
  id: string;
  hostId: string;
  participantId?: string;
  status: 'waiting' | 'active' | 'closed';
  createdAt: string;
}

export interface Stroke {
  id: string;
  roomId: string;
  userId: string;
  points: number[];
  color: string;
  brushSize: number;
  opacity: number;
  tool: 'pen' | 'eraser';
  createdAt: string;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  text: string;
  createdAt: string;
}
