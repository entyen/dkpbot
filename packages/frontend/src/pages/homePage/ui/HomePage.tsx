import "./homePage.scss";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);
  return (
    <section className="home-page">
      Home Page
    </section>
  );
};
