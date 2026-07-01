import { DiscordLoginButton } from "@/features";
import "./loginPage.scss";
import { useDocumentTitle } from "@/shared/hooks";

export const LoginPage = () => {
  useDocumentTitle("Login Page")

  return (
    <div className="LoginPage">
      <div className="LoginPage__card">
        <h1 className="LoginPage__title">DKP Dashboard</h1>
        <p className="LoginPage__subtitle">
          Авторизуйтесь через Discord, чтобы управлять DKP очками вашей гильдии
        </p>
        <DiscordLoginButton />
      </div>
    </div>
  );
};