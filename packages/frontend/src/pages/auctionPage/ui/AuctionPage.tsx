import "./auctionPage.scss";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { useUserStore } from "@/store";
import { fetchChannelRoles, fetchServerUserData } from "@/features";
import { DiscordRole, ServerUser } from "@/shared/types";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/shared/hooks";

interface BidHistoryItem {
  amount: number
  userId: string
  userName: string
  createdAt: Date
  _id: string
}

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
    roleName: string;
    roleId: string;
  } | null;
  winner?: {
    userId: string;
    userName: string;
    winningBid: number;
  };
  minBidStep: number;
  bids: BidHistoryItem[],
  serverId: string;
}


const fetchAuctions = async (serverId: string): Promise<AuctionItem[]> => {
  const { data } = await apiClient.post('/auction/list', { serverId });
  return data.data;
};

export const AuctionPage = () => {
  useDocumentTitle("Auction Page");
  const navigate = useNavigate();
  const [serverUserData, setServerUserData] = useState<ServerUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const serverId = useUserStore((state) => state.servers?.selectedServer.serverId);
  const serverName = useUserStore((state) => state.servers?.selectedServer.serverName);

  const [isAdmin, setIsAdmin] = useState(false);

  // Загрузка данных пользователя
  useEffect(() => {
    if (!serverId) return;
    fetchServerUserData({
      serverId,
      navigate,
      setServerUserData,
      setError,
      setIsLoading: () => { },
    });
  }, [serverId, navigate]);

  useEffect(() => {
    setIsAdmin(serverUserData?.serverRole === 'admin');
  }, [serverUserData]);

  // Аукционы через React Query
  const {
    data: auctions = [],
    isLoading,
  } = useQuery({
    queryKey: ['auctions', serverId],
    queryFn: () => fetchAuctions(serverId!),
    enabled: !!serverId,
    refetchInterval: 10000,
    staleTime: 9000,        // 9 сек — данные свежие, не перерендерим
    refetchIntervalInBackground: false,
  });

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
          <CreateAuctionButton serverId={serverId} />
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
const CreateAuctionButton = ({ serverId }: { serverId: string }) => {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  return (
    <>
      <button className="auction-page__create-btn" onClick={() => setShowForm(true)}>
        + Создать лот
      </button>
      {showForm && (
        <CreateAuctionForm
          serverId={serverId}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['auctions', serverId] });
            setShowForm(false);
          }}
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
  onCreated: () => void;
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
    whatRoleCanBid: { roleName: '', roleId: '' },
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await apiClient.post('/auction/create', {
        itemName: form.itemName,
        itemQuality: form.itemQuality,
        startPrice: Number(form.startPrice),
        minBidStep: Number(form.minBidStep),
        buyoutPrice: form.buyoutPrice ? Number(form.buyoutPrice) : null,
        endTime: new Date(form.endTime).toISOString(),
        whatRoleCanBid: form.whatRoleCanBid.roleId ? form.whatRoleCanBid : null,
        description: form.description,
        serverId,
        createdBy: user.id,
        startTime: new Date().toISOString(),
      });

      onCreated(); // инвалидирует кэш
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Ошибка создания');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... handleRoleChange, JSX формы без изменений
  const handleRoleChange = (roleId: string) => {
    if (!roleId) {
      setForm(prev => ({ ...prev, whatRoleCanBid: { roleId: '', roleName: '' } }));
      return;
    }
    const selectedRole = roles.find(role => role.id === roleId);
    if (selectedRole) {
      setForm(prev => ({
        ...prev,
        whatRoleCanBid: { roleId: selectedRole.id, roleName: selectedRole.name }
      }));
    }
  };

  return (
    <div className="auction-form-overlay" onClick={onClose}>
      <div className="auction-form" onClick={(e) => e.stopPropagation()}>
        <h2>Создать аукцион</h2>
        <form onSubmit={handleSubmit}>
          {/* ... форма без изменений ... */}
          <div className="auction-form__group">
            <label>Название предмета *</label>
            <input
              required
              value={form.itemName}
              onChange={(e) => setForm(prev => ({ ...prev, itemName: e.target.value }))}
              placeholder="Например: Меч Испепелителя"
            />
          </div>

          <div className="auction-form__row">
            <div className="auction-form__group">
              <label>Качество</label>
              <select
                value={form.itemQuality}
                onChange={(e) => setForm(prev => ({ ...prev, itemQuality: e.target.value }))}
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
                  value={form.whatRoleCanBid.roleId || ''}
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
                onChange={(e) => setForm(prev => ({ ...prev, startPrice: Number(e.target.value) }))}
              />
            </div>

            <div className="auction-form__group">
              <label>Шаг ставки *</label>
              <input
                type="number"
                required
                min={1}
                value={form.minBidStep}
                onChange={(e) => setForm(prev => ({ ...prev, minBidStep: Number(e.target.value) }))}
              />
            </div>

            <div className="auction-form__group">
              <label>Выкуп (опционально)</label>
              <input
                type="number"
                min={1}
                value={form.buyoutPrice}
                onChange={(e) => setForm(prev => ({ ...prev, buyoutPrice: e.target.value }))}
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
              onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
            />
          </div>

          <div className="auction-form__group">
            <label>Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
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

//Bid History modal
const BidHistoryModal = ({ bids, onClose }: { auctionId: string; bids: BidHistoryItem[]; onClose: () => void }) => {

  const recentBids = [...bids]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="bid-history-overlay" onClick={onClose}>
      <div className="bid-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bid-history-modal__header">
          <h3>История ставок</h3>
          <button className="bid-history-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="bid-history-modal__content">
          {recentBids.length === 0 ? (
            <div className="bid-history-modal__empty">Пока нет ставок</div>
          ) : (
            <div className="bid-history-modal__list">
              {recentBids.map((bid, index) => (
                <div key={index} className="bid-history-modal__item">
                  <span className="bid-history-modal__user">{bid.userName}</span>
                  <span className="bid-history-modal__amount">{bid.amount} DKP</span>
                  <span className="bid-history-modal__time">
                    {new Date(bid.createdAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>)
          }
        </div>
      </div>
    </div>
  );
};

// ─── Карточка лота ───
const AuctionCard = ({ auction, isOwner }: { auction: AuctionItem; isOwner: boolean }) => {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();
  const [showBidHistory, setShowBidHistory] = useState(false);

  const timeLeft = new Date(auction.endTime).getTime() - Date.now();
  const isEnded = timeLeft <= 0 || auction.status !== 'active';
  const isCanceled = auction.status == 'cancelled';

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

  // Мутация ставки
  const bidMutation = useMutation({
    mutationFn: async ({ auctionId, serverId, amount }: { auctionId: string; serverId: string; amount: number }) => {
      const { data } = await apiClient.post(`/auction/${auctionId}/bid`, { serverId, amount });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions', auction.serverId] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Ошибка ставки');
    },
  });

  // Мутация выкупа
  const buyoutMutation = useMutation({
    mutationFn: async ({ auctionId, serverId }: { auctionId: string; serverId: string }) => {
      const { data } = await apiClient.post(`/auction/${auctionId}/buyout`, { serverId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions', auction.serverId] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Ошибка выкупа');
    },
  });

  // Мутация отмены
  const cancelMutation = useMutation({
    mutationFn: async ({ auctionId, serverId }: { auctionId: string; serverId: string }) => {
      await apiClient.post(`/auction/${auctionId}/cancel`, { serverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions', auction.serverId] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Ошибка отмены');
    },
  });

  const handleBid = () => {
    if (!user?.id) return alert("Авторизуйтесь");
    const newBidAmount = auction.currentBid + auction.minBidStep;
    bidMutation.mutate({ auctionId: auction.id, serverId: auction.serverId, amount: newBidAmount });
  };

  const handleBuyout = () => {
    if (!user?.id || !auction.buyoutPrice) return;
    buyoutMutation.mutate({ auctionId: auction.id, serverId: auction.serverId });
  };

  const handleCancel = () => {
    if (!confirm('Отменить аукцион?')) return;
    cancelMutation.mutate({ auctionId: auction.id, serverId: auction.serverId });
  };

  // const isPending = bidMutation.isPending || buyoutMutation.isPending || cancelMutation.isPending;

  return (
    <div
      className={`auction-card ${isEnded ? 'auction-card--ended' : ''}`}
      style={{ borderColor: qualityColors[auction.itemQuality] || '#9e9e9e' }}
    >
      <div className="auction-card__quality-bar" style={{ background: qualityColors[auction.itemQuality] }} />

      <div className="auction-card__header">
        <h3 className="auction-card__name" style={{ color: qualityColors[auction.itemQuality] }}>
          {auction.itemName}
        </h3>
        {auction.whatRoleCanBid?.roleName && (
          <span className="auction-card__role">{auction.whatRoleCanBid.roleName}</span>
        )}
      </div>

      <div className="auction-card__stats">
        <div className="auction-card__stat">
          <span>Текущая ставка</span>
          <strong>{auction.currentBid} DKP</strong>
        </div>
        <div className="auction-card__stat auction-card__stat--clickable" onClick={() => setShowBidHistory(true)}>
          <span>Ставок</span>
          <strong>{auction.bidsCount}</strong>
        </div>
      </div>

      <div className="auction-card__timer" data-ending={timeLeft < 300000}>
        {formatTime(timeLeft)}
      </div>

      {!isEnded ? (
        <div className="auction-card__actions">
          <button
            className="auction-card__bid-btn"
            onClick={handleBid}
            disabled={bidMutation.isPending}
          >
            {bidMutation.isPending ? '...' : 'Ставка +' + auction.minBidStep}
          </button>
          {auction.buyoutPrice && (
            <button
              className="auction-card__buyout-btn"
              onClick={handleBuyout}
              disabled={buyoutMutation.isPending}
            >
              {buyoutMutation.isPending ? '...' : `Выкуп ${auction.buyoutPrice} DKP`}
            </button>
          )}
        </div>
      ) : isCanceled ? (
        <div className="auction-card__cancelled">
          Отменен
        </div>
      ) : (
        <div className="auction-card__ended">
          {auction.winner ? `Победитель: ${auction.winner.userName}` : 'Нет ставок'}
        </div>
      )}

      {showBidHistory && (
        <BidHistoryModal
          auctionId={auction.id}
          bids={auction.bids}
          onClose={() => setShowBidHistory(false)}
        />
      )}

      {isOwner && !isEnded && (
        <button
          className="auction-card__cancel"
          onClick={handleCancel}
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? '...' : '✕ Отменить'}
        </button>
      )}
    </div>
  );
};