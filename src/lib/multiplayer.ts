import { createClient } from '@/lib/supabase/client';
import type { RealmName, GameMode } from '@/types';

/**
 * WarisanVerse Multiplayer Library
 * Handles room management, matchmaking, and real-time state sync via Supabase Realtime.
 */

export interface MultiplayerRoom {
  id: string;
  code: string;
  realm: RealmName;
  mode: GameMode;
  hostId: string;
  players: RoomPlayer[];
  status: 'waiting' | 'starting' | 'playing' | 'ended';
  maxPlayers: number;
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface RoomPlayer {
  id: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
}

export class MultiplayerManager {
  private supabase = createClient();
  private channel: ReturnType<typeof this.supabase.channel> | null = null;
  private roomId: string | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  /** Create a new room */
  async createRoom(realm: RealmName, mode: GameMode, maxPlayers = 2): Promise<MultiplayerRoom | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return null;

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await this.supabase
      .from('rooms')
      .insert({
        code,
        realm,
        mode,
        host_id: user.id,
        players: [{ id: user.id, username: 'Host', isHost: true, isReady: false, score: 0 }],
        status: 'waiting',
        max_players: maxPlayers,
        settings: {},
      })
      .select()
      .single();

    if (error || !data) return null;

    this.roomId = data.id;
    await this.subscribeToRoom(data.id);
    return this.mapRoom(data);
  }

  /** Join a room by code */
  async joinRoom(code: string): Promise<MultiplayerRoom | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return null;

    const { data: room, error } = await this.supabase
      .from('rooms')
      .select()
      .eq('code', code.toUpperCase())
      .eq('status', 'waiting')
      .single();

    if (error || !room) return null;

    const players = [...(room.players as RoomPlayer[]), {
      id: user.id,
      username: 'Player',
      isHost: false,
      isReady: false,
      score: 0,
    }];

    if (players.length > room.max_players) return null;

    const { data: updated, error: updateErr } = await this.supabase
      .from('rooms')
      .update({ players })
      .eq('id', room.id)
      .select()
      .single();

    if (updateErr || !updated) return null;

    this.roomId = updated.id;
    await this.subscribeToRoom(updated.id);
    return this.mapRoom(updated);
  }

  /** Subscribe to room changes */
  private async subscribeToRoom(roomId: string) {
    this.channel = this.supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        this.emit('room:update', payload.new);
      })
      .on('broadcast', { event: 'game_state' }, (payload) => {
        this.emit('game:state', payload.payload);
      })
      .on('broadcast', { event: 'game_action' }, (payload) => {
        this.emit('game:action', payload.payload);
      })
      .subscribe();
  }

  /** Send game state to all players */
  broadcastState(state: unknown) {
    this.channel?.send({
      type: 'broadcast',
      event: 'game_state',
      payload: state,
    });
  }

  /** Send a game action */
  broadcastAction(action: { type: string; data: unknown }) {
    this.channel?.send({
      type: 'broadcast',
      event: 'game_action',
      payload: action,
    });
  }

  /** Set player ready status */
  async setReady(isReady: boolean) {
    if (!this.roomId) return;

    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    const { data: room } = await this.supabase
      .from('rooms')
      .select('players')
      .eq('id', this.roomId)
      .single();

    if (!room) return;

    const players = (room.players as RoomPlayer[]).map(p =>
      p.id === user.id ? { ...p, isReady } : p
    );

    await this.supabase
      .from('rooms')
      .update({ players })
      .eq('id', this.roomId);
  }

  /** Start the game (host only) */
  async startGame() {
    if (!this.roomId) return;

    await this.supabase
      .from('rooms')
      .update({ status: 'playing' })
      .eq('id', this.roomId);
  }

  /** Leave the room */
  async leaveRoom() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.roomId = null;
    this.listeners.clear();
  }

  /** Event system */
  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  private mapRoom(row: Record<string, unknown>): MultiplayerRoom {
    return {
      id: row.id as string,
      code: row.code as string,
      realm: row.realm as RealmName,
      mode: row.mode as GameMode,
      hostId: row.host_id as string,
      players: row.players as RoomPlayer[],
      status: row.status as MultiplayerRoom['status'],
      maxPlayers: row.max_players as number,
      settings: row.settings as Record<string, unknown>,
      createdAt: row.created_at as string,
    };
  }
}

/** Singleton instance */
let _manager: MultiplayerManager | null = null;
export function getMultiplayerManager(): MultiplayerManager {
  if (!_manager) _manager = new MultiplayerManager();
  return _manager;
}
