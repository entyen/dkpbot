export interface ServerUser {
  _id: string;
  serverId: string;
  userId: string;
  userName: string;
  serverRole: string;
  serverRoles: [{
    _id: string,
    roleId: string,
    roleName: string
  }],
  dkpPoints: number;
  activityPoints: number;
  date: string;
}

export interface HistoryItem {
  _id: string
  serverId: string
  giverId: string
  getterId: string
  givingPoints: number
  givingReason: string
  date: string
}
