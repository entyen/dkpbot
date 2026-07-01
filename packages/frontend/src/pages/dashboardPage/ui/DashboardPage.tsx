import "./dashboardPage.scss"
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { HistoryItem } from "@/shared/types";
import { calculateServerStats, fetchServerHistoryData } from "@/features"
import { useDocumentTitle } from "@/shared/hooks";
import { useUserStore } from "@/store";
import { PointsBadge } from "@/shared/ui";

interface SimpleStats {
  totalPoints: number;
  totalPositive: number;
  totalNegative: number;
  totalUsers: number; // Добавим общее количество пользователей
  top10: {
    userId: string;
    userName: string;
    points: number;
  }[];
  // Статистика из истории для графиков
  historyStats: {
    dailyDKP: {
      date: string;
      positive: number;
      negative: number;
      net: number;
    }[];
    totalEntries: number;
    averagePerEntry: number;
  };
}

export const DashboardPage = () => {
  useDocumentTitle("Server Dashboard")
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const server = useUserStore((state) => state.servers);
  const serverId = server?.selectedServer.serverId;
  const [serverHistoryData, setServerHistoryData] = useState<HistoryItem[] | null>(null);
  const [stats, setStats] = useState<SimpleStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    if (!serverHistoryData || serverHistoryData.length === 0) return;
    if (!serverId) return;

    try {
      const calculatedStats = await calculateServerStats(serverHistoryData, serverId);
      setStats(calculatedStats);
    } catch (error) {
      console.error("Ошибка загрузки статистики:", error);
    }
  };

  useEffect(() => {
    if (serverHistoryData) {
      loadStats();
    }
  }, [serverHistoryData]);

  useEffect(() => {
    setIsLoading(true);
    fetchServerHistoryData({
      serverId,
      navigate,
      setServerHistoryData,
      setError,
      setIsLoading,
    });
  }, [serverId, navigate]);

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
            </>
          )}
        </p>

        {stats && (
          <div className="dashboard__stats">
            {/* Общая информация */}
            <div className="stats-overview">
              <div className="stat-card">
                <span className="stat-label">Активных DKP</span>
                <span className="stat-value">{stats.totalPoints}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Пользователей</span>
                <span className="stat-value">{stats.totalUsers}</span>
              </div>
              <div className="stat-card positive">
                <span className="stat-label">Выдано</span>
                <span className="stat-value">+{stats.totalPositive}</span>
              </div>
              <div className="stat-card negative">
                <span className="stat-label">Списано</span>
                <span className="stat-value">-{stats.totalNegative}</span>
              </div>
            </div>

            {/* Топ-10 на основе данных пользователей */}
            <div className="stat-top10">
              <h2>Топ-10 игроков</h2>
              <ol className="top-list">
                {stats.top10.map((player, index) => (
                  <li key={player.userId} className="top-item">
                    <span className="top-position">#{index + 1}</span>
                    <span className="top-user-name">{player.userName}</span>
                    <PointsBadge value={player.points} variant="dkp" />
                  </li>
                ))}
              </ol>
            </div>

            {/* Статистика из истории */}
            <div className="stats-history">
              <h2>Статистика операций</h2>
              <p>Всего операций: {stats.historyStats.totalEntries}</p>
              <p>Среднее за операцию: {stats.historyStats.averagePerEntry.toFixed(1)} DKP</p>
              
              {/* Здесь можно добавить график на основе stats.historyStats.dailyDKP */}
            </div>
          </div>
        )}

        {error && <div className="dashboard__error">{error}</div>}
      </div>
    </div>
  );
};