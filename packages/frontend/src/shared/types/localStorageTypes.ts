export interface User {
  id: string;
  global_name: string;
  username: string;
}

export interface ServerListItem {
  serverId: string;
  serverName: string;
  ownerId: string;
  active?: boolean;
  serverCurrencyEmoji?: string;
  serverCurrencyName?: string;
}

export interface Server {
  selectedServer: ServerListItem;
  serverList: ServerListItem[];
}