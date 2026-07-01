// src/shared/types/roles.ts
export interface DiscordRole {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string;
  isMentionable: boolean;
  isHoisted: boolean;
  isManaged: boolean;
  createdAt: string;
}

export interface ServerRolesResponse {
  guildId: string;
  guildName: string;
  totalRoles: number;
  roles: DiscordRole[];
}