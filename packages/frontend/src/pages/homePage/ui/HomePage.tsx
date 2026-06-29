import "./homePage.scss";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { User, ServerUser } from "@/shared/types";
import { fetchServerUserData } from "@/features";
import { useDocumentTitle } from "@/shared/hooks";
import { PointsBadge } from "@/shared/ui";

// Небольшой хелпер для читаемого формата даты
const extractDateFromObjectId = (objectId: string): Date | null => {
  if (!objectId || objectId.length < 8) return null;
  // Берём первые 8 символов (4 байта) и конвертируем в timestamp
  const timestamp = parseInt(objectId.substring(0, 8), 16);
  return new Date(timestamp * 1000);
};

const formatDate = (dateSource?: string | Date): string => {
  if (!dateSource) return "—";
  
  let date: Date | null = null;
  
  if (typeof dateSource === "string" && /^[a-f\d]{24}$/i.test(dateSource)) {
    // Похоже на ObjectId
    date = extractDateFromObjectId(dateSource);
  } else if (typeof dateSource === "string") {
    // Обычная дата-строка
    date = new Date(dateSource);
  } else if (dateSource instanceof Date) {
    date = dateSource;
  }
  
  if (!date || isNaN(date.getTime())) return "—";
  
  return date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const HomePage = () => {
  useDocumentTitle("User Home Page");
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
      {/* Карточка профиля */}
      <div className="home__card home__profile">
        <h1 className="home__title">
          Добро пожаловать, {user.global_name || user.username}!
        </h1>

        {error && <div className="home__error">{error}</div>}

        {currentUserData && (
          <div className="home__info-grid">
            {/* Основная информация */}
            <div className="home__info-section">
              <h3 className="home__section-title">Основное</h3>
              <ul className="home__info-list">
                <li>
                  <span className="home__info-label">Discord:</span>
                  <span className="home__info-value">{currentUserData.userName}</span>
                </li>
                <li>
                  <span className="home__info-label">Активность:</span>
                  <span className="home__info-value">
                    <PointsBadge value={currentUserData.activityPoints} variant="score" />
                  </span>
                </li>
                <li>
                  <span className="home__info-label">DKP Очки:</span>
                  <span className="home__info-value">
                    <PointsBadge value={currentUserData.dkpPoints} />
                  </span>
                </li>
              </ul>
            </div>

            {/* Роли */}
            <div className="home__info-section">
              <h3 className="home__section-title">Роли</h3>
              {currentUserData.serverRoles && currentUserData.serverRoles.length > 0 ? (
                <div className="home__roles">
                  {currentUserData.serverRoles.map((role) => (
                    <span
                      key={role._id}
                      className="home__role-badge"
                      title={`ID: ${role.roleId}`}
                    >
                      {role.roleName}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="home__no-data">Роли не назначены</p>
              )}
            </div>

            {/* Статистика */}
            <div className="home__info-section home__stats">
              <h3 className="home__section-title">Статистика</h3>
              <ul className="home__info-list">
                <li>
                  <span className="home__info-label">Последняя активность:</span>
                  <span className="home__info-value">
                    {formatDate(currentUserData.updatedAt || currentUserData.createdAt)}
                  </span>
                </li>
                <li>
                  <span className="home__info-label">Регистрация:</span>
                  <span className="home__info-value">
                    {formatDate(currentUserData._id)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};