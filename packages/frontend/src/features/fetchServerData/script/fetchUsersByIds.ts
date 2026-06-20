import axios from "axios";
import { ServerUser } from "@/shared/types";

export const fetchUsersByIds = async (
  userIds: string[],
  serverId: string
): Promise<ServerUser[]> => {
  try {
    const response = await axios.post(
      "https://api.grk.pw/dis/usersBulkFetch",
      {
        userIds,
        serverId,
      },
      { withCredentials: true }
    );

    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error("Ошибка загрузки пользователей:", error);
    return [];
  }
};