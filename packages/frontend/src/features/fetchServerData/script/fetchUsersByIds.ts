import { apiClient } from "@/shared/api";
import { ServerUser } from "@/shared/types";

export const fetchUsersByIds = async (
  userIds: string[],
  serverId: string
): Promise<ServerUser[]> => {
  try {
    const response = await apiClient.post("/usersBulkFetch", {
      userIds,
      serverId,
    });

    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error("Ошибка загрузки пользователей:", error);
    return [];
  }
};