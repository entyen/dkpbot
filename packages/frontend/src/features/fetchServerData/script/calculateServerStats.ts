import { HistoryItem, ServerUser } from "@/shared/types";
import { fetchUsersByIds } from './fetchUsersByIds'

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

export const calculateServerStats = async (
  historyData: HistoryItem[],
  serverId: string
): Promise<SimpleStats> => {
  // ===== РЕЙТИНГ НА ОСНОВЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ СЕРВЕРА =====
  
  // Получаем ВСЕХ пользователей сервера
  let allUsers: ServerUser[] = [];
  try {
    allUsers = await fetchUsersByIds([], serverId); // null или [] чтобы получить всех
  } catch (error) {
    console.error("Ошибка загрузки пользователей:", error);
    allUsers = [];
  }

  // Формируем топ-10 на основе dkpPoints пользователей
  const top10 = allUsers
    .filter(user => user.dkpPoints && user.dkpPoints > 0) // Только с положительным балансом
    .sort((a, b) => (b.dkpPoints || 0) - (a.dkpPoints || 0))
    .slice(0, 10)
    .map(user => ({
      userId: user.userId,
      userName: user.userName || user.userId,
      points: user.dkpPoints || 0,
    }));

  // Общая статистика по всем пользователям
  const totalPoints = allUsers.reduce((sum, user) => sum + (user.dkpPoints || 0), 0);
  const totalUsers = allUsers.length;
  
  // ===== СТАТИСТИКА ИЗ ИСТОРИИ ДЛЯ ГРАФИКОВ =====
  
  let totalPositive = 0;
  let totalNegative = 0;
  
  // Группировка по дням для графика
  const dailyMap = new Map<string, { positive: number; negative: number }>();
  
  historyData.forEach(item => {
    // Суммы для общей статистики
    if (item.givingPoints > 0) {
      totalPositive += item.givingPoints;
    } else {
      totalNegative += Math.abs(item.givingPoints);
    }
    
    // Группировка по дням
    const date = new Date(item.date).toISOString().split('T')[0];
    const existing = dailyMap.get(date) || { positive: 0, negative: 0 };
    
    if (item.givingPoints > 0) {
      existing.positive += item.givingPoints;
    } else {
      existing.negative += Math.abs(item.givingPoints);
    }
    
    dailyMap.set(date, existing);
  });
  
  // Формируем массив для графика
  const dailyDKP = Array.from(dailyMap.entries())
    .map(([date, values]) => ({
      date,
      positive: values.positive,
      negative: values.negative,
      net: values.positive - values.negative,
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // Сортируем по дате

  const totalEntries = historyData.length;
  const averagePerEntry = totalEntries > 0 
    ? (totalPositive - totalNegative) / totalEntries 
    : 0;

  return {
    // Рейтинг на основе данных пользователей
    totalPoints,
    totalPositive,
    totalNegative,
    totalUsers,
    top10,
    
    // Статистика из истории для графиков
    historyStats: {
      dailyDKP,
      totalEntries,
      averagePerEntry,
    },
  };
};