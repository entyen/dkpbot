import "./dashboardPage.scss"
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { User, ServerUser, Server } from "@/shared/types";
import { fetchServerUserData } from "@/features";


export const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [server, setServer] = useState<Server | null>(null);
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

  const loadServersFromLocalStorage = useCallback(() => {
    const storedServers = localStorage.getItem("servers");
    if (storedServers) {
      try {
        setServer(JSON.parse(storedServers) as Server)
      } catch (e) {
        console.error("Ошибка парсинга servers:", e);
        setServer(null);
      }
    } else {
      setError("Данные отсутствуют в localStorage.");
      return setServer(null);
    }
  }, []);

  // Объединенный эффект для загрузки данных
  useEffect(() => {
    setIsLoading(true);
    loadUserFromLocalStorage();
    loadServersFromLocalStorage();
    fetchServerUserData({
      navigate,
      setServerUserData,
      setError,
      setIsLoading,
    });

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "user") {
        loadUserFromLocalStorage();
      }
      if (event.key === "servers") {
        fetchServerUserData({
          navigate,
          setServerUserData,
          setError,
          setIsLoading,
        });
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadUserFromLocalStorage, navigate]);

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
        </div>
      </div>
    );
  }

  const currentUserData = serverUserData;
  currentUserData

  return (
    <div className="dashboard">
      <div className="dashboard__card">
        <h1 className="dashboard__title">
          <strong>Информация о сервере</strong>
        </h1>
        <p className="dashboard__subtitle">
          {server?.selectedServer && (
            <>
              <strong>Server Name:</strong> {server?.selectedServer?.serverName}
              <br />
              <strong>Server ID:</strong> {server?.selectedServer?.serverId}
              <br />
              <strong>Currency Emoji:</strong> {server?.selectedServer?.serverCurrencyEmoji}
            </>
          )}
        </p>
        {error && <div className="dashboard__error">{error}</div>}
      </div>
    </div>
  );
};