import "./homePage.scss";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { User, ServerUser } from "@/shared/types";
import { fetchServerUserData } from "@/features";
import { useDocumentTitle } from "@/shared/hooks";
import { PointsBadge } from "@/shared/ui";

export const HomePage = () => {
  useDocumentTitle("User Home Page")
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

  // Объединенный эффект для загрузки данных
  useEffect(() => {
    setIsLoading(true);
    loadUserFromLocalStorage();
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
      <div className="home">
        <div className="home__loading">
          <span className="home__spinner" />
          Загрузка данных пользователя...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="home">
        <div className="home__error">
          <p>Пожалуйста, авторизуйтесь через Discord.</p>
        </div>
      </div>
    );
  }

  const currentUserData = serverUserData;

  return (
    <div className="home">
      <div className="home__card">
        <h1 className="home__title">
          Добро пожаловать, {user.global_name || user.username}!
        </h1>
        <p className="home__subtitle">
          {currentUserData && (
            <>
              <strong>Discord Name:</strong> {currentUserData.userName}
              <br />
              <strong>Points:</strong> <PointsBadge value={currentUserData.dkpPoints} />
              <br />
              <strong>Роль:</strong> {currentUserData.serverRole}
            </>
          )}
        </p>
        {error && <div className="home__error">{error}</div>}
      </div>
    </div>
  );
};
