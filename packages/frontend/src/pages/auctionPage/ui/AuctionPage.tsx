import "./auctionPage.scss";
import { useState, useEffect } from "react";
import { apiClient } from "@/shared/api";
import { useUserStore } from "@/store";
import { fetchChannelRoles, fetchServerUserData } from "@/features";
import { DiscordRole, ServerUser } from "@/shared/types";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/shared/hooks";

interface AuctionItem {
  id: string;
  itemName: string;
  itemIcon: string | null;
  itemQuality: string;
  startPrice: number;
  currentBid: number;
  buyoutPrice: number | null;
  endTime: string;
  status: 'active' | 'ended' | 'cancelled';
  bidsCount: number;
  whatRoleCanBid: {
    roleName: string,
    roleId: string
  } | null;
  winner?: {
    userId: string;
    userName: string;
    winningBid: number;
  };
  serverId: string;
}

export const AuctionPage = () => {
  useDocumentTitle("Auction Page");
  const navigate = useNavigate();
  const [serverUserData, setServerUserData] = useState<ServerUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const serverId = useUserStore((state) => state.servers?.selectedServer.serverId);
  const serverName = useUserStore((state) => state.servers?.selectedServer.serverName);

  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchServerUserData({
      serverId,
      navigate,
      setServerUserData,
      setError,
      setIsLoading,
    });
  }, [serverId]);

  useEffect(() => {
    if (serverUserData?.serverRole === 'admin') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [serverUserData]);

  useEffect(() => {
    if (!serverId) return;

    const fetchAuctions = async () => {
      setIsLoading(true);
      try {
        const { data } = await apiClient.post('/auction/list', {
          serverId: serverId,
        });
        setAuctions(data.data);
      } catch (err) {
        console.error("Ошибка загрузки аукционов:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuctions();
    const interval = setInterval(fetchAuctions, 10000);
    return () => clearInterval(interval);
  }, [serverId]);

  if (!serverId) {
    return (
      <section className="auction-page">
        <div className="auction-page__empty">Выберите сервер для просмотра аукциона</div>
      </section>
    );
  }

  return (
    <section className="auction-page">
      {error && <div className="auction__error">{error}</div>}
      <div className="auction-page__header">
        <h1 className="auction-page__title">Аукцион — {serverName}</h1>
        {isAdmin && (
          <CreateAuctionButton serverId={serverId} onCreated={(a) => setAuctions(prev => [a, ...prev])} />
        )}
      </div>

      {isLoading ? (
        <div className="auction-page__loading">Загрузка...</div>
      ) : auctions.length === 0 ? (
        <div className="auction-page__empty">Нет активных лотов</div>
      ) : (
        <div className="auction-page__grid">
          {auctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} isOwner={isAdmin} />
          ))}
        </div>
      )}
    </section>
  );
};

// ─── Кнопка + форма создания аукциона ───
const CreateAuctionButton = ({ serverId, onCreated }: { serverId: string; onCreated: (a: AuctionItem) => void }) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button className="auction-page__create-btn" onClick={() => setShowForm(true)}>
        + Создать лот
      </button>
      {showForm && (
        <CreateAuctionForm
          serverId={serverId}
          onClose={() => setShowForm(false)}
          onCreated={(a) => { onCreated(a); setShowForm(false); }}
        />
      )}
    </>
  );
};

