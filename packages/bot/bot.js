const Promise = require("bluebird")
const {
  Collection,
  Client,
  REST,
  Routes,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ActivityType,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  ComponentType,
  PresenceUpdateStatus,
  UserSelectMenuBuilder,
  PermissionFlagsBits,
} = require("discord.js")
const mongoose = require("mongoose")
const steam = require("steam-web")
const express = require("express")
const session = require("express-session")
const RedisStore = require('connect-redis')(session);
const Redis = require("ioredis");
const config = require("./config.json")

const app = express()
const axios = require("axios")
const crypto = require('crypto')
const cors = require("cors")

const redis = global.redisClient || new Redis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
});

if (!global.redisClient) global.redisClient = redis;

redis.on("connect", () => console.log("Redis connected"));
redis.on("ready", () => console.log("Redis ready"));
redis.on("error", (err) => console.error("Redis error:", err));
redis.on("close", () => console.log("Redis closed"));

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// === ОБЩЕЕ ХРАНИЛИЩЕ ТОКЕНОВ ===
const loginTokens = new Map(); // key: token, value: { userId, username, avatar, expiresAt }

// express link web3 and discord bot account
const PORT = process.env.PORT || 2000

const redisStore = new RedisStore({
  client: redis, // Ваш Redis клиент
  prefix: 'sess:', // Префикс для ключей
  ttl: 86400, // 24 часа в секундах
  disableTTL: false,
  disableTouch: false,
})

app.use(
  session({
    store: redisStore,
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
    name: 'sid',
    rolling: true,
  })
);

app.use(
  cors({
    origin: "https://dkp.grk.pw",
    credentials: true,
  })
)

const CLIENT_ID = config.CLIENT_ID
const CLIENT_SECRET = config.CLIENT_SECRET
const REDIRECT_URI = config.REDIRECT_URI

app.post("/webhook", async (req, res) => {
  res.send("Hello World!")
})

app.get("/dis/auth", (req, res) => {
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=code&scope=identify`
  res.redirect(discordAuthUrl)
})

app.get("/dis/callback", async (req, res) => {
  const code = req.query.code
  try {
    const response = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        scope: "identify",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )

    const { access_token } = response.data
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    req.session.user = userResponse.data // Сохраняем данные пользователя в сессии
    res.redirect("https://dkp.grk.pw") // Перенаправление на клиент
  } catch (error) {
    console.error("Ошибка при авторизации через Discord:", error)
    res.redirect("https://dkp.grk.pw")
  }
})

app.get("/dis/bot-login", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send("Токен не указан");
  }

  const data = loginTokens.get(token);

  if (!data) {
    return res.status(401).send("Ссылка недействительна или уже использована");
  }

  if (Date.now() > data.expiresAt) {
    loginTokens.delete(token);
    return res.status(401).send("Ссылка устарела");
  }

  // Удаляем токен (одноразовый)
  loginTokens.delete(token);

  // Сохраняем в сессию и редиректим
  req.session.user = {
    id: data.userId,
    username: data.username,
    avatar: data.avatar,
    // Можно добавить флаг, что авторизация через бота
    authMethod: 'bot'
  };

  res.redirect("https://dkp.grk.pw");
});

app.get("/dis/user", (req, res) => {
  //console.log(req.session)
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }
  res.json(req.session.user)
})

app.post("/dis/auction/create", async (req, res) => {
  // Проверка авторизации
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      error: "Не авторизован"
    });
  }

  try {
    const userInfo = await serverUserdb.findOne({
      serverId: req.body.serverId,
      userId: req.session.user.id,
    });

    // Проверка прав администратора
    if (!userInfo || userInfo.serverRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Недостаточно прав. Требуются права администратора"
      });
    }

    // Валидация обязательных полей
    const requiredFields = ['serverId', 'itemName', 'startPrice'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Отсутствуют обязательные поля: ${missingFields.join(', ')}`
      });
    }

    const data = req.body;


    // Создание аукциона
    const auction = await auctiondb.create({
      serverId: data.serverId,
      createdBy: data.createdBy || req.session.user.id,
      itemName: data.itemName,
      description: data.description || '',
      startPrice: Number(data.startPrice),
      minBidStep: Number(data.minBidStep) || 1,
      buyoutPrice: data.buyoutPrice ? Number(data.buyoutPrice) : null,
      startTime: data.startTime || new Date(),
      endTime: data.endTime,
      createdAt: new Date(),
      whatRolesCanBid: [data.whatRoleCanBid],
      status: 'active'
    });

    // Успешный ответ
    return res.status(201).json({
      success: true,
      message: "Аукцион успешно создан",
      data: auction
    });

  } catch (error) {
    console.error('Error creating auction:', error);
    return res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера",
      message: error.message
    });
  }
});

app.post("/dis/auction/list", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }

  try {
    const { serverId, status } = req.body;
    const auctions = await auctiondb.find({
      serverId: serverId,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (auctions.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Активных аукционов не найдено",
        data: []
      });
    }

    // Utility function
    const getCurrentPrice = (auction) => {
      if (!auction.bids || auction.bids.length === 0) {
        return auction.startPrice;
      }
      // Sort bids by amount descending to get highest
      const sortedBids = [...auction.bids].sort((a, b) => b.amount - a.amount);
      return sortedBids[0].amount;
    };

    // Форматирование данных
    const formattedAuctions = auctions.map(auction => ({
      id: auction._id,
      itemName: auction.itemName,
      description: auction.description,
      startPrice: auction.startPrice,
      currentBid: getCurrentPrice(auction),
      minBidStep: auction.minBidStep,
      buyoutPrice: auction.buyoutPrice,
      endTime: auction.endTime,
      timeLeft: Math.max(0, Math.floor((new Date(auction.endTime) - new Date()) / 1000)),
      createdBy: auction.createdBy,
      bidsCount: auction.bids?.length || 0,
      status: auction.status,
      createdAt: auction.createdAt,
      whatRoleCanBid: auction.whatRolesCanBid[0],
      serverId: auction.serverId,
      winner: auction.winner
    }));

    return res.status(200).json({
      success: true,
      data: formattedAuctions,
      count: formattedAuctions.length
    });
  } catch (error) {
    console.error('Error fetching auctions:', error);
    return res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера"
    });
  }
})

