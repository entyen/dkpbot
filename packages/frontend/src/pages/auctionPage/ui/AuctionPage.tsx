import "./auctionPage.scss";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export const AuctionPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/auction");
  }, [navigate]);
  return (
    <section className="landing-page">
      Autction Page
    </section>
  );
};
