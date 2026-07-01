import { apiClient } from "@/shared/api";
import { useUserStore } from "@/store";
import { ServerUser } from "@/shared/types";

interface FetchServerUserDataParams {
  serverId: string | undefined;
  navigate: (path: string) => void;
  setServerUserData: (data: ServerUser | null) => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const fetchServerUserData = async ({
  serverId,
  navigate,
  setServerUserData,
  setError,
  setIsLoading,
}: FetchServerUserDataParams): Promise<void> => {
  try {
    if (!serverId) {
      setError("Некорректные данные пользователя или сервера.");
      return;
    }

    const response = await apiClient.post("/userInfoFetch", { serverId });

    if (response.status === 401) {
      useUserStore.getState().logout();
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
};
