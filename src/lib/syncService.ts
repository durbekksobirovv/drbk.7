export interface UserSettings {
  defaultColor: string;
  defaultBrushSize: number;
  canvasBg: 'white' | 'grid' | 'sepia' | 'dark';
  fontFamily: 'Inter' | 'Space Grotesk' | 'JetBrains Mono' | 'Playfair Display';
  chatBubbleStyle: 'modern' | 'classic' | 'neumorphic';
}

export interface AppUser {
  uid: string;
  displayName: string;
  photoURL: string;
  isGuest: boolean;
  settings?: UserSettings;
}

export interface RoomData {
  id: string;
  hostId: string;
  participantId?: string;
  status: 'waiting' | 'active' | 'closed';
  createdAt: any;
}

export interface StrokeData {
  id: string;
  roomId: string;
  userId: string;
  points: number[];
  color: string;
  brushSize: number;
  tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line';
  createdAt: any;
}

export interface MessageData {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultColor: '#ef4444',
  defaultBrushSize: 6,
  canvasBg: 'white',
  fontFamily: 'Inter',
  chatBubbleStyle: 'modern'
};

// Local storage caching keys
const AUTH_KEY = 'collab_painter_authenticated_user';

let currentAuthUser: AppUser | null = (() => {
  const cached = localStorage.getItem(AUTH_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch (e) {
    return null;
  }
})();

const authListeners: ((user: AppUser | null) => void)[] = [];

// Clean global polling storage to synchronize callbacks efficiently
const pollIntervals: { [roomId: string]: any } = {};
const roomStatusListeners: { [roomId: string]: ((room: RoomData) => void)[] } = {};
const strokeListeners: { [roomId: string]: ((strokes: StrokeData[]) => void)[] } = {};
const messageListeners: { [roomId: string]: ((messages: MessageData[]) => void)[] } = {};

// Register a room polling thread if it doesn't already exist
function ensurePolling(roomId: string) {
  const cleanId = roomId.trim().toUpperCase();
  if (pollIntervals[cleanId]) return;

  const triggerPoll = async () => {
    try {
      const res = await fetch(`/api/rooms/${cleanId}/sync`);
      if (!res.ok) return;
      const data = await res.json();

      // Trigger respective active listeners
      if (roomStatusListeners[cleanId]) {
        roomStatusListeners[cleanId].forEach((callback) => callback(data.room));
      }
      if (strokeListeners[cleanId]) {
        strokeListeners[cleanId].forEach((callback) => callback(data.strokes));
      }
      if (messageListeners[cleanId]) {
        messageListeners[cleanId].forEach((callback) => callback(data.messages));
      }
    } catch (err) {
      console.warn("Polling error for", cleanId, err);
    }
  };

  // Immediate pull
  triggerPoll();

  // Run pool every 750ms to keep drawings and chat synchronized instantly
  pollIntervals[cleanId] = setInterval(triggerPoll, 750);
}

function stopPollingIfNeeded(roomId: string) {
  const cleanId = roomId.trim().toUpperCase();
  const roomCount = roomStatusListeners[cleanId]?.length || 0;
  const strokeCount = strokeListeners[cleanId]?.length || 0;
  const messageCount = messageListeners[cleanId]?.length || 0;

  if (roomCount === 0 && strokeCount === 0 && messageCount === 0) {
    if (pollIntervals[cleanId]) {
      clearInterval(pollIntervals[cleanId]);
      delete pollIntervals[cleanId];
    }
  }
}

export const syncService = {
  isMockMode() {
    return false; // Real custom backend deployed on port 3000
  },

  onAuthStateChange(callback: (user: AppUser | null) => void) {
    authListeners.push(callback);
    // Instantly yield cached value
    setTimeout(() => callback(currentAuthUser), 10);
    return () => {
      const idx = authListeners.indexOf(callback);
      if (idx > -1) authListeners.splice(idx, 1);
    };
  },

  // Perform full password/PIN authentication with the local database
  async loginWithPIN(displayName: string, pin: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, pin })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Tizimga kirishda xatolik");
    }

    const { user } = await res.json();
    currentAuthUser = {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isGuest: false,
      settings: user.settings || { ...DEFAULT_SETTINGS }
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(currentAuthUser));
    authListeners.forEach((callback) => callback(currentAuthUser));
    return currentAuthUser;
  },

  async logout() {
    currentAuthUser = null;
    localStorage.removeItem(AUTH_KEY);
    authListeners.forEach((callback) => callback(null));
  },

  async updateSettings(uid: string, settings: Partial<UserSettings>) {
    if (!currentAuthUser) return;
    
    // Update local variable instantly for rapid UI experience
    currentAuthUser.settings = { ...DEFAULT_SETTINGS, ...currentAuthUser.settings, ...settings };
    localStorage.setItem(AUTH_KEY, JSON.stringify(currentAuthUser));
    authListeners.forEach((callback) => callback(currentAuthUser));

    try {
      await fetch('/api/auth/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, settings })
      });
    } catch (err) {
      console.warn("Could not sync options with backend server:", err);
    }
  },

  async createRoom(hostUser: AppUser): Promise<string> {
    const res = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: hostUser.uid })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Xonani yaratib bo'lmadi");
    }

    const { room } = await res.json();
    return room.id;
  },

  async joinRoom(roomId: string, user: AppUser): Promise<RoomData> {
    const cleanId = roomId.trim().toUpperCase();
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: cleanId, uid: user.uid })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Xonaga ulanib bo'lmadi");
    }

    const { room } = await res.json();
    return room;
  },

  subscribeRoom(roomId: string, callback: (room: RoomData) => void) {
    const cleanId = roomId.trim().toUpperCase();
    if (!roomStatusListeners[cleanId]) roomStatusListeners[cleanId] = [];
    roomStatusListeners[cleanId].push(callback);

    ensurePolling(cleanId);

    return () => {
      roomStatusListeners[cleanId] = roomStatusListeners[cleanId].filter((cb) => cb !== callback);
      stopPollingIfNeeded(cleanId);
    };
  },

  subscribeStrokes(roomId: string, callback: (strokes: StrokeData[]) => void) {
    const cleanId = roomId.trim().toUpperCase();
    if (!strokeListeners[cleanId]) strokeListeners[cleanId] = [];
    strokeListeners[cleanId].push(callback);

    ensurePolling(cleanId);

    return () => {
      strokeListeners[cleanId] = strokeListeners[cleanId].filter((cb) => cb !== callback);
      stopPollingIfNeeded(cleanId);
    };
  },

  async addStroke(roomId: string, userId: string, stroke: Omit<StrokeData, 'id' | 'roomId' | 'userId' | 'createdAt'>) {
    const cleanId = roomId.trim().toUpperCase();
    
    // Fire & Forget HTTP Post
    try {
      await fetch(`/api/rooms/${cleanId}/stroke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, stroke })
      });
    } catch (err) {
      console.error("Faqat serverga chiziq jo'natilmadi:", err);
    }
  },

  subscribeMessages(roomId: string, callback: (messages: MessageData[]) => void) {
    const cleanId = roomId.trim().toUpperCase();
    if (!messageListeners[cleanId]) messageListeners[cleanId] = [];
    messageListeners[cleanId].push(callback);

    ensurePolling(cleanId);

    return () => {
      messageListeners[cleanId] = messageListeners[cleanId].filter((cb) => cb !== callback);
      stopPollingIfNeeded(cleanId);
    };
  },

  async addMessage(roomId: string, userId: string, userName: string, text: string) {
    const cleanId = roomId.trim().toUpperCase();
    try {
      await fetch(`/api/rooms/${cleanId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName, text })
      });
    } catch (err) {
      console.error("Xabar yetkazilmadi:", err);
    }
  },

  async clearCanvas(roomId: string) {
    const cleanId = roomId.trim().toUpperCase();
    try {
      await fetch(`/api/rooms/${cleanId}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error("Kanuvani tozalash amalga oshmadi:", err);
    }
  },

  async undoLastStroke(roomId: string, userId: string) {
    const cleanId = roomId.trim().toUpperCase();
    try {
      await fetch(`/api/rooms/${cleanId}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (err) {
      console.error("Orqaga qaytarishda xatolik:", err);
    }
  }
};
