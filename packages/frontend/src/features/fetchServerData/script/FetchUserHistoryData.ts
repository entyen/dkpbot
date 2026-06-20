import axios from "axios";
import { HistoryItem } from "@/shared/types";

interface FetchHistoryDataParams {
  navigate: (path: string) => void;
  setHistoryData: (data: HistoryItem[] | null) => void;
  setError: (error: string | null) => void;
}

export const fetchUserHistoryData = async ({
  navigate,
  setHistoryData,
  setError,
}: FetchHistoryDataParams): Promise<void> => {
  try {
    const servers = localStorage.getItem("servers");

    if (servers) {
      const parsedServers = JSON.parse(servers);

      if (parsedServers.selectedServer?.serverId) {
        const response = await axios.post(
          "https://api.grk.pw/dis/userHistoryFetch",
          {
            serverId: parsedServers.selectedServer.serverId,
          },
          {
            withCredentials: true,
            validateStatus: (status) => {
              return (status >= 200 && status < 300) || status === 401;
            },
          }
        );

        if (response.status === 401) {
          localStorage.clear();
          navigate("/login");
        } else if (response.data && response.data.length > 0) {
          // Сортируем от нового к старому
          const sortedData = response.data.sort(
            (a: HistoryItem, b: HistoryItem) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setHistoryData(sortedData);
        } else {
          setHistoryData([]);
        }
      } else {
        setError("Некорректные данные пользователя или сервера.");
      }
    } else {
      setError("Данные отсутствуют в localStorage.");
    }
  } catch (error) {
    console.error("Ошибка при получении истории:", error);
    setError("Нет данных.");
  }
};