app.post("/dis/auction/:id/cancel", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }

  try {
    const { id } = req.params;
    const userInfo = await serverUserdb.findOne({
      serverId: req.body.serverId,
      userId: req.session.user.id,
    });

    // Проверка прав администратора
    if (!userInfo || userInfo.serverRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Недостаточно прав. Требуются права администратора"
      });
    }

    const auction = await auctiondb.findByIdAndUpdate(
      id,
      {
        status: "cancelled",
      },
      { new: true } // Возвращает обновленный документ
    );

    return res.status(200).json({
      success: true,
      data: auction,
    });
  } catch (error) {
    console.error('Error cancel auction:', error);
    return res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера"
    });
  }
})

app.post("/dis/auction/:id/buyout", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }

  try {
    const { id } = req.params;
    const { serverId } = req.body
    const userInfo = await serverUserdb.findOne({
      serverId: serverId,
      userId: req.session.user.id,
    });
    const auction = await auctiondb.findById(id);

    const userRoleIds = userInfo.serverRoles?.map(role => role.roleId) || [];
    const allowedRoleIds = auction.whatRolesCanBid.map(role => role.roleId);
    const hasAllowedRole = userRoleIds.some(roleId =>
      allowedRoleIds.includes(roleId)
    );

    // Проверка статуса аукциона
    if (auction.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Аукцион ${auction.status === 'ended' ? 'завершен' : auction.status === 'cancelled' ? 'отменен' : 'не активен'}`
      });
    }

    // Проверка времени окончания
    if (new Date(auction.endTime) < new Date()) {
      return res.status(400).json({
        success: false,
        error: "Аукцион истек"
      });
    }

    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        error: "Недостаточно прав. Нельзя участвовать"
      });
    }

    // Проверка баланса
    if (auction.buyoutPrice > userInfo.dkpPoints) {
      return res.status(400).json({
        success: false,
        error: "Недостаточно средств"
      });
    }

    const updatedAuction = await auctiondb.findByIdAndUpdate(
      id,
      {
        $push: {
          bids: {
            userId: req.session.user.id,
            userName: req.session.user.tag || req.session.user.username,
            amount: auction.buyoutPrice,
          }
        },
        $set: {
          status: 'ended',
          winner: {
            userId: req.session.user.id,
            userName: req.session.user.tag || req.session.user.username,
            winningBid: auction.buyoutPrice,
            claimedAt: new Date()
          },
        }
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Аукцион выкуплен!",
      isBuyout: true,
      data: updatedAuction
    });
  } catch (error) {
    console.error('Error cancel auction:', error);
    return res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера"
    });
  }
})

app.post("/dis/auction/:id/bid", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }

  try {
    const { id } = req.params;
    const { serverId, amount } = req.body
    const userInfo = await serverUserdb.findOne({
      serverId: serverId,
      userId: req.session.user.id,
    });
    const auction = await auctiondb.findById(id);

    const userRoleIds = userInfo.serverRoles?.map(role => role.roleId) || [];
    const allowedRoleIds = auction.whatRolesCanBid.map(role => role.roleId);
    const hasAllowedRole = userRoleIds.some(roleId =>
      allowedRoleIds.includes(roleId)
    );

    // Проверка статуса аукциона
    if (auction.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Аукцион ${auction.status === 'ended' ? 'завершен' : auction.status === 'cancelled' ? 'отменен' : 'не активен'}`
      });
    }

    // Проверка времени окончания
    if (new Date(auction.endTime) < new Date()) {
      return res.status(400).json({
        success: false,
        error: "Аукцион истек"
      });
    }

    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        error: "Недостаточно прав. Нельзя участвовать"
      });
    }

    // Проверка суммы ставки
    const bidAmount = Number(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Некорректная сумма ставки"
      });
    }

    // Проверка баланса
    if (bidAmount > userInfo.dkpPoints) {
      return res.status(400).json({
        success: false,
        error: "Недостаточно средств"
      });
    }

    // Текущая цена (если есть ставки - последняя, иначе стартовая)
    const currentPrice = auction.bids?.length > 0
      ? auction.bids[auction.bids.length - 1].amount
      : auction.startPrice;

    // Проверка минимальной ставки
    if (bidAmount <= currentPrice) {
      return res.status(400).json({
        success: false,
        error: `Ставка должна быть больше текущей цены (${currentPrice})`,
        currentPrice: currentPrice,
        minBid: currentPrice + auction.minBidStep
      });
    }

    // Проверка минимального шага
    if (bidAmount < currentPrice + auction.minBidStep) {
      return res.status(400).json({
        success: false,
        error: `Минимальный шаг ставки: ${auction.minBidStep}`,
        minBid: currentPrice + auction.minBidStep
      });
    }

    // Обычная ставка
    const updatedAuction = await auctiondb.findByIdAndUpdate(
      id,
      {
        $push: {
          bids: {
            userId: req.session.user.id,
            userName: req.session.user.tag || req.session.user.username,
            amount: bidAmount,
            createdAt: new Date()
          }
        },
        $set: {
          currentPrice: bidAmount
        }
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Ставка успешно сделана",
      data: {
        bid: {
          userId: req.session.user.id,
          userName: req.session.user.tag || req.session.user.username,
          amount: bidAmount,
          createdAt: new Date()
        },
        currentPrice: bidAmount,
        auctionId: auction._id
      }
    });
  } catch (error) {
    console.error('Error cancel auction:', error);
    return res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера"
    });
  }
})

