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
const config = require("./config.json")
const app = express()
const axios = require("axios")
const cors = require("cors")

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// express link web3 and discord bot account
const PORT = process.env.PORT || 2000

app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
)

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
    res.redirect("https://dkp.grk.pw/dashboard") // Перенаправление на клиент
  } catch (error) {
    console.error("Ошибка при авторизации через Discord:", error)
    res.redirect("https://dkp.grk.pw")
  }
})

app.get("/dis/user", (req, res) => {
  console.log(req.session)
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }
  res.json(req.session.user)
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

app.post("/dis/userHistoryFetch", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Не авторизован")
  }
  const logs = await pointsdb.find({
    getterId: req.session.user.id,
    serverId: req.body.serverId,
  })

  if (logs.length > 0) {
    return res.json(logs)
  } else {
    return res.status(404).send("История не найдена")
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const CronJob = require("cron").CronJob

const http = require("https")
const fs = require("fs")
const lang = JSON.parse(fs.readFileSync("en.json", "utf-8"))
const {
  parseTlServerStatus,
  parseTlWeatherInfo,
} = require("./module/throneandliberty/TlServerStatus.js")
const {
  parseImageForFindText,
} = require("./module/throneandliberty/NameDetector.js")

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
    new SlashCommandBuilder().setName("balance").setDescription(lang[5]),
    new SlashCommandBuilder()
      .setName("farm")
      .setDescription(lang[9])
      .addUserOption((option) =>
        option.setName("user").setDescription("User").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("bumpkin")
      .setDescription(lang[10])
      .addUserOption((option) =>
        option.setName("user").setDescription("User").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("pay")
      .setDescription("Pay to user")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to pay").setRequired(true)
      )
      .addNumberOption((option) =>
        option
          .setName("amount")
          .setDescription("Amount to pay")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("calc")
      .setDescription("Calc cripto cource")
      .addNumberOption((option) =>
        option
          .setName("value")
          .setDescription("Value to calculate")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("fine")
      .setNameLocalizations({
        ru: "штраф",
      })
      .setDescription("Add fine to user")
      .setDescriptionLocalizations({ ru: "Добавить штраф пользователю" })
      .addUserOption((option) =>
        option
          .setName("user")
          .setNameLocalizations({ ru: "пользователь" })
          .setDescription("Select user")
          .setRequired(true)
      )
      .addNumberOption((option) =>
        option
          .setName("amount")
          .setNameLocalizations({ ru: "сумма" })
          .setDescription("Amount to fine")
          .setDescriptionLocalizations({ ru: "Сумма штрафа" })
          .setRequired(true)
          .setMaxValue(10000)
          .setChoices({
            name: "1000",
            value: 1000,
          })
      ),
    new SlashCommandBuilder()
      .setName("checkfine")
      .setNameLocalizations({ ru: "проверитьштраф" })
      .setDescription("Check user fine")
      .setDescriptionLocalizations({ ru: "Проверить штраф пользователя" })
      .addUserOption((option) =>
        option
          .setName("user")
          .setNameLocalizations({ ru: "пользователь" })
          .setDescription("User")
          .setRequired(true)
      ),
    new ContextMenuCommandBuilder()
      .setName("User Information")
      .setNameLocalizations({ ru: "Информация о пользователе" })
      .setType(ApplicationCommandType.User),
    // .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new ContextMenuCommandBuilder()
      .setName("User Balance")
      .setNameLocalizations({ ru: "Баланс пользователя" })
      .setType(ApplicationCommandType.User),
    new ContextMenuCommandBuilder()
      .setName("Donate Aden")
      .setNameLocalizations({ ru: "Задонить Адены" })
      .setType(ApplicationCommandType.User),
    new SlashCommandBuilder()
      .setName("popusk")
      .setNameLocalizations({ ru: "попуск" })
      .setDescription("Set user popusk")
      .setDescriptionLocalizations({ ru: "Установить попуск пользователя" })
      .addStringOption((option) =>
        option
          .setName("name")
          .setNameLocalizations({ ru: "имя" })
          .setDescription("Popusk name")
          .setDescriptionLocalizations({ ru: "Имя попуска" })
          .setRequired(true)
      ),
    new SlashCommandBuilder().setName("walletset").setDescription(lang[8]),
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
    if (interaction.commandName === "User Information") {
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("User Information")
        .setDescription(
          `User: <@${iUser}>\n\n **Balance**: ${iUser.balance} ${currency}\n **Fine**: ${iUser.fine} ${currency}`
        )
      await interaction.reply({ embeds: [embed] })
    } else if (interaction.commandName === "User Balance") {
      await interaction.reply({
        content: `${iUser.balance} Aden`,
        ephemeral: true,
      })
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
        content: `**Баланс**:\n> ${
          serverInfo?.serverCurrencyName || "DKP"
        }: **${serverUserInfo?.dkpPoints || 0} ${
          pointsEmoji || ""
        }**\n**Активность**: ${calculateActivity(
          serverUserInfo?.activityPoints
        )}`,
        ephemeral: true,
      })
    } else if (interaction.commandName === "Donate Aden") {
      const modal = new ModalBuilder()
        .setCustomId(`adenaDonate:${iUser.userid}`)
        .setTitle("Adena Donation")

      const adenaDonateInput = new TextInputBuilder()
        .setCustomId("adenaDonateInput")
        .setLabel("How many adena you want to Donate?")
        .setMaxLength(3)
        .setMinLength(1)
        .setValue("3")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)

      const secondActionRow = new ActionRowBuilder().addComponents(
        adenaDonateInput
      )

      modal.addComponents(secondActionRow)
      await interaction.showModal(modal)
    }
  })

  bot.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return

    const [modalId, userId] = interaction.customId.split(":")

    if (modalId === "adenaDonate" && userId) {
      const targetUser = await userdb.findOne({
        userid: userId,
      })
      const selfUser = await userdb.findOne({
        userid: interaction.user.id,
      })

      const adenaDonateInput =
        interaction.fields.getTextInputValue("adenaDonateInput")
      if (isNaN(adenaDonateInput) || adenaDonateInput <= 0) {
        return await interaction.reply({
          content: "Ошибка: Введите корректное число!",
          ephemeral: true,
        })
      }

      selfUser.balance -= +adenaDonateInput
      targetUser.balance += +adenaDonateInput
      await selfUser.save()
      await targetUser.save()
      await interaction.reply({
        content: `You succecful send ${adenaDonateInput} Adena to <@${targetUser.userid}>`,
        ephemeral: true,
      })
    } else if (modalId === "dkpGive" && userId) {
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
        content: `**${Math.abs(dkpGiveInput)} ${
          pointsEmoji || "очков"
        }** успешно ${giveOrGet} <@${targetDkpUser.userId}>!\n**Причина:** ${
          dkpGiveReason || "Не указана"
        }`,
      })
    }
  })

  const rest = new REST({ version: "9" }).setToken(config.TOKEN)

  try {
    bot.guilds.cache.forEach(async (GUILD) => {
      const CLIENT_ID = bot.user.id
      const GUILD_ID = GUILD.id

      const commandsToUpload = ["570707745028964353"].includes(GUILD_ID)
        ? commands
        : commands.slice(12)

      const server = await serverdb.findOne({ serverId: GUILD.id })
      if (!server) {
        const newServer = await serverdb.create({
          serverId: GUILD.id,
          serverName: GUILD.name,
          active: true,
        })
        console.log(`Created ${newServer}`)
      }
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
        body: commandsToUpload,
      })
    })
  } catch (error) {
    console.error(error)
  }
})

