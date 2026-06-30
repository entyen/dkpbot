import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import "./homeLayout.scss";
import { Navbar } from "@/widgets/layout";

export const HomeLayout = () => {
  const [serverKey, setServerKey] = useState(0);

  useEffect(() => {
    const handleServerChange = () => {
      setServerKey((prev) => prev + 1); // Меняем key → Outlet пересоздаётся
    };

    window.addEventListener("server-changed", handleServerChange);
    return () => window.removeEventListener("server-changed", handleServerChange);
  }, []);

  return (
    <div className="home-layout">
      <Navbar />
      <div className="home-layout__wrapper">
        <main className="home-layout__content">
          <Outlet key={serverKey} />
        </main>
      </div>
    </div>
  );
};