app.get("/dis/userServers", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }
  const servers = await serverUserdb.find({ userId: req.session.user.id })

  if (servers.length === 0) {
    return res.status(404).send("Сервера не найдены")
  }

  const serverIds = servers.map((server) => server.serverId)
  const serverList = await serverdb.find({ serverId: { $in: serverIds } })

  // Если серверы найдены, отправляем их в ответ
  if (serverList.length > 0) {
    return res.json(serverList)
  } else {
    return res.status(404).send("Информация о серверах не найдена")
  }
})

app.post("/dis/userInfoFetch", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }
  const userStat = await serverUserdb.findOne({
    serverId: req.body.serverId,
    userId: req.session.user.id,
  })

  if (userStat) {
    const timestamp = userStat._id.getTimestamp();
    return res.json({
      ...userStat.toObject ? userStat.toObject() : userStat,
      date: timestamp
    })
  }
  return res.status(404).send("Пользователь не найден")
})

app.post("/dis/serverHistoryFetch", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }
  const logs = await pointsdb.find({
    serverId: req.body.serverId,
  })

  if (logs.length > 0) {
    const logsWithDate = logs.map(log => {
      const timestamp = log._id.getTimestamp();

      return {
        ...log.toObject ? log.toObject() : log,
        date: timestamp
      }
    });
    return res.json(logsWithDate)
  } else {
    return res.status(404).send("История не найдена")
  }
})

app.post("/dis/userHistoryFetch", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }
  const logs = await pointsdb.find({
    getterId: req.session.user.id,
    serverId: req.body.serverId,
  })

  if (logs.length > 0) {
    const logsWithDate = logs.map(log => {
      const timestamp = log._id.getTimestamp();

      return {
        ...log.toObject ? log.toObject() : log,
        date: timestamp
      }
    });
    return res.json(logsWithDate)
  } else {
    return res.status(404).send("История не найдена")
  }
})

app.post("/dis/usersBulkFetch", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }

  const { serverId, userIds } = req.body;

  // Формируем запрос
  const query = { serverId };

  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    query.userId = { $in: userIds };
  }

  try {
    const usersData = await serverUserdb.find(query); // или просто find() если Mongoose
    if (usersData && usersData.length > 0) {
      return res.json(usersData);
    } else {
      return res.json([]); // Возвращаем пустой массив вместо 404
    }
  } catch (error) {
    console.error("Ошибка получения пользователей:", error);
    return res.status(500).send("Ошибка сервера");
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const CronJob = require("cron").CronJob

const http = require("https")
const fs = require("fs")
const lang = JSON.parse(fs.readFileSync("en.json", "utf-8"))

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
  ],
})

const collection = new Collection()
bot.login(config.TOKEN)
const rest = new REST({ version: "10" }).setToken(config.TOKEN)
const st = new steam({
  apiKey: config.STEAM_TOKEN,
  format: "json", //optional ['json', 'xml', 'vdf']
})

//GET ROLES
app.post("/dis/channelRoles", async (req, res) => {
  try {
    const { guildId } = req.query;

    if (!guildId) {
      return res.status(400).json({
        error: "Параметр guildId обязателен"
      });
    }

    const guild = await bot.guilds.fetch(guildId);

    // Получаем роли сервера
    const roles = await guild.roles.fetch();

    // Форматируем ответ
    const rolesList = roles.map(role => ({
      id: role.id,
      name: role.name,
      color: role.hexColor,
      position: role.position,
      permissions: role.permissions.bitfield.toString(),
      isMentionable: role.mentionable,
      isHoisted: role.hoist,        // Отображается ли отдельно в списке
      isManaged: role.managed,      // Управляется ли интеграцией (ботом)
      createdAt: role.createdAt
    }));

    // Сортируем по позиции (от высшей к низшей)
    rolesList.sort((a, b) => b.position - a.position);

    res.json({
      guildId: guild.id,
      guildName: guild.name,
      totalRoles: rolesList.length,
      roles: rolesList
    });
  } catch (error) {
    console.error("Ошибка при получении ролей:", error);

    if (error.code === 10004) {
      return res.status(404).json({
        error: "Сервер не найден или бот не имеет к нему доступа"
      });
    }

    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      message: error.message
    });
  }

})
//GET ROLES

//PLAYER DISCORD
const { Player } = require("discord-player")
const player = new Player(bot, {
  enableLive: false,
  ytdlDownloadOptions: {
    filter: "audioonly",
  },
})
const playdl = require("play-dl")
bot.player = player
//PLAYER

const {
  userSchem,
  iconRoleSchem,
  nftUpdateSchem,
  serverdb,
  serverUserdb,
  pointsdb,
  auctiondb,
} = require("./schema/data.js")

const rand = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min)
}

const TimeOut = (time) =>
  new Promise((resolve, reject) => {
    setTimeout(resolve, time)
  })

const messCoin = require("./jobs/mess_coin.js")
const userdb = mongoose.model("users", userSchem)
const roledb = mongoose.model("roles", iconRoleSchem)

const getGO = (gameid) =>
  new Promise((resolve) => {
    st.getNumberOfCurrentPlayers({
      appid: gameid,
      callback: (err, data) => {
        resolve(!data ? data : data.response.player_count)
      },
    })
  })

const job = new CronJob("*/5 * * * *", null, false, "Europe/Moscow")

const auctionJob = new CronJob("*/1 * * * *", null, false, "Europe/Moscow")

