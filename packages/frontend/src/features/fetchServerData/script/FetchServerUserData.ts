import axios from "axios";
import { ServerUser } from "@/shared/types";

interface FetchServerUserDataParams {
  navigate: (path: string) => void;
  setServerUserData: (data: ServerUser | null) => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const fetchServerUserData = async ({
  navigate,
  setServerUserData,
  setError,
  setIsLoading,
}: FetchServerUserDataParams): Promise<void> => {
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
};