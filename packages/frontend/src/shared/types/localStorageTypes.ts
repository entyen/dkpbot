export interface User {
  id: string;
  global_name: string;
  username: string;
}

export interface Server {
  selectedServer: {
    active: boolean,
    serverCurrencyEmoji: string,
    serverCurrencyName: string,
    serverId: string,
    serverName: string,
  };
  serverList: string;
}