auctionJob.addCallback(async () => {
  console.log('🔄 Проверка аукционов на завершение...', new Date().toISOString());

  try {
    // Находим активные аукционы, у которых время окончания меньше текущего времени
    const expiredAuctions = await auctiondb.find({
      status: 'active',
      endTime: { $lt: new Date() }
    });

    if (expiredAuctions.length === 0) {
      console.log('✅ Нет аукционов для завершения');
      return;
    }

    console.log(`📦 Найдено ${expiredAuctions.length} аукционов для завершения`);

    // Обрабатываем каждый аукцион
    for (const auction of expiredAuctions) {
      try {
        await completeAuction(auction);
        console.log(`✅ Аукцион "${auction.itemName}" (${auction._id}) завершен`);
      } catch (error) {
        console.error(`❌ Ошибка при завершении аукциона ${auction._id}:`, error);
      }
    }

    console.log('✅ Проверка завершена');
  } catch (error) {
    console.error('❌ Ошибка при проверке аукционов:', error);
  }
})

async function completeAuction(auction) {
  const winner = auction.bids && auction.bids.length > 0
    ? auction.bids[auction.bids.length - 1]
    : null;

  const updateData = {
    status: 'ended',
    endedAt: new Date(),
  };

  if (winner) {
    updateData.winner = {
      userId: winner.userId,
      userName: winner.userName,
      winningBid: winner.amount,
      claimedAt: null,
    };
  }

  const updatedAuction = await auctiondb.findByIdAndUpdate(
    auction._id,
    { $set: updateData },
    { new: true }
  );

  return updatedAuction;
}

