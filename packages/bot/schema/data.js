const { Schema, model } = require("mongoose");

const userSchem = new Schema({
  userid: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0, min: 0 },
  tel: { type: Number, default: null },
  bl: { type: Number, default: 0 },
  fine: { type: Number, default: 0 },
  acclvl: { type: Number, default: 0 },
  web3: { type: String, default: null },
  guildid: { type: String, default: null },
  nonce: { type: Number, default: Math.floor(Math.random() * 1000000) },
});

const iconRoleSchem = new Schema({
  roleId: { type: String, required: true, unique: true },
});

const nftUpdateSchem = new Schema({
  smartContract: { type: String, required: true, unique: true },
  blockId: { type: Number, required: true },
});

const serverSchema = new Schema({
  serverId: { type: String, require: true, unique: true },
  serverName: { type: String, default: null },
  active: { type: Boolean, default: true },
  logChannelId: { type: String, default: null },
  verificationRoleId: { type: String, default: null },
  ownerId: { type: String, default: null },
  serverCurrencyName: { type: String, default: null },
  serverCurrencyEmoji: { type: String, default: null },
  whoCanTransferCurrency: { type: String, default: null },
  whoCanCreateCurrency: { type: String, default: null },
});

const serverUserSchema = new Schema({
  serverId: { type: String, require: true },
  userId: { type: String, require: true },
  userName: { type: String, default: null },
  //for Moderator Admin and other inside database
  serverRole: { type: String, default: null },
  //Discord Roles
  serverRoles: [{
    roleName: { type: String },
    roleId: { type: String }
  }],
  dkpPoints: { type: Number, default: 0 },
  activityPoints: { type: Number, default: 0 },
});

const auctionItemSchema = new Schema({
  serverId: { type: String, required: true, index: true },
  createdBy: { type: String, required: true },

  itemName: { type: String, require: true },
  itemIcon: { type: String, default: null },
  description: { type: String, default: '' },

  startPrice: { type: Number, required: true, min: 5 },
  minBidStep: { type: Number, default: 5 },
  buyoutPrice: { type: Number, default: null },

  startTime: { type: Date, required: true },
  endTime: { type: Date, require: true },

  status: {
    type: String,
    enum: ['active', 'ended', 'cancelled', 'claimed'],
    default: 'active'
  },

  whatRolesCanBid: [{
    roleName: { type: String },
    roleId: { type: String }
  }],

  winner: {
    userId: { type: String, default: null },
    userName: { type: String, default: null },
    winningBid: { type: Number, default: null },
    claimedAt: { type: Date, default: null }
  },

  bids: [{
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  }],
})

const givingPointsSchema = new Schema({
  serverId: { type: String, require: true },
  giverId: { type: String, require: true },
  getterId: { type: String, require: true },
  givingPoints: { type: Number, require: true },
  givingReason: { type: String, default: null },
});

serverUserSchema.index({ serverId: 1, userId: 1 }, { unique: true });
auctionItemSchema.index({ serverId: 1, status: 1 });
auctionItemSchema.index({ endTime: 1 });

const serverdb = model("servers", serverSchema);
const serverUserdb = model("servers_users", serverUserSchema);
const pointsdb = model('points', givingPointsSchema)
const auctiondb = model('auction_item', auctionItemSchema);

module.exports = {
  userSchem,
  iconRoleSchem,
  nftUpdateSchem,
  serverdb,
  serverUserdb,
  pointsdb,
  auctiondb
};
