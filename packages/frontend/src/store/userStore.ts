import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Server, ServerListItem } from "@/shared/types";

interface UserState {
  user: User | null;
  servers: Server | null;
  setUser: (user: User | null) => void;
  setServers: (servers: Server | null) => void;
  setSelectedServer: (selectedServer: ServerListItem) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      servers: null,
      setUser: (user) => set({ user }),
      setServers: (servers) => set({ servers }),
      setSelectedServer: (selectedServer) =>
        set((state) =>
          state.servers ? { servers: { ...state.servers, selectedServer } } : state
        ),
      logout: () => set({ user: null, servers: null }),
    }),
    { name: "dkp-user-storage" }
  )
);