const CreateAuctionForm = ({
  serverId,
  onClose,
  onCreated,
}: {
  serverId: string;
  onClose: () => void;
  onCreated: (a: AuctionItem) => void;
}) => {
  const user = useUserStore((state) => state.user);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  const [form, setForm] = useState({
    itemName: '',
    itemQuality: 'epic',
    startPrice: 10,
    minBidStep: 5,
    buyoutPrice: '',
    endTime: '',
    whatRoleCanBid: {
      roleName: '',
      roleId: ''
    },
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Загружаем роли сервера
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await fetchChannelRoles(serverId);
        setRoles(data);
      } catch (err) {
        console.error("Ошибка загрузки ролей:", err);
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, [serverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSubmitting(true);

    try {
      const { data } = await apiClient.post('/auction/create', {
        itemName: form.itemName,
        itemQuality: form.itemQuality,
        startPrice: Number(form.startPrice),
        minBidStep: Number(form.minBidStep),
        buyoutPrice: form.buyoutPrice ? Number(form.buyoutPrice) : null,
        endTime: new Date(form.endTime).toISOString(),
        whatRoleCanBid: form.whatRoleCanBid || null,
        description: form.description,
        serverId,
        createdBy: user.id,
        startTime: new Date().toISOString(),
      });

      onCreated(data);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Ошибка создания');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (roleId: string) => {
    if (!roleId) {
      setForm({
        ...form,
        whatRoleCanBid: { roleId: '', roleName: '' }
      });
      return;
    }

    const selectedRole = roles.find(role => role.id === roleId);
    if (selectedRole) {
      setForm({
        ...form,
        whatRoleCanBid: {
          roleId: selectedRole.id,
          roleName: selectedRole.name
        }
      });
    }
  };

  return (
    <div className="auction-form-overlay" onClick={onClose}>
      <div className="auction-form" onClick={(e) => e.stopPropagation()}>
        <h2>Создать аукцион</h2>
        <form onSubmit={handleSubmit}>
          <div className="auction-form__group">
            <label>Название предмета *</label>
            <input
              required
              value={form.itemName}
              onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              placeholder="Например: Меч Испепелителя"
            />
          </div>

          <div className="auction-form__row">
            <div className="auction-form__group">
              <label>Качество</label>
              <select
                value={form.itemQuality}
                onChange={(e) => setForm({ ...form, itemQuality: e.target.value })}
              >
                <option value="common">Обычное</option>
                <option value="uncommon">Необычное</option>
                <option value="rare">Редкое</option>
                <option value="epic">Эпическое</option>
                <option value="legendary">Легендарное</option>
              </select>
            </div>

            <div className="auction-form__group">
              <label>Роль (опционально)</label>
              {rolesLoading ? (
                <div className="auction-form__loading-field">Загрузка ролей...</div>
              ) : (
                <select
                  value={form.whatRoleCanBid?.roleId || ''}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="">Любая</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="auction-form__row">
            <div className="auction-form__group">
              <label>Стартовая цена (DKP) *</label>
              <input
                type="number"
                required
                min={1}
                value={form.startPrice}
                onChange={(e) => setForm({ ...form, startPrice: Number(e.target.value) })}
              />
            </div>

            <div className="auction-form__group">
              <label>Шаг ставки *</label>
              <input
                type="number"
                required
                min={1}
                value={form.minBidStep}
                onChange={(e) => setForm({ ...form, minBidStep: Number(e.target.value) })}
              />
            </div>

            <div className="auction-form__group">
              <label>Выкуп (опционально)</label>
              <input
                type="number"
                min={1}
                value={form.buyoutPrice}
                onChange={(e) => setForm({ ...form, buyoutPrice: e.target.value })}
                placeholder="DKP"
              />
            </div>
          </div>

          <div className="auction-form__group">
            <label>Окончание аукциона *</label>
            <input
              type="datetime-local"
              required
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>

          <div className="auction-form__group">
            <label>Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Описание предмета, условия и т.д."
              rows={3}
            />
          </div>

          <div className="auction-form__actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Создание...' : 'Создать лот'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Карточка лота ───
const AuctionCard = ({ auction, isOwner }: { auction: AuctionItem; isOwner: boolean }) => {
  const user = useUserStore((state) => state.user);
  const [localAuction, setLocalAuction] = useState<AuctionItem>(auction);
  
  // Обновляем localAuction при изменении пропса
  useEffect(() => {
    setLocalAuction(auction);
  }, [auction]);

  const timeLeft = new Date(localAuction.endTime).getTime() - Date.now();
  const isEnded = timeLeft <= 0 || localAuction.status !== 'active';

  const formatTime = (ms: number) => {
    if (ms <= 0) return "Завершено";
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}ч ${mins}м`;
  };

  const qualityColors: Record<string, string> = {
    common: '#9e9e9e',
    uncommon: '#1eff00',
    rare: '#0070dd',
    epic: '#a335ee',
    legendary: '#ff8000',
  };

  const handleBid = async () => {
    if (!user?.id) return alert("Авторизуйтесь");

    // Оптимистичное обновление
    const newBidAmount = localAuction.currentBid + 5;
    setLocalAuction(prev => ({
      ...prev,
      currentBid: newBidAmount,
      bidsCount: prev.bidsCount + 1
    }));

    try {
      const response = await apiClient.post(`/auction/${localAuction.id}/bid`, {
        serverId: localAuction.serverId,
        amount: newBidAmount,
      });

      // Обновляем из ответа сервера
      if (response.data.success) {
        setLocalAuction(prev => ({
          ...prev,
          currentBid: response.data.data.currentPrice,
          bidsCount: prev.bidsCount // возвращаем обратно, т.к. сервер может вернуть актуальное значение
        }));
        
        // Дополнительно: можно обновить данные на уровне родителя
        // если у вас есть функция обновления списка
      }
    } catch (err: any) {
      // Откат при ошибке
      setLocalAuction(prev => ({
        ...prev,
        currentBid: prev.currentBid - 5,
        bidsCount: prev.bidsCount - 1
      }));
      alert(err?.response?.data?.error || 'Ошибка ставки');
    }
  };

  const handleBuyout = async () => {
    if (!user?.id || !localAuction.buyoutPrice) return;

    try {
      const response = await apiClient.post(`/auction/${localAuction.id}/buyout`, { 
        serverId: localAuction.serverId 
      });
      
      if (response.data.success) {
        // Обновляем статус и победителя при выкупе
        setLocalAuction(prev => ({
          ...prev,
          status: 'ended',
          winner: {
            userId: user.id,
            userName: user.username || 'Unknown',
            winningBid: prev.buyoutPrice || prev.currentBid
          }
        }));
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Ошибка выкупа');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Отменить аукцион?')) return;

    try {
      await apiClient.post(`/auction/${localAuction.id}/cancel`, { 
        serverId: localAuction.serverId 
      });
      
      setLocalAuction(prev => ({
        ...prev,
        status: 'cancelled'
      }));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Ошибка отмены');
    }
  };

  return (
    <div
      className={`auction-card ${isEnded ? 'auction-card--ended' : ''}`}
      style={{ borderColor: qualityColors[localAuction.itemQuality] || '#9e9e9e' }}
    >
      <div className="auction-card__quality-bar" style={{ background: qualityColors[localAuction.itemQuality] }} />

      <div className="auction-card__header">
        <h3 className="auction-card__name" style={{ color: qualityColors[localAuction.itemQuality] }}>
          {localAuction.itemName}
        </h3>
        {localAuction.whatRoleCanBid?.roleName && (
          <span className="auction-card__role">{localAuction.whatRoleCanBid.roleName}</span>
        )}
      </div>

      <div className="auction-card__stats">
        <div className="auction-card__stat">
          <span>Текущая ставка</span>
          <strong>{localAuction.currentBid} DKP</strong>
        </div>
        <div className="auction-card__stat">
          <span>Ставок</span>
          <strong>{localAuction.bidsCount}</strong>
        </div>
      </div>

      <div className="auction-card__timer" data-ending={timeLeft < 300000}>
        {formatTime(timeLeft)}
      </div>

      {!isEnded ? (
        <div className="auction-card__actions">
          <button className="auction-card__bid-btn" onClick={handleBid}>
            Ставка +5
          </button>
          {localAuction.buyoutPrice && (
            <button className="auction-card__buyout-btn" onClick={handleBuyout}>
              Выкуп {localAuction.buyoutPrice} DKP
            </button>
          )}
        </div>
      ) : (
        <div className="auction-card__ended">
          {localAuction.winner ? `Победитель: ${localAuction.winner.userName}` : 'Нет ставок'}
        </div>
      )}

      {isOwner && !isEnded && (
        <button className="auction-card__cancel" onClick={handleCancel}>
          ✕ Отменить
        </button>
      )}
    </div>
  );
};