bot.on("ready", (_) => {
  console.log(`Logged in as ${bot.user.tag}!`)
  bot.user.setPresence({
    activities: [
      {
        name: "dkp.grk.pw",
        type: ActivityType.Streaming,
        url: "https://dkp.grk.pw",
      },
    ],
    status: PresenceUpdateStatus.Idle,
  })

  // slash commands register
  const commands = [
    // new ContextMenuCommandBuilder()
    //   .setName("Login")
    //   .setNameLocalizations({ ru: "Авторизация" })
    //   .setType(ApplicationCommandType.User),
    new ContextMenuCommandBuilder()
      .setName("Point Balance")
      .setNameLocalizations({ ru: "Баланс очков" })
      .setType(ApplicationCommandType.User),
    new ContextMenuCommandBuilder()
      .setName("Give Points")
      .setNameLocalizations({ ru: "Выдать очки" })
      .setType(ApplicationCommandType.User)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
      .setName("login")
      .setDescription("Login to site")
      .setDescriptionLocalizations({ ru: "Перейти на сайт" }),
    new SlashCommandBuilder()
      .setName("set-server-currency-emoji")
      .setDescription("Set server currency emoji")
      .setDescriptionLocalizations({ ru: "Установить эмоджи валюты сервера" })
      .addStringOption((option) =>
        option
          .setName("emoji_id")
          .setDescription("Emoji Id")
          .setDescriptionLocalizations({ ru: "Айди Эмоджи" })
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
      .setName("bulk-points-give")
      .setDescription("Give points to multiple users")
      .setDescriptionLocalizations({
        ru: "Выдать очки нескольким пользователям",
      })
      .addStringOption((option) =>
        option
          .setName("user_list")
          .setDescription("Enter usernames or mention multiple users")
          .setRequired(true)
      )
      .addNumberOption((option) =>
        option
          .setName("points_count")
          .setDescription("Giving points count")
          .setDescriptionLocalizations({ ru: "Количество очков для выдачи" })
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Reason for giving points")
          .setDescriptionLocalizations({ ru: "Причина выдачи очков" })
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
      .setName("set-server-log-channel")
      .setDescription("Set Server log channel for bot")
      .setDescriptionLocalizations({
        ru: "Установить канал для вывода логов бота",
      })
      .addChannelOption((option) =>
        option
          .setName("selected_channel")
          .setDescription("Select Channel")
          .setDescriptionLocalizations({ ru: "Выбор Канала" })
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
      .setName("set-server-verification-role")
      .setDescription("Set server verification role for bot")
      .setDescriptionLocalizations({
        ru: "Установить роль которая верефицирует пользователя в боте",
      })
      .addRoleOption((option) =>
        option
          .setName("selected_role")
          .setDescription("Select Role")
          .setDescriptionLocalizations({ ru: "Выбор Роли" })
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  ]

  bot.on("interactionCreate", async (interaction) => {
    if (!interaction || !interaction.isUserContextMenuCommand()) return
    const iUser = (await userdb.findOne({ userid: interaction.targetId })) || {
      balance: 0,
      fine: 0,
    }
    const uUser = (await userdb.findOne({ userid: interaction.user.id })) || {
      balance: 0,
      fine: 0,
    }

    const currency = bot.emojis.cache.get(lang[4])
    if (interaction.commandName === 'Login') {
      await interaction.deferReply({ ephemeral: true });

      const token = crypto.randomBytes(32).toString('hex');

      loginTokens.set(token, {
        userId: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.displayAvatarURL(),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 минут
      });

      const loginUrl = `https://api.grk.pw/dis/bot-login?token=${token}`;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Войти на сайт')
          .setStyle(ButtonStyle.Link)
          .setURL(loginUrl)
      );

      await interaction.editReply({
        content: 'Нажми кнопку для авторизации (действует 5 минут):',
        components: [row],
      });
    } else if (interaction.commandName === "Give Points") {
      const serverInfo = await serverdb.findOne({
        serverId: interaction?.guildId,
      })
      if (!serverInfo) return interaction.reply("Server not supported")
      const currencyName = serverInfo?.serverCurrencyName || "DKP"

      const dkpModal = new ModalBuilder()
        .setCustomId(`dkpGive:${interaction.targetId}`)
        .setTitle(`Give ${currencyName}`)

      const dkpGiveInput = new TextInputBuilder()
        .setCustomId("dkpGiveInput")
        .setLabel(`How many ${currencyName} you want to Give?`)
        .setMaxLength(6)
        .setMinLength(1)
        .setValue("10")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)

      const dkpGiveReason = new TextInputBuilder()
        .setCustomId("dkpGiveReason")
        .setLabel(`Why do you want to give ${currencyName}?`)
        .setMaxLength(256)
        .setMinLength(1)
        .setPlaceholder("Reason here")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)

      const firstActionRow = new ActionRowBuilder().addComponents(dkpGiveInput)
      const secondActionRow = new ActionRowBuilder().addComponents(
        dkpGiveReason
      )

      dkpModal.addComponents(firstActionRow, secondActionRow)
      await interaction.showModal(dkpModal)
    } else if (interaction.commandName === "Point Balance") {
      const serverInfo = await serverdb.findOne({
        serverId: interaction?.guildId,
      })
      if (!serverInfo) return interaction.reply("Server not supported")
      const guild = bot.guilds.cache.get(interaction.guildId)
      const pointsEmoji = serverInfo?.serverCurrencyEmoji
        ? await guild.emojis.fetch(serverInfo.serverCurrencyEmoji)
        : null
      let serverUserInfo = await serverUserdb.findOne({
        serverId: interaction?.guildId,
        userId: interaction.targetId,
      })
      if (!serverUserInfo) {
        serverUserInfo = await serverUserdb.create({
          serverId: interaction?.guildId,
          userId: interaction.targetId,
        })
      }

      const calculateActivity = (activityPoints) => {
        const days = Math.floor(activityPoints / 1440) // 1440 минут в дне
        const hours = Math.floor((activityPoints % 1440) / 60)
        const minutes = activityPoints % 60
        return `${String(days).padStart(2, "0")}д ${String(hours).padStart(
          2,
          "0"
        )}ч ${String(minutes).padStart(2, "0")}м`
      }

      await interaction.reply({
        content: `
👤 **Никнейм**: ${serverUserInfo?.userName}
🔥 **Активность**: ${calculateActivity(serverUserInfo?.activityPoints)}
🏆 **Баланс**
> ${serverInfo?.serverCurrencyName || "DKP"}: **${serverUserInfo?.dkpPoints || 0} ${pointsEmoji || "💎"}**
  `.trim(),
        ephemeral: true,
      });
    }
  })

  bot.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return

    const [modalId, userId] = interaction.customId.split(":")

    if (modalId === "dkpGive" && userId) {
      const _serverData = await serverdb.findOne({
        serverId: interaction.guildId,
      })
      const guild = bot.guilds.cache.get(interaction.guildId)
      const pointsEmoji = _serverData.serverCurrencyEmoji
        ? await guild.emojis.fetch(_serverData.serverCurrencyEmoji)
        : null
      const targetDkpUser = await serverUserdb.findOne({
        serverId: interaction.guildId,
        userId: userId,
      })

      const dkpGiveInput = interaction.fields.getTextInputValue("dkpGiveInput")
      if (isNaN(dkpGiveInput)) {
        return await interaction.reply({
          content: "Ошибка: Введите корректное число!",
          ephemeral: true,
        })
      }

      // MIDDLEWARE
      const dkpGiveReason =
        interaction.fields.getTextInputValue("dkpGiveReason")
      await pointsdb.create({
        serverId: interaction.guildId,
        giverId: interaction.user.id,
        getterId: userId,
        givingPoints: dkpGiveInput,
        givingReason: dkpGiveReason || null,
      })

      targetDkpUser.dkpPoints += +dkpGiveInput
      const giveOrGet =
        dkpGiveInput > 0 ? "выданы пользователю" : "забраны у пользователя"
      await targetDkpUser.save()
      await interaction.reply({
        content: `**${Math.abs(dkpGiveInput)} ${pointsEmoji || "очков"
          }** успешно ${giveOrGet} <@${targetDkpUser.userId}>!\n**Причина:** ${dkpGiveReason || "Не указана"
          }`,
      })
    }
  })

  const rest = new REST({ version: "9" }).setToken(config.TOKEN)

  try {
    bot.guilds.cache.forEach(async (GUILD) => {
      const CLIENT_ID = bot.user.id
      const GUILD_ID = GUILD.id

      const server = await serverdb.findOne({ serverId: GUILD.id })
      if (!server) {
        const newServer = await serverdb.create({
          serverId: GUILD.id,
          serverName: GUILD.name,
          active: true,
          ownerId: GUILD.ownerId || null
        })
        console.log(`Created ${newServer}`)
      }

      // if (!server.ownerId) {
      //   server.ownerId = GUILD.ownerId
      //   await server.save()
      //   console.log(`Добавлен владелец серверу ${server.serverName}`)
      // }

      GUILD.members.cache.forEach(async (MEMBER) => {
        const { user } = MEMBER
        const serverUser = await serverUserdb.findOne({
          serverId: GUILD.id,
          userId: user.id,
        })
        if (!serverUser) {
          const newServerUser = await serverUserdb.create({
            serverId: GUILD.id,
            userId: user.id,
          })
          console.log(`Created Server User ${newServerUser}`)
        }
      })

      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: commands,
      })
    })
  } catch (error) {
    console.error(error)
  }
})

const { getRainState, formatRoundedDuration, getDayNightState } = require('./module/throneandliberty/weather.js');

