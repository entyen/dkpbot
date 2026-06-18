import "./discordAuth.scss";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";

interface User {
  id: string;
  global_name: string;
  username: string;
}

interface ServerUser {
  _id: string;
  serverId: string;
  userId: string;
  userName: string;
  serverRole: string;
  dkpPoints: number;
  activityPoints: number;
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
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [serverUserData, setServerUserData] = useState<ServerUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFromLocalStorage = useCallback(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch (e) {
        console.error("Ошибка парсинга user:", e);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  const fetchServerUserData = useCallback(async () => {
    try {
      const servers = localStorage.getItem("servers");
      if (!servers) {
        setError("Данные отсутствуют в localStorage.");
        return;
      }

      const parsedServers = JSON.parse(servers);
      const serverId = parsedServers.selectedServer?.serverId;

      if (!serverId) {
        setError("Некорректные данные пользователя или сервера.");
        return;
      }

      const response = await axios.post(
        "https://api.grk.pw/dis/userInfoFetch",
        { serverId },
        { withCredentials: true }
      );

      if (response.status === 401) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      if (typeof response.data === "object" && response.data._id) {
        setServerUserData(response.data);
        setError(null);
      } else {
        setServerUserData(null);
        setError("Данные о пользователе на сервере не найдены.");
      }
    } catch (error) {
      console.error("Ошибка при получении данных:", error);
      setError("Не удалось загрузить данные. Попробуйте позже.");
      setServerUserData(null);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Объединенный эффект для загрузки данных
  useEffect(() => {
    setIsLoading(true);
    loadUserFromLocalStorage();
    fetchServerUserData();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "user") {
        loadUserFromLocalStorage();
      }
      if (event.key === "servers") {
        fetchServerUserData();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadUserFromLocalStorage, fetchServerUserData]);

  // Периодическая проверка (можно убрать, если не нужно)
  useEffect(() => {
    const interval = setInterval(() => {
      loadUserFromLocalStorage();
    }, 500);

    return () => clearInterval(interval);
  }, [loadUserFromLocalStorage]);

  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="dashboard__loading">
          <span className="dashboard__spinner" />
          Загрузка данных пользователя...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard">
        <div className="dashboard__error">
          <p>Пожалуйста, авторизуйтесь через Discord.</p>
          <DiscordLoginButton />
        </div>
      </div>
    );
  }

  const currentUserData = serverUserData;

  return (
    <div className="dashboard">
      <div className="dashboard__card">
        <h1 className="dashboard__title">
          Добро пожаловать, {user.global_name || user.username}!
        </h1>
        <p className="dashboard__subtitle">
          {currentUserData && (
            <>
              <strong>Discord Name:</strong> {currentUserData.userName}
              <br />
              <strong>DKP:</strong> {currentUserData.dkpPoints}
              <br />
              <strong>Роль:</strong> {currentUserData.serverRole}
            </>
          )}
        </p>
        {error && <div className="dashboard__error">{error}</div>}
      </div>
    </div>
  );
};