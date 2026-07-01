import "./discordAuth.scss";
export const DiscordLoginButton = () => {
  const handleLogin = () => {
    window.location.href = "https://api.grk.pw/dis/auth";
  };

  return (
    <button className="DiscordLoginButton" onClick={handleLogin}>
      Авторизоваться через Discord
    </button>
  );
};
