import "./historyPage.scss"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import axios from "axios"

interface HistoryItem {
  _id: string
  serverId: string
  giverId: string
  getterId: string
  givingPoints: number
  givingReason: string
  date: string
}

export const HistoryPage = () => {
  const navigate = useNavigate()
  const [historyData, setHistoryData] = useState<HistoryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    try {
      const servers = localStorage.getItem("servers")

      if (servers) {
        const parsedServers = JSON.parse(servers)

        if (parsedServers.selectedServer?.serverId) {
          const response = await axios.post(
            "https://api.grk.pw/dis/userHistoryFetch",
            {
              serverId: parsedServers.selectedServer.serverId,
            },
            {
              withCredentials: true,
              validateStatus: (status) => {
                return (status >= 200 && status < 300) || status === 401
              },
            }
          )

          if (response.status == 401) {
            localStorage.clear()
            navigate("/login")
          } else if (response.data && response.data.length > 0) {
            // Сортируем от нового к старому
            const sortedData = response.data.sort(
              (a: HistoryItem, b: HistoryItem) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            setHistoryData(sortedData)
          } else {
            setHistoryData([])
          }
        } else {
          setError("Некорректные данные пользователя или сервера.")
        }
      } else {
        setError("Данные отсутствуют в localStorage.")
      }
    } catch (error) {
      console.error("Ошибка при получении истории:", error)
      setError("Нет данных.")
    }
  }

  useEffect(() => {
    fetchHistory()

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "servers") {
        fetchHistory()
      }
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

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