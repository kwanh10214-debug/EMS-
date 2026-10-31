import { GameRecord } from '../types/baseball';
import { SheetInfo } from './googleSheets';

export interface TeamConfig {
  sheetInfo: SheetInfo | null;
  ownerEmail?: string;
  ownerName?: string;
  isPubliclyShared?: boolean;
  updatedAt: string;
}

const API_BASE = '/api';

/**
 * Loads shared team config from the server
 */
export async function fetchTeamConfig(): Promise<TeamConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/team/config`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch team config from server:', err);
    return null;
  }
}

/**
 * Saves shared team config to the server
 */
export async function saveTeamConfig(config: Partial<TeamConfig>): Promise<TeamConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/team/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to save team config to server:', err);
    return null;
  }
}

/**
 * Loads all shared game records from the server
 */
export async function fetchSharedGames(): Promise<GameRecord[] | null> {
  try {
    const res = await fetch(`${API_BASE}/games`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch games from server:', err);
    return null;
  }
}

/**
 * Saves or updates games on the server
 */
export async function saveSharedGames(games: GameRecord[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ games }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to save games to server:', err);
    return false;
  }
}

/**
 * Loads team admins
 */
export async function fetchAdmins(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/team/admins`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch admins:', err);
    return [];
  }
}

/**
 * Adds or updates an admin
 */
export async function addAdmin(adminData: {
  email: string;
  name?: string;
  role?: 'owner' | 'manager' | 'scorer';
  isDriveGranted?: boolean;
}): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/team/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to add admin:', err);
    return null;
  }
}

/**
 * Removes an admin
 */
export async function deleteAdmin(adminId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/team/admins/${encodeURIComponent(adminId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete admin:', err);
    return false;
  }
}

/**
 * Loads player statuses (retirement, transfer, active)
 */
export async function fetchPlayerStatuses(): Promise<Record<string, any>> {
  try {
    const res = await fetch(`${API_BASE}/team/players`);
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch player statuses:', err);
    return {};
  }
}

/**
 * Updates a player's status
 */
export async function savePlayerStatus(statusData: {
  name: string;
  status: 'active' | 'retired' | 'transferred' | 'inactive';
  note?: string;
  destination?: string;
}): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/team/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusData),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to save player status:', err);
    return null;
  }
}
