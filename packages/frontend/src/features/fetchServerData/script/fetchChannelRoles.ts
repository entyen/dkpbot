import { apiClient } from "@/shared/api";
import { DiscordRole } from "@/shared/types/roles";

export const fetchChannelRoles = async (
  serverId: string
): Promise<DiscordRole[]> => {
  try {
    const response = await apiClient.post("/channelRoles", null, {
      params: {
        guildId: serverId,
      },
    });

    // Если бэкенд возвращает массив ролей напрямую
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    // Если бэкенд возвращает объект с roles
    if (response.data?.roles && Array.isArray(response.data.roles)) {
      return response.data.roles;
    }

    return [];
  } catch (error) {
    console.error("Ошибка загрузки ролей:", error);
    throw error; // Лучше пробросить ошибку для обработки в компоненте
  }
};