//activitySystem
const {
  acvititySystem,
} = require("./module/server-currency-system/acvititySystem")
acvititySystem(bot)

bot.on("guildMemberUpdate", async (oldMember, newMember) => {
  let role = await roledb.find({})
  role.forEach(async (r) => {
    const roleId = r.roleId
    if (
      newMember._roles.find((x) => x === roleId) &&
      !oldMember._roles.find((x) => x === roleId)
    ) {
      const tk = await newMember.guild.roles.fetch(roleId)
      if (!newMember.user.username.match(/^[a-zA-Z0-9а-яА-Я]+$/)) {
        await newMember.guild.members.cache
          .get(newMember.user.id)
          .setNickname("Dirt")
      }
      const icon = tk.name.replace(/[A-z0-9 _.-]/g, "")
      if (newMember.nickname) {
        newMember.guild.members.cache
          .get(newMember.user.id)
          .setNickname(
            newMember.nickname.replace(/[^A-z0-9]/g, "") + " " + icon
          )
      } else {
        newMember.guild.members.cache
          .get(newMember.user.id)
          .setNickname(newMember.user.username + " " + icon)
      }
    } else if (
      oldMember._roles.find((x) => x === roleId) &&
      !newMember._roles.find((x) => x === roleId)
    ) {
      if (newMember.nickname) {
        newMember.guild.members.cache
          .get(newMember.user.id)
          .setNickname(newMember.nickname.replace(/[^A-z0-9]/g, ""))
      } else {
        newMember.guild.members.cache
          .get(newMember.user.id)
          .setNickname(newMember.user.username)
      }
    }
  })
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
            const userFromDB = await serverUserdb.findOne({ serverId, userId })
            if (!userFromDB) {
              replySummary += `<@${userId}>: Пользователь не найден в базе данных\n`
              continue
            }

            // Создание записи о выдаче очков
            await pointsdb.create({
              serverId,
              giverId: inter.user.id,
              getterId: userId,
              givingPoints: pointsCount,
              givingReason: giveReason,
            })

            // Обновление очков пользователя
            userFromDB.dkpPoints += pointsCount
            await userFromDB.save()

            replySummary += `<@${userId}>: **${Math.abs(pointsCount)} ${
              pointsEmoji || "Очков"
            }**\n`
          } catch (error) {
            console.error(
              `Ошибка при выдаче очков пользователю ${userId}:`,
              error
            )
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
  } else if (d == "qq") {
    const status = await parseTlWeatherInfo("Europe")
    console.log(status)
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