//WEATHER SYSTEM
job.addCallback(async () => {
  const rain = getRainState(); // по умолчанию Date.now()
  const phase = getDayNightState();

  try {
    const fetchTLInfo = async (phaseChannelId, weatherChannelId) => {
      const phaseChannel = bot.channels.resolve(phaseChannelId)
      const dayNightText = phase.isDay
        ? `☀️ День ${formatRoundedDuration(phase.remainingMs)}`
        : `🌙 Ночь ${formatRoundedDuration(phase.remainingMs)}`;
      await phaseChannel.setName(dayNightText)
      const weatherChannel = bot.channels.resolve(weatherChannelId)
      const weatherText = rain.isRaining
        ? `🌧️ Дождь ${formatRoundedDuration(rain.remainingMs)}`
        : `🌤️ Дождь через ${formatRoundedDuration(rain.nextRainAtMs - Date.now())}`
      await weatherChannel.setName(weatherText)
    }

    await fetchTLInfo(
      "1521309293695995934",
      "1521319798825287741"
    )
  } catch (e) {
    console.error(e)
  }
})
//WEATHER SYSTEM

//ACTIVITY SYSTEM
const {
  acvititySystem,
} = require("./module/server-currency-system/acvititySystem")
acvititySystem(bot, redis)
//ACTIVITY SYSTEM

