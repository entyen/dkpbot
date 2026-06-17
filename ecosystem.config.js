module.exports = {
  apps: [
    {
      name: "@dkpbot/bot",
      script: "pnpm",
      args: "start",
      cwd: "./packages/bot",
    }
  ],
};
