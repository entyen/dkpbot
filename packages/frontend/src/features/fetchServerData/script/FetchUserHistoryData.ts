import { apiClient } from "@/shared/api";
import { useUserStore } from "@/store";
import { HistoryItem } from "@/shared/types";

interface FetchHistoryDataParams {
  serverId: string | undefined;
  navigate: (path: string) => void;
  setHistoryData: (data: HistoryItem[] | null) => void;
  setError: (error: string | null) => void;
}

export const fetchUserHistoryData = async ({
  serverId,
  navigate,
  setHistoryData,
  setError,
}: FetchHistoryDataParams): Promise<void> => {
  try {
    if (!serverId) {
      setError("Некорректные данные пользователя или сервера.");
      return;
    }

    const response = await apiClient.post("/userHistoryFetch", { serverId });

    if (response.status === 401) {
      useUserStore.getState().logout();
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
  } catch (error) {
    console.error("Ошибка при получении истории:", error);
    setError("Нет данных.");
  }
};
