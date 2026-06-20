import "./historyPage.scss"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { HistoryItem } from "@/shared/types"
import { fetchUserHistoryData } from "@/features"
import { useDocumentTitle } from "@/shared/hooks"

export const HistoryPage = () => {
  useDocumentTitle("User Points History")
  const navigate = useNavigate()
  const [historyData, setHistoryData] = useState<HistoryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserHistoryData({
      navigate,
      setHistoryData,
      setError,
    })

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "servers") {
        fetchUserHistoryData({
          navigate,
          setHistoryData,
          setError,
        })
      }
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [navigate])

  useEffect(() => {
    navigate("/history")
  }, [navigate])

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <section className="history-page">
      <h1 className="page-title">История начислений</h1>
      <p className="page-subtitle">Последние изменения DKP очков</p>

      {error ? (
        <p className="error-message">{error}</p>
      ) : historyData === null ? (
        <div className="loading">
          <div className="loading-spinner" />
          <p>Загрузка данных...</p>
        </div>
      ) : historyData.length === 0 ? (
        <p className="empty">Нет данных</p>
      ) : (
        <div className="history-list">
          {historyData.map((item, index) => (
            <div
              className="history-card"
              key={item._id}
              style={{ "--card-index": index } as React.CSSProperties}
            >
              <h3 className="history-reason">{item.givingReason}</h3>
              <div className="history-meta">
                <span>
                  <strong>Очки:</strong>{" "}
                  <span
                    className={
                      `history-points ${
                        item.givingPoints > 0
                          ? "positive-points"
                          : "negative-points"
                      }`
                    }
                  >
                    {item.givingPoints > 0
                      ? `+${item.givingPoints}`
                      : item.givingPoints}
                  </span>
                </span>
                <span className="history-date">
                  <strong>Дата действия:</strong> {formatDate(item.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}