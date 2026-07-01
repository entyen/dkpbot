import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { apiClient } from "@/shared/api";
import { useUserStore } from "@/store";

export const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const setServers = useUserStore((state) => state.setServers);

  useEffect(() => {
    const checkAuthentication = async () => {
      if (user) {
        setIsAuthenticated(true); // Пользователь уже аутентифицирован
        return;
      }

      try {
        const userFetch = await apiClient.get("/user");
        const userServerFetch = await apiClient.get("/userServers");

        if (userFetch.status === 401 || userServerFetch.status === 401) {
          setIsAuthenticated(false); // Пользователь не аутентифицирован
          return;
        }

        setUser(userFetch.data);
        setServers({
          selectedServer: { ...userServerFetch.data[0] },
          serverList: [...userServerFetch.data],
        });
        setIsAuthenticated(true); // Пользователь успешно аутентифицирован
      } catch (error) {
        console.error("Ошибка проверки аутентификации:", error);
        setIsAuthenticated(false); // Пользователь не аутентифицирован
      }
    };

    checkAuthentication();
  }, [user, setUser, setServers]);

  if (isAuthenticated === null) {
    // Пока идет проверка аутентификации
    return <div>Загрузка...</div>;
  }

  if (!isAuthenticated) {
    // Если пользователь не аутентифицирован, перенаправляем на /login
    return <Navigate to="/login" replace />;
  }

  // Если аутентифицирован, рендерим вложенные маршруты
  return <Outlet />;
};
