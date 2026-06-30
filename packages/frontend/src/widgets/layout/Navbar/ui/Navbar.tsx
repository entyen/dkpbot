import { useState, useEffect, useRef, useCallback } from "react";
import "./navbar.scss";
import clsx from "clsx";
import { LogoIcon } from "@/shared/assets";

interface Server {
  selectedServer: {
    serverId: string;
    serverName: string;
    ownerId: string;
  };
  serverList: {
    serverId: string;
    serverName: string;
    ownerId: string;
  }[];
}

// Inline SVG иконки
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const GuildIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const useServerChange = () => {
  const [serverVersion, setServerVersion] = useState(0);
  const notifyServerChange = useCallback(() => {
    setServerVersion((v) => v + 1);
    window.dispatchEvent(new CustomEvent("server-changed"));
  }, []);
  return { serverVersion, notifyServerChange };
};

export const Navbar = () => {
  const [serverData, setServerData] = useState<Server>({
    selectedServer: { serverId: "", serverName: "", ownerId: "" },
    serverList: [],
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifyServerChange } = useServerChange();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const storedServerData = localStorage.getItem("servers");
    if (storedServerData) {
      const parsedServerData: Server = JSON.parse(storedServerData);
      if (parsedServerData?.serverList.length > 0) {
        const selectedServer = parsedServerData.selectedServer.serverId
          ? parsedServerData.selectedServer
          : parsedServerData.serverList[0];
        setServerData({
          ...parsedServerData,
          selectedServer,
        });
      }
    }
  }, []);

  const handleServerSelect = (server: Server["serverList"][0]) => {
    const updatedServerData = {
      ...serverData,
      selectedServer: server,
    };
    setServerData(updatedServerData);
    localStorage.setItem("servers", JSON.stringify(updatedServerData));
    setDropdownOpen(false);
    notifyServerChange();
  };

  const NavBarMenu = () => {
    const user = localStorage.getItem("user");
    const isOwner =
      user &&
      serverData.selectedServer.serverId &&
      String(serverData.selectedServer.ownerId) === String(JSON.parse(user).id);

    return (
      <div className="menu">
        <a href="/">Home</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/history">History</a>
        {isOwner && <a href="/auction">Auction</a>}
      </div>
    );
  };

  return (
    <article className="navbar">
      <nav className="navbar_container">
        {/* Левая часть: логотип + селектор */}
        <div className="navbar_left">
          <div className="logo">
            <img src={LogoIcon} alt="Logo" className="logo-image" />
          </div>

          <div className="server-selector-custom" ref={dropdownRef}>
            <button
              className="server-selector-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={serverData.serverList.length === 0}
            >
              <GuildIcon className="server-icon" />
              <span className="server-name">
                {serverData.selectedServer.serverName || "Select Guild"}
              </span>
              <ChevronDownIcon
                className={clsx("chevron", { "chevron-open": dropdownOpen })}
              />
            </button>

            {dropdownOpen && (
              <div className="server-dropdown">
                <div className="server-dropdown-header">
                  <span>Your Guilds</span>
                  <span className="server-count">{serverData.serverList.length}</span>
                </div>
                <div className="server-dropdown-list">
                  {serverData.serverList.map((server) => {
                    const user = localStorage.getItem("user");
                    const isOwner = user && String(server.ownerId) === String(JSON.parse(user).id);

                    return (
                      <button
                        key={server.serverId}
                        className={clsx("server-option", {
                          "server-option-active":
                            server.serverId === serverData.selectedServer.serverId,
                        })}
                        onClick={() => handleServerSelect(server)}
                      >
                        <div className="server-option-info">
                          <span className="server-option-name">{server.serverName}</span>
                          {isOwner && <span className="server-option-badge">Owner</span>}
                        </div>
                        {server.serverId === serverData.selectedServer.serverId && (
                          <CheckIcon className="server-option-check" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Правая часть: меню */}
        <NavBarMenu />
      </nav>
    </article>
  );
};

export const useCurrentServer = () => {
  const [currentServer, setCurrentServer] = useState<Server["selectedServer"] | null>(null);

  useEffect(() => {
    const updateServer = () => {
      const stored = localStorage.getItem("servers");
      if (stored) {
        const parsed: Server = JSON.parse(stored);
        setCurrentServer(parsed.selectedServer);
      }
    };
    updateServer();
    window.addEventListener("server-changed", updateServer);
    return () => window.removeEventListener("server-changed", updateServer);
  }, []);

  return currentServer;
};