import { useEffect, useState } from "react";
import "./discordAuth.scss";

interface User {
  id: string;
  global_name: string;
  username: string;
}

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

export const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);

  const loadUserFromLocalStorage = () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser) as User);
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUserFromLocalStorage();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") {
        loadUserFromLocalStorage();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadUserFromLocalStorage();
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return (
      <div className="dashboard">
        <div className="dashboard__loading">
          <span className="dashboard__spinner" />
          Загрузка данных пользователя...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard__card">
        <h1 className="dashboard__title">
          Добро пожаловать, {user.global_name}
        </h1>
        <p className="dashboard__subtitle">
          <strong>Discord:</strong> {user.username}
        </p>
      </div>
    </div>
  );
};