bot.on("guildMemberRemove", async (member) => {
  try {
    const serverId = member.guild.id
    const serverFromDb = await serverdb.findOne({ serverId })
    if (serverFromDb && serverFromDb?.logChannelId) {
      const logChannel = member.guild.channels.cache.get(serverFromDb.logChannelId);
      if (!logChannel) return;

      const findName = member?.nickname ?? member?.user?.globalName ?? member?.user?.username ?? 'Неизвестный пользователь'
      const roles = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => `\`${role.name}\``)
        .join(' ') || '`Нет ролей`';

      const embed = {
        color: 0xff0000,
        author: {
          name: `${findName} покинул сервер`,
          icon_url: member.user.displayAvatarURL({ dynamic: true })
        },
        description: `<@${member.id}> (${member.id})`,
        fields: [
          {
            name: '📋 Роли',
            value: roles,
            inline: false
          },
          {
            name: '📅 Присоединился',
            value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>` : 'Неизвестно',
            inline: true
          },
          {
            name: '👥 Участников',
            value: `${member.guild.memberCount}`,
            inline: true
          }
        ],
        thumbnail: {
          url: member.user.displayAvatarURL({ dynamic: true })
        },
        timestamp: new Date().toISOString(),
        footer: {
          text: `ID: ${member.id}`
        }
      };

      await logChannel.send({ embeds: [embed] });
    }
  } catch (e) {
    console.error('Ошибка в guildMemberRemove:', e);
  }
})

async function syncUserRoles(oldMember, newMember, server) {
  // Пропускаем ботов
  if (newMember.user.bot) return

  const isAdmin = newMember.permissions.has(0x8n);

  // Получаем текущие роли (исключая @everyone)
  const currentRoles = newMember.roles.cache
    .filter(role => role.id !== newMember.guild.id) // исключаем @everyone
    .map(role => ({
      roleName: role.name,
      roleId: role.id
    }))

  // Обновляем в базе
  await serverUserdb.findOneAndUpdate(
    {
      serverId: newMember.guild.id,
      userId: newMember.user.id
    },
    {
      $set: {
        serverRole: isAdmin ? "admin" : null,
        serverRoles: currentRoles,
      }
    },
    { upsert: true, new: true }
  )
}

bot.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (newMember.user.bot) return
  if (!newMember?.guild?.id) return

  try {
    const server = await serverdb.findOne({ serverId: newMember.guild.id })

    if (!server?.verificationRoleId) return
    console.log(newMember.roles.cache.has(server.verificationRoleId))
    if (newMember.guild.id == server.serverId && newMember.roles.cache.has(server.verificationRoleId)) {
      const findNickName = newMember?.nickname ?? newMember?.user?.globalName ?? null

      await serverUserdb.findOneAndUpdate(
        { serverId: newMember.guild.id, userId: newMember.user.id },
        { $set: { userName: findNickName } },
        { upsert: true, new: true }
      )
    }

    await syncUserRoles(oldMember, newMember, server)
  } catch (error) {
    console.error('Ошибка в guildMemberUpdate:', error)
  }
})

bot.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || message.channel.type == "dm") return

    let user = await userdb.findOne({ userid: message.member.user.id })
    if (!user) {
      user = await userdb.create({
        userid: message.member.user.id,
      })
    }

    const args = message.content.trim().split(/ +/g)
    const command = args.shift().toLowerCase()
    const currency = bot.emojis.cache.get(lang[4])
    let ubot = await userdb.findOne({ userid: bot.user.id })

    const updateBalance = async (price) => {
      user.balance = user.balance - price
      ubot.balance = ubot.balance + price
      await user.save()
      await ubot.save()
    }

    if (command === "-cash") {
      if (user.acclvl < 10) return
      await updateBalance(1)
    }

    if (command === "setacc") {
      const ct = +message.content.split(" ")[1]
      if (user.acclvl !== 27) return
      const userid = message.content.split(" ")[2]
      try {
        await message.guild.members.fetch(userid)
      } catch (e) {
        return message.reply("Not Correct UserID")
      }
      const user1 = await userdb.findOne({ userid })
      if (ct >= 0 && ct <= 10) {
        user1.acclvl = ct
        await user1.save()
        message.reply(`User: <@!${userid}> acclvl now ${ct}`)
      }
    }

    if (command === "dsactivtop") {
      const allServerUsers = await serverUserdb
        .find({ serverId: message.guildId })
        .sort({ activityPoints: -1 })
      const top10 = allServerUsers.slice(0, 10)
      const top10map = top10.map((x) => {
        let nickname = "Unknown"
        if (x.userId) {
          if (!message.guild.members.cache.get(x.userId)) {
            nickname = bot.users.cache.get(x.userId).username
          } else {
            nickname =
              message.guild.members.cache.get(x.userId).nickname ||
              message.guild.members.cache.get(x.userId).user.username
          }
        }
        return `${nickname} - ${x.activityPoints}`
      })
      message.reply({
        content: top10map.join("\n"),
      })
    }

    if (command === "fib") {
      const cmt = message.content.split("fib ")[1]
      if (!Number(cmt)) return
      const fibArr = []
      for (let i = 0; i < cmt; i++) {
        const fomula = Math.floor(
          (((1 + Math.sqrt(5)) / 2) ** i - ((1 - Math.sqrt(5)) / 2) ** i) /
          Math.sqrt(5)
        )
        if (fomula >= Number.MAX_SAFE_INTEGER) break
        fibArr.push(fomula)
      }
      message.reply(fibArr.join(" "))
    }

    if (command === "gn") {
      const cmt = +message.content.split("gn ")[1] || 1
      const fi = (Math.sqrt(5) + cmt) / 2
      const q = await message.reply(`(√5+${cmt})/2`)
      setTimeout(() => q.edit(String(fi)), 1000)
    }

    if (message.content === "multipage") {
      const pages = [
        new EmbedBuilder()
          .setTitle("Page 1")
          .setDescription("This is the first page."),
        new EmbedBuilder()
          .setTitle("Page 2")
          .setDescription("This is the second page."),
        new EmbedBuilder()
          .setTitle("Page 3")
          .setDescription("This is the third page."),
      ]

      let currentPage = 0

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("previous")
            .setLabel("Previous")
            .setStyle(ButtonStyle.Secondary)
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
        )

      message
        .reply({ embeds: [pages[currentPage]], components: [row] })
        .then((msg) => {
          const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
          })

          collector.on("collect", (interaction) => {
            if (interaction.customId === "previous") {
              if (currentPage > 0) {
                currentPage--
                interaction.update({ embeds: [pages[currentPage]] })
              }
            } else if (interaction.customId === "next") {
              if (currentPage < pages.length - 1) {
                currentPage++
                interaction.update({ embeds: [pages[currentPage]] })
              }
            }
          })

          collector.on("end", () => {
            msg.edit({ components: [] })
          })
        })
    }

    if (command === "roll") {
      const cmt = +message.content.split("roll ")[1] || 1
      if (cmt > 100 || cmt < 0)
        return message.reply("Слишком большое или маленькое число")
      const mrr = await message.reply(`Ролл...`)
      let i = 0
      const randNumber = setInterval(() => {
        i++
        let qube = Math.floor(Math.random() * cmt) + 1
        if (i == 27) {
          clearInterval(randNumber)
          mrr.edit(`Выпало **${qube}**`)
          return
        }
        mrr.edit(`Выпало ${qube}`)
      }, 500)
    }

    if (command === "roll_gif") {
      const cmt = +message.content.split("roll ")[1] || 1
      if (cmt > 100 || cmt < 0)
        return message.reply("Слишком большое или маленькое число")
      const { createRollingGif } = require("./module/utills/RollGen.js")
      const buffer = await createRollingGif()
      const attachment = new AttachmentBuilder(buffer, {
        name: "rolling_numbers.gif",
      })

      await message.reply({ content: "Ролл", files: [attachment] })
    }

    if (message.channelId) {
      await messCoin(message, bot, lang, collection, userdb)
    }
  } catch (e) {
    console.log(`error ${e}`)
  }
})

bot.on("interactionCreate", async (inter) => {
  const currency = bot.emojis.cache.get(lang[4])
  const sflcurr = bot.emojis.cache.get("1073936545280688229")
  const bslt = bot.emojis.cache.get("1102467668310769694")
  if (!inter.isChatInputCommand()) return

  try {
    if (!inter.guildId) {
      return await inter.reply(`Can't work in DM ${inter.user.username}`)
    }

    const command = inter.commandName

    let user = await userdb.findOne({ userid: inter.member.user.id })
    if (!user) {
      user = await userdb.create({ userid: inter.member.user.id })
    }

    // slash commands here
    const iUser = inter.options.getUser("user") || 0
    const userDB = await userdb.findOne({ userid: iUser.id })

    switch (command) {
      case "set-server-verification-role":
        const role = inter.options.getRole("selected_role")
        if (!role) {
          return await inter.reply({
            content: "❌ Роль не найдена",
            ephemeral: true
          })
        }

        try {
          const serverInfo = await serverdb.findOne({ serverId: inter.guildId })
          serverInfo.verificationRoleId = role.id // или как у вас называется поле
          await serverInfo.save()

          return await inter.reply({
            content: `✅ Роль для верификации установлена: ${role}`,
            ephemeral: true
          })
        } catch (e) {
          return await inter.reply({
            content: `❌ Ошибка: ${e.message}`,
            ephemeral: true
          })
        }
      case "set-server-log-channel":
        const channel = inter.options.getChannel("selected_channel")
        if (!channel) {
          return await inter.reply({
            content: "❌ Канал не найден",
            ephemeral: true
          })
        }

        try {
          const serverInfo = await serverdb.findOne({ serverId: inter.guildId })
          serverInfo.logChannelId = channel.id // или как у вас называется поле
          await serverInfo.save()

          return await inter.reply({
            content: `✅ Канал для логов установлен: ${channel}`,
            ephemeral: true
          })
        } catch (e) {
          return await inter.reply({
            content: `❌ Ошибка: ${e.message}`,
            ephemeral: true
          })
        }
      case "login":
        const token = crypto.randomBytes(32).toString('hex');

        loginTokens.set(token, {
          userId: inter.user.id,
          username: inter.user.username,
          avatar: inter.user.displayAvatarURL(),
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 минут
        });

        const loginUrl = `https://api.grk.pw/dis/bot-login?token=${token}`;

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Войти на сайт')
            .setStyle(ButtonStyle.Link)
            .setURL(loginUrl)
        );

        return await inter.reply({
          content: 'Нажми кнопку для авторизации (действует 5 минут):',
          components: [row],
          ephemeral: true
        });
      case "set-server-currency-emoji":
        const emojiId = inter.options.getString("emoji_id")
        try {
          const guild = bot.guilds.cache.get(inter.guildId)
          const pointsEmoji = guild ? await guild.emojis.fetch(emojiId) : null
          const serverInfo = await serverdb.findOne({
            serverId: inter.guildId,
          })
          serverInfo.serverCurrencyEmoji = `${pointsEmoji.id}`
          await serverInfo.save()
          return await inter.reply({
            content: `New emoji set: ${pointsEmoji}`,
            ephemeral: true,
          })
        } catch (e) {
          return await inter.reply({
            content: `Error: ${e.message}`,
            ephemeral: true,
          })
        }
      case "bulk-points-give":
        const userList = inter.options.getString("user_list")
        const userIds = userList
          .match(/<@(\d+)>/g)
          .map((mention) => mention.replace(/[<@>]/g, ""))

        const serverId = inter.guildId
        const _server = serverdb.findOne({ serverId })
        const guild = bot.guilds.cache.get(inter.guildId)
        const pointsEmoji = _server?.serverCurrencyEmoji
          ? await guild.emojis.fetch(_server.serverCurrencyEmoji)
          : null
        const pointsCount = inter.options.getNumber("points_count")
        const giveReason = inter.options.getString("reason") || "Без причины"

        const giveOrGett =
          pointsCount > 0 ? "выданы пользователям" : "забраны у пользователей"
        let replySummary = `**Очки за ${giveReason} успешно ${giveOrGett}:**\n\n`

        for (const userId of userIds) {
          try {
            await serverUserdb.findOneAndUpdate(
              { serverId, userId },
              {
                $inc: { dkpPoints: pointsCount },
                $setOnInsert: { userName: null } // устанавливается только при создании
              },
              { upsert: true, new: true }
            )

            // Создание записи о выдаче очков
            await pointsdb.create({
              serverId,
              giverId: inter.user.id,
              getterId: userId,
              givingPoints: pointsCount,
              givingReason: giveReason,
            })

            replySummary += `<@${userId}>: **${Math.abs(pointsCount)} ${pointsEmoji || "Очков"}**\n`
          } catch (error) {
            console.error(`Ошибка при выдаче очков пользователю ${userId}:`, error)
            replySummary += `<@${userId}>: Ошибка при выдаче очков\n`
          }
        }

        return await inter.reply({
          content: replySummary,
          ephemeral: false,
        })

      default:
        return await inter.reply("Команда не найдена")
    }
  } catch (e) {
    console.error(`error: ${e}`)
  }
})

// bot.on("interactionCreate", async (button) => {
//   if (!button.isButton()) return
// })

const deleteAllGlobalCommands = async () => {
  try {
    await rest.put(Routes.applicationCommands(bot.user.id), { body: [] })
    console.log("Successfully deleted all application commands.")
  } catch (e) {
    console.log(e)
  }
}

const stdin = process.openStdin()

stdin.addListener("data", async (d) => {
  d = d.toString().trim()
  if (d == "delg") {
    deleteAllGlobalCommands()
  } else if (d == "uunames") {
    try {
      const guild = await bot.guilds.fetch('1294943882857025536');
      const members = await guild.members.fetch();
      const roleMembers = members.filter(m => m.roles.cache.has('1295320531918393365'));

      let updated = 0;
      let created = 0;

      for (const [id, member] of roleMembers) {
        let user = await serverUserdb.findOne({ userId: id });

        if (!user) {
          created++;
        } else {
          user.userName = member.nickname || null;
          updated++;
        }

        await user.save();
      }

      console.log(`Готово! Обновлено: ${updated}, Создано: ${created}, Всего: ${roleMembers.size}`);
    } catch (error) {
      console.error('Ошибка:', error);
    }
  } else if (d == "uuroles") {
    try {
      const guild = await bot.guilds.fetch('1294943882857025536');
      const members = await guild.members.fetch();

      let updated = 0;
      let created = 0;
      let skipped = 0;

      for (const [id, member] of members) {
        // Пропускаем ботов
        if (member.user.bot) {
          skipped++;
          continue;
        }

        // Получаем роли пользователя (исключая @everyone)
        const roles = member.roles.cache
          .filter(role => role.id !== guild.id)
          .map(role => ({
            roleName: role.name,
            roleId: role.id
          }));

        // Находим или создаём запись в базе
        let user = await serverUserdb.findOne({
          serverId: guild.id,
          userId: id
        });

        if (!user) {
          user = new serverUserdb({
            serverId: guild.id,
            userId: id,
            userName: member.nickname || member.user.globalName || null,
            serverRole: null
          });
          created++;
        } else {
          user.serverRole = null;
          updated++;
        }

        await user.save();
      }

      console.log(`✅ uuroles: Обновлено: ${updated}, Создано: ${created}, Пропущено ботов: ${skipped}, Всего: ${members.size}`);
    } catch (error) {
      console.error('❌ Ошибка в uuroles:', error);
    }

  }
})

process.on("uncaughtException", function (err) {
  console.error(err)
})

//DataBase
mongoose
  .connect(
    `mongodb://${config.DBUSER}:${config.DBPASS}@${config.SERVER}/${config.DB}`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("MongoDB connected!!")
  })
  .catch((err) => {
    console.log("Failed to connect to MongoDB", err)
  })
