'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

type Product = {
  id: string; name: string; description: string | null; price: string; categoryId: string | null;
  productType: string; availabilityPeriods: string[]; isAvailable: boolean; isActive: boolean; isFeatured: boolean;
};
type Category = { id: string; name: string; slug: string; sortOrder: number };
type OrderItem = { id: string; nameSnapshot: string; quantity: number; unitPrice: string; lineTotal: string };
type Order = {
  id: string; orderNumber: string; customerId: string | null; customerName: string; customerPhone: string | null;
  channel: string; fulfillmentType: string; status: string; paymentStatus: string; total: string; subtotal: string;
  createdAt: string; items: OrderItem[];
};
type Customer = { id: string; name: string; phone: string; email: string | null; loyaltyPoints: number; tier: string; lifetimeSpend: string; lastOrderAt: string | null };
type CustomOrder = {
  id: string; customerName: string; phone: string; orderType: string; flavor: string | null; quantity: number;
  eventDate: string; fulfillmentType: string; totalAmount: string; depositAmount: string; depositPaid: boolean;
  status: string; message: string | null; notes: string | null;
};
type Batch = { id: string; label: string; productName: string; expectedAt: string; capacity: number; reservedCount: number; status: string; notes: string | null };
type Reservation = { id: string; customerName: string; phone: string; quantity: number; reservationCode: string; status: string; pickupAt: string; batchId: string };
type Coupon = { id: string; code: string; title: string; discountType: string; discountValue: string; redemptionCount: number; maxRedemptions: number | null; isActive: boolean; expiresAt: string | null };
type Subscription = { id: string; planName: string; amount: string; status: string; customerName: string; customerPhone: string | null; billingInterval: string };
type CorporateAccount = { id: string; companyName: string; contactName: string; phone: string; creditLimit: string; status: string; billingCycle: string };
type WorkspaceData = {
  tenant: { name: string; phone: string; email: string; address: string; city: string; state: string; settings: Record<string, unknown> };
  products: Product[]; categories: Category[]; customers: Customer[]; orders: Order[]; customOrders: CustomOrder[];
  batches: Batch[]; reservations: Reservation[]; coupons: Coupon[]; subscriptions: Subscription[]; corporateAccounts: CorporateAccount[];
};
type View = "overview" | "orders" | "custom" | "batches" | "menu" | "customers" | "loyalty" | "marketing" | "strategy";
type Dialog = "order" | "custom" | "reservation" | "coupon" | null;

const viewMeta: Record<View, { title: string; description: string; icon: IconName }> = {
  overview: { title: "Visão geral", description: "O pulso da sua padaria, em um só lugar.", icon: "grid" },
  orders: { title: "Pedidos", description: "Acompanhe cada pedido do balcão ao cliente.", icon: "receipt" },
  custom: { title: "Encomendas", description: "Produção organizada, sinal recebido e cliente tranquilo.", icon: "cake" },
  batches: { title: "Fornadas", description: "Pão quentinho reservado antes mesmo de sair do forno.", icon: "oven" },
  menu: { title: "Cardápio", description: "Seu catálogo por período, com disponibilidade em tempo real.", icon: "book" },
  customers: { title: "Clientes", description: "Conheça quem volta — e quem está na hora de chamar.", icon: "users" },
  loyalty: { title: "Clube do Pão Quente", description: "Transforme o hábito diário em recorrência previsível.", icon: "star" },
  marketing: { title: "Marketing", description: "Promoções com limite, rastreio e resultado mensurável.", icon: "megaphone" },
  strategy: { title: "Produto & expansão", description: "Um só core de bairro. Duas verticais. Crescimento replicável.", icon: "layers" },
};

const currency = (amount: string | number | null | undefined) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(amount ?? 0));
const clock = (date: string | Date | null | undefined) => date ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(date)) : "—";
const dayMonth = (date: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`)).replace(" de ", " ");
const fullDate = () => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};
const orderStatusLabel: Record<string, string> = { received: "Recebido", preparing: "Em preparo", ready: "Pronto", delivered: "Concluído", cancelled: "Cancelado" };
const customStatusLabel: Record<string, string> = { requested: "Novo pedido", confirmed: "Sinal confirmado", production: "Em produção", ready: "Pronto para retirar", delivered: "Entregue", cancelled: "Cancelado" };
const orderTypeLabel: Record<string, string> = { cake: "Bolo confeitado", "party-kit": "Kit festa", savories: "Mini salgados", "filled-bread": "Pão recheado" };

function StatusBadge({ status, custom = false }: { status: string; custom?: boolean }) {
  const label = (custom ? customStatusLabel : orderStatusLabel)[status] ?? status;
  return <span className={`status-badge status-${status}`}><span />{label}</span>;
}

function Button({ children, variant = "secondary", icon, onClick, className = "", type = "button", disabled = false }: {
  children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "dark"; icon?: IconName;
  onClick?: () => void; className?: string; type?: "button" | "submit"; disabled?: boolean;
}) {
  return <button className={`button button-${variant} ${className}`} onClick={onClick} type={type} disabled={disabled}>{icon && <Icon name={icon} size={16} />}{children}</button>;
}

function Modal({ title, eyebrow, children, onClose, wide = false }: { title: string; eyebrow?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`modal-card ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><button className="icon-button quiet" onClick={onClose} aria-label="Fechar"><Icon name="close" /></button></div>
      {children}
    </section>
  </div>;
}

function Chart() {
  return <div className="chart-wrap">
    <div className="chart-y-labels"><span>R$ 400</span><span>R$ 300</span><span>R$ 200</span><span>R$ 100</span></div>
    <svg className="sales-chart" viewBox="0 0 620 190" role="img" aria-label="Vendas ilustrativas ao longo do dia">
      <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#e9835e" stopOpacity=".2"/><stop offset="100%" stopColor="#e9835e" stopOpacity="0"/></linearGradient></defs>
      <path className="chart-grid-line" d="M0 20H620M0 67H620M0 114H620M0 161H620" />
      <path d="M0 153 C22 147 25 139 46 141 S75 112 98 122 S125 128 148 103 S177 117 199 94 S224 102 248 82 S275 93 299 84 S322 52 347 66 S371 73 394 56 S423 75 446 46 S473 55 497 38 S525 46 548 27 S579 40 602 18 L620 22 V190 H0Z" fill="url(#chartFill)" />
      <path className="chart-line" d="M0 153 C22 147 25 139 46 141 S75 112 98 122 S125 128 148 103 S177 117 199 94 S224 102 248 82 S275 93 299 84 S322 52 347 66 S371 73 394 56 S423 75 446 46 S473 55 497 38 S525 46 548 27 S579 40 602 18" />
      <circle cx="497" cy="38" r="5" className="chart-dot" /><circle cx="497" cy="38" r="10" className="chart-dot-halo" />
    </svg>
    <div className="chart-x-labels"><span>05h</span><span>08h</span><span>11h</span><span>14h</span><span>17h</span><span>19h</span></div>
  </div>;
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

export default function BakeryDashboard() {
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [strategyTab, setStrategyTab] = useState<"prd" | "pitch">("prd");
  const [searchOpen, setSearchOpen] = useState(false);

  async function refresh() {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar os dados.");
    const workspace = await response.json() as WorkspaceData;
    setData(workspace);
  }

  useEffect(() => {
    refresh().catch(() => setToast("Não foi possível conectar ao painel. Tente atualizar a página."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function requestApi(url: string, body: unknown, method = "POST") {
    setBusy(true);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Algo deu errado.");
      setToast("Tudo certo — os dados foram atualizados.");
      await refresh();
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function navigate(next: View) {
    setView(next);
    setDrawerOpen(false);
  }

  const orders = data?.orders ?? [];
  const products = data?.products ?? [];
  const customers = data?.customers ?? [];
  const customOrders = data?.customOrders ?? [];
  const batches = data?.batches ?? [];
  const reservations = data?.reservations ?? [];
  const coupons = data?.coupons ?? [];
  const subscriptions = data?.subscriptions ?? [];
  const activeCustomOrders = customOrders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const todayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === new Date().toDateString());
  const salesToday = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const recurringCustomers = customers.filter((customer) => Number(customer.loyaltyPoints) > 0).length;
  const mainTabs: { heading: string; items: { id: View; label: string; icon: IconName; badge?: string }[] }[] = [
    { heading: "Início", items: [{ id: "overview", label: "Visão geral", icon: "grid" }] },
    { heading: "Operação", items: [
      { id: "orders", label: "Pedidos", icon: "receipt", badge: String(orders.filter((order) => ["received", "preparing"].includes(order.status)).length || "") },
      { id: "custom", label: "Encomendas", icon: "cake", badge: String(activeCustomOrders.length || "") },
      { id: "batches", label: "Fornadas", icon: "oven" },
      { id: "menu", label: "Cardápio", icon: "book" },
    ] },
    { heading: "Relacionamento", items: [
      { id: "customers", label: "Clientes", icon: "users" },
      { id: "loyalty", label: "Clube do Pão Quente", icon: "star" },
      { id: "marketing", label: "Marketing", icon: "megaphone" },
    ] },
    { heading: "Plataforma", items: [{ id: "strategy", label: "Produto & expansão", icon: "layers" }] },
  ];

  const selectedAction = () => {
    if (view === "orders") setDialog("order");
    else if (view === "custom") setDialog("custom");
    else if (view === "batches") setDialog("reservation");
    else if (view === "marketing") setDialog("coupon");
    else if (view === "strategy") window.print();
    else if (view === "customers") {
      const header = "Nome,WhatsApp,Email,Pontos,Tier,Total gasto";
      const rows = customers.map((customer) => [customer.name, customer.phone, customer.email ?? "", customer.loyaltyPoints, customer.tier, customer.lifetimeSpend].join(","));
      const url = URL.createObjectURL(new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = "clientes-pao-na-chapa.csv"; link.click(); URL.revokeObjectURL(url);
      setToast("Lista de clientes exportada em CSV.");
    } else setToast("Seu catálogo está atualizado.");
  };

  const actionLabel = view === "orders" ? "Pedido manual" : view === "custom" ? "Nova encomenda" : view === "batches" ? "Nova reserva" : view === "marketing" ? "Criar promoção" : view === "customers" ? "Exportar clientes" : view === "strategy" ? "Imprimir material" : view === "menu" ? "Atualizar cardápio" : "Nova ação";
  const actionIcon: IconName = view === "customers" ? "arrow-down" : view === "strategy" ? "book" : "plus";

  const filteredOrders = useMemo(() => orderFilter === "all" ? orders : orders.filter((order) => order.status === orderFilter), [orders, orderFilter]);
  const filteredCustomers = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(customerSearch.toLowerCase())), [customers, customerSearch]);
  const categoryById = useMemo(() => new Map((data?.categories ?? []).map((category) => [category.id, category.name])), [data?.categories]);

  return <div className="app-shell">
    {drawerOpen && <button className="mobile-scrim" aria-label="Fechar navegação" onClick={() => setDrawerOpen(false)} />}
    <aside className={`sidebar ${drawerOpen ? "sidebar-open" : ""}`}>
      <div className="brand-lockup"><div className="brand-icon"><Icon name="bread" size={21} strokeWidth={1.7} /></div><div className="brand-copy"><strong>pão na chapa</strong><span>PAINEL DA PADARIA</span></div></div>
      <button className="tenant-switcher" onClick={() => setToast("Você está no workspace Pão na Chapa · Junqueirópolis")}>
        <span className="tenant-avatar">PN</span><span className="tenant-identity"><strong>Pão na Chapa</strong><small>Junqueirópolis · SP</small></span><Icon name="chevron" size={15} />
      </button>
      <nav className="side-navigation" aria-label="Navegação principal">
        {mainTabs.map((group) => <div className="nav-group" key={group.heading}>
          <p className="nav-heading">{group.heading}</p>
          {group.items.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? "nav-item-active" : ""}`} onClick={() => navigate(item.id)}>
            <Icon name={item.icon} size={18} /><span>{item.label}</span>{item.badge && <small className="nav-count">{item.badge}</small>}
          </button>)}
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="side-status"><span className="online-dot" /><div><strong>Loja conectada</strong><small>Pedidos próprios ativos</small></div><Icon name="dots" size={17} /></div>
        <div className="profile-row"><div className="profile-avatar">AM</div><div><strong>Ana Martins</strong><small>Administradora</small></div><button className="profile-more" aria-label="Mais opções"><Icon name="dots" size={18} /></button></div>
      </div>
    </aside>

    <main className="workspace-main">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setDrawerOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button><div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={13} /><strong>{viewMeta[view].title}</strong></div></div>
        <div className="topbar-right">
          <span className="demo-label"><span />AMBIENTE DEMO</span>
          {searchOpen ? <div className="quick-search"><Icon name="search" size={17} /><input autoFocus placeholder="Buscar pedidos ou clientes" onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} /><button onClick={() => setSearchOpen(false)} aria-label="Fechar busca"><Icon name="close" size={15} /></button></div> : <button className="icon-button top-icon" onClick={() => setSearchOpen(true)} aria-label="Buscar"><Icon name="search" /></button>}
          <button className="icon-button top-icon notification-button" onClick={() => setToast("Tudo em dia: não há alertas urgentes.")} aria-label="Notificações"><Icon name="bell" /><i /></button>
          <Link href="/loja" className="button button-store"><Icon name="external" size={16} /><span>Ver minha loja</span></Link>
        </div>
      </header>

      <div className="page-content">
        <div className="content-heading"><div><div className="eyebrow-row"><span className="eyebrow">{fullDate()}</span><span className="live-label"><i /> AO VIVO</span></div><h1>{viewMeta[view].title}</h1><p>{viewMeta[view].description}</p></div><Button variant={view === "strategy" ? "dark" : "primary"} icon={actionIcon} onClick={selectedAction}>{actionLabel}</Button></div>
        {loading && <div className="loading-strip"><span className="spinner" /> Sincronizando com a sua padaria…</div>}

        {view === "overview" && <>
          <section className="welcome-banner">
            <div className="welcome-text"><span className="welcome-pill"><Icon name="sun" size={14} /> UM NOVO DIA, UMA NOVA FORNADA</span><h2>{greeting()}, Ana <span>☀</span></h2><p>Seu balcão digital já está aberto. Veja o que está acontecendo na Pão na Chapa hoje.</p><div className="welcome-links"><button onClick={() => navigate("orders")} className="welcome-link">Acompanhar pedidos <Icon name="arrow" size={15} /></button><span className="welcome-separator" /><span className="welcome-address"><Icon name="pin" size={14} /> Junqueirópolis, SP</span></div></div>
            <div className="welcome-illustration"><div className="warm-orb" /><div className="steam steam-one" /><div className="steam steam-two" /><div className="cup"><span /></div><div className="cup-saucer" /><div className="bread-shape"><i /><i /><i /></div><span className="illustration-sun"><Icon name="sun" size={18} /></span><span className="illustration-caption">feito hoje, com carinho</span></div>
          </section>

          <section className="stats-grid">
            <article className="stat-card"><div className="stat-card-top"><span className="stat-icon stat-icon-orange"><Icon name="wallet" /></span><span className="stat-trend positive"><Icon name="arrow-up" size={13} />12,8%</span></div><p>Vendas hoje</p><strong>{data ? currency(salesToday) : "—"}</strong><small>no canal próprio</small><span className="stat-sparkline spark-one" /></article>
            <article className="stat-card"><div className="stat-card-top"><span className="stat-icon stat-icon-blue"><Icon name="receipt" /></span><span className="stat-trend positive"><Icon name="arrow-up" size={13} />8,2%</span></div><p>Pedidos recebidos</p><strong>{data ? todayOrders.length : "—"}</strong><small>hoje até agora</small><span className="stat-sparkline spark-two" /></article>
            <article className="stat-card"><div className="stat-card-top"><span className="stat-icon stat-icon-lilac"><Icon name="cake" /></span><span className="stat-chip">AGENDA</span></div><p>Encomendas ativas</p><strong>{activeCustomOrders.length}</strong><small>{customOrders.filter((order) => !order.depositPaid && order.status === "requested").length} aguardando sinal</small><span className="stat-sparkline spark-three" /></article>
            <article className="stat-card"><div className="stat-card-top"><span className="stat-icon stat-icon-green"><Icon name="rotate" /></span><span className="stat-trend positive"><Icon name="arrow-up" size={13} />4,6%</span></div><p>Clientes recorrentes</p><strong>{customers.length ? `${Math.round(recurringCustomers / customers.length * 100)}%` : "—"}</strong><small>com pontos no Clube</small><span className="stat-sparkline spark-four" /></article>
          </section>

          <section className="overview-grid">
            <article className="panel sales-panel"><div className="panel-heading"><div><div className="panel-kicker"><span className="tiny-dot" /> DESEMPENHO</div><h2>Ritmo da padaria</h2><p>Horários de maior movimento · hoje</p></div><button className="select-pill" onClick={() => setToast("Exibindo dados do dia de hoje.")}>Hoje <Icon name="chevron" size={14} /></button></div><Chart /><div className="chart-foot"><div><span className="legend-dot" />Movimento estimado</div><span className="chart-note">Acompanhe os horários de pico em tempo real</span></div></article>
            <article className="panel bake-panel"><div className="panel-heading"><div><div className="panel-kicker"><span className="tiny-dot orange-dot" /> DO FORNO</div><h2>Próximas fornadas</h2><p>Reservas que estão chegando</p></div><button className="small-arrow" onClick={() => navigate("batches")} aria-label="Ver fornadas"><Icon name="arrow" size={17} /></button></div>
              <div className="bake-list">{batches.slice(0, 3).map((batch, index) => <div className="bake-row" key={batch.id}><div className={`bake-time-dot bake-dot-${index}`}><Icon name={index === 0 ? "bread" : index === 1 ? "coffee" : "oven"} size={15} /></div><div className="bake-info"><div><strong>{batch.productName}</strong><time>{clock(batch.expectedAt)}</time></div><div className="capacity-track"><span style={{ width: `${Math.min(100, batch.capacity ? batch.reservedCount / batch.capacity * 100 : 0)}%` }} /></div><small>{batch.reservedCount} de {batch.capacity} unidades reservadas</small></div></div>)}</div>
              <button className="text-action" onClick={() => navigate("batches")}>Abrir agenda de fornadas <Icon name="arrow" size={14} /></button>
            </article>
          </section>

          <section className="overview-grid bottom-overview">
            <article className="panel table-panel"><SectionTitle title="Pedidos recentes" subtitle="O que está acontecendo agora" action={<button className="text-action" onClick={() => navigate("orders")}>Ver todos <Icon name="arrow" size={14} /></button>} />
              <OrdersTable orders={orders.slice(0, 5)} onAdvance={(order) => requestApi(`/api/orders/${order.id}`, { status: nextOrderStatus(order.status) }, "PATCH")} compact />
            </article>
            <article className="panel best-panel"><SectionTitle title="Mais pedidos" subtitle="Favoritos do balcão digital" />
              <TopProducts products={products} orders={orders} />
            </article>
          </section>
          <section className="insight-banner"><div className="insight-icon"><Icon name="sparkle" size={20} /></div><div><strong>Uma fornada anunciada vende antes de sair do forno.</strong><p>Ative avisos de “saiu quentinho” para trazer clientes de volta no meio da tarde.</p></div><button onClick={() => navigate("marketing")}>Criar aviso <Icon name="arrow" size={15} /></button></section>
        </>}

        {view === "orders" && <OrdersView orders={filteredOrders} selected={orderFilter} onSelect={setOrderFilter} onAdvance={(order) => requestApi(`/api/orders/${order.id}`, { status: nextOrderStatus(order.status) }, "PATCH")} />}
        {view === "custom" && <CustomOrdersView orders={customOrders} onUpdate={(order, changes) => requestApi(`/api/custom-orders/${order.id}`, changes, "PATCH")} />}
        {view === "batches" && <BatchesView batches={batches} reservations={reservations} onReserve={() => setDialog("reservation")} />}
        {view === "menu" && <MenuView products={products} categoryById={categoryById} onToggle={(product) => requestApi(`/api/products/${product.id}`, { isAvailable: !product.isAvailable }, "PATCH")} />}
        {view === "customers" && <CustomersView customers={filteredCustomers} search={customerSearch} onSearch={setCustomerSearch} subscriptions={subscriptions} accounts={data?.corporateAccounts ?? []} />}
        {view === "loyalty" && <LoyaltyView customers={customers} subscriptions={subscriptions} />}
        {view === "marketing" && <MarketingView coupons={coupons} onCreate={() => setDialog("coupon")} />}
        {view === "strategy" && <StrategyView tab={strategyTab} onTab={setStrategyTab} />}
      </div>
    </main>

    {dialog === "order" && <Modal title="Novo pedido manual" eyebrow="BALCÃO DIGITAL" onClose={() => setDialog(null)}><form className="form-stack" onSubmit={async (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const productId = String(form.get("productId"));
      const ok = await requestApi("/api/orders", { name: form.get("name"), phone: form.get("phone"), fulfillmentType: form.get("fulfillmentType"), notes: form.get("notes"), items: [{ productId, quantity: Number(form.get("quantity")) }] });
      if (ok) setDialog(null);
    }}><div className="form-grid"><label>Nome do cliente<input required name="name" placeholder="Ex.: Marina Souza" /></label><label>WhatsApp<input required name="phone" inputMode="tel" placeholder="(18) 99999-9999" /></label></div><label>Produto<select name="productId" required>{products.filter((product) => product.isAvailable).map((product) => <option key={product.id} value={product.id}>{product.name} · {currency(product.price)}</option>)}</select></label><div className="form-grid"><label>Quantidade<input name="quantity" type="number" min="1" defaultValue="1" /></label><label>Entrega<select name="fulfillmentType"><option value="pickup">Retirada no balcão</option><option value="delivery">Entrega · + R$ 4,90</option></select></label></div><label>Observação<input name="notes" placeholder="Alguma instrução especial?" /></label><div className="modal-footer"><span className="form-note"><Icon name="star" size={14} /> Gera pontos automaticamente</span><Button variant="primary" type="submit" disabled={busy}>{busy ? "Salvando…" : "Registrar pedido"}</Button></div></form></Modal>}

    {dialog === "custom" && <Modal title="Nova encomenda" eyebrow="AGENDA DE PRODUÇÃO" onClose={() => setDialog(null)}><form className="form-stack" onSubmit={async (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const ok = await requestApi("/api/custom-orders", { name: form.get("name"), phone: form.get("phone"), type: form.get("type"), flavor: form.get("flavor"), quantity: Number(form.get("quantity")), eventDate: form.get("eventDate"), fulfillmentType: form.get("fulfillmentType"), totalAmount: Number(form.get("totalAmount")), message: form.get("message"), depositPercent: 40 });
      if (ok) setDialog(null);
    }}><div className="form-grid"><label>Nome do cliente<input required name="name" placeholder="Ex.: Isabela Nunes" /></label><label>WhatsApp<input required name="phone" inputMode="tel" placeholder="(18) 99999-9999" /></label></div><div className="form-grid"><label>Tipo de encomenda<select name="type"><option value="cake">Bolo confeitado</option><option value="party-kit">Kit festa</option><option value="savories">Mini salgados</option><option value="filled-bread">Pão recheado</option></select></label><label>Data do evento<input required name="eventDate" type="date" min={new Date().toISOString().slice(0, 10)} /></label></div><div className="form-grid"><label>Sabor / detalhes<input name="flavor" placeholder="Ex.: Ninho com morango" /></label><label>Quantidade<input name="quantity" type="number" min="1" defaultValue="1" /></label></div><div className="form-grid"><label>Valor combinado (R$)<input required name="totalAmount" type="number" min="1" step="0.01" placeholder="250,00" /></label><label>Entrega<select name="fulfillmentType"><option value="pickup">Retirada</option><option value="delivery">Entrega</option></select></label></div><label>Mensagem do bolo / observações<input name="message" placeholder="Texto para escrever, restrições, etc." /></label><div className="deposit-callout"><Icon name="wallet" size={17} /><span><strong>Sinal calculado automaticamente</strong><small>40% do total · pagamento Pix será conciliado na próxima etapa</small></span></div><div className="modal-footer"><span className="form-note"><Icon name="calendar" size={14} /> A data é verificada na agenda</span><Button variant="primary" type="submit" disabled={busy}>{busy ? "Salvando…" : "Criar encomenda"}</Button></div></form></Modal>}

    {dialog === "reservation" && <Modal title="Reservar uma fornada" eyebrow="RETIRADA EXPRESSA" onClose={() => setDialog(null)}><form className="form-stack" onSubmit={async (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const ok = await requestApi("/api/reservations", { batchId: form.get("batchId"), name: form.get("name"), phone: form.get("phone"), quantity: Number(form.get("quantity")) });
      if (ok) setDialog(null);
    }}><div className="reservation-hint"><span className="hint-icon"><Icon name="flame" /></span><div><strong>O cheirinho chega antes da fila.</strong><small>Separe o pão quente e retire no horário da fornada.</small></div></div><label>Fornada<select name="batchId" required>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.productName} · {clock(batch.expectedAt)} · {Math.max(0, batch.capacity - batch.reservedCount)} livres</option>)}</select></label><div className="form-grid"><label>Seu nome<input required name="name" placeholder="Nome e sobrenome" /></label><label>WhatsApp<input required name="phone" inputMode="tel" placeholder="(18) 99999-9999" /></label></div><label>Quantidade<input required name="quantity" type="number" min="1" max="30" defaultValue="6" /></label><div className="modal-footer"><span className="form-note">Reserva vinculada à capacidade</span><Button variant="primary" type="submit" disabled={busy}>{busy ? "Reservando…" : "Confirmar reserva"}</Button></div></form></Modal>}

    {dialog === "coupon" && <Modal title="Criar uma promoção" eyebrow="CUPOM RASTREÁVEL" onClose={() => setDialog(null)}><form className="form-stack" onSubmit={async (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const ok = await requestApi("/api/coupons", { code: form.get("code"), title: form.get("title"), discountType: form.get("discountType"), discountValue: Number(form.get("discountValue")), maxRedemptions: Number(form.get("maxRedemptions")), expiresAt: form.get("expiresAt") || undefined });
      if (ok) setDialog(null);
    }}><div className="form-grid"><label>Nome da campanha<input required name="title" placeholder="Ex.: Combo da manhã" /></label><label>Código do cupom<input required name="code" placeholder="BOMDIA15" /></label></div><div className="form-grid"><label>Tipo de desconto<select name="discountType"><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option></select></label><label>Desconto<input required name="discountValue" type="number" min="1" step="0.01" placeholder="15" /></label></div><div className="form-grid"><label>Limite de resgates<input name="maxRedemptions" type="number" min="1" defaultValue="50" /></label><label>Válido até<input name="expiresAt" type="date" /></label></div><div className="modal-footer"><span className="form-note"><Icon name="chart" size={14} /> Cada uso fica rastreável</span><Button variant="primary" type="submit" disabled={busy}>{busy ? "Publicando…" : "Publicar promoção"}</Button></div></form></Modal>}

    {toast && <div className="toast-message"><span className="toast-check"><Icon name="check" size={15} /></span>{toast}</div>}
  </div>;
}

function nextOrderStatus(status: string) {
  if (status === "received") return "preparing";
  if (status === "preparing") return "ready";
  if (status === "ready") return "delivered";
  return status;
}

function OrdersTable({ orders, onAdvance, compact = false }: { orders: Order[]; onAdvance: (order: Order) => void; compact?: boolean }) {
  if (!orders.length) return <div className="empty-state"><span><Icon name="receipt" /></span><strong>Nenhum pedido por aqui</strong><p>Quando um pedido chegar, ele aparece nesta lista.</p></div>;
  return <div className={`table-scroll ${compact ? "table-compact" : ""}`}><table className="data-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Canal</th><th>Total</th><th>Status</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong className="order-number">{order.orderNumber}</strong><small className="row-subtle">{clock(order.createdAt)}</small></td><td><strong>{order.customerName}</strong><small className="row-subtle">{order.fulfillmentType === "delivery" ? "Entrega" : "Retirada"}</small></td><td className="item-summary">{order.items.map((item) => `${item.quantity}× ${item.nameSnapshot}`).join(", ") || "Pedido do balcão"}</td><td><span className={`channel-label channel-${order.channel}`}>{order.channel === "ifood" ? "iFood" : order.channel === "whatsapp" ? "WhatsApp" : "Loja própria"}</span></td><td><strong>{currency(order.total)}</strong></td><td><StatusBadge status={order.status} /></td><td>{!["delivered", "cancelled"].includes(order.status) && <button className="row-action" onClick={() => onAdvance(order)}>{order.status === "received" ? "Iniciar" : order.status === "preparing" ? "Marcar pronto" : "Entregue"}<Icon name="arrow" size={13} /></button>}</td></tr>)}</tbody></table></div>;
}

function OrdersView({ orders, selected, onSelect, onAdvance }: { orders: Order[]; selected: string; onSelect: (value: string) => void; onAdvance: (order: Order) => void }) {
  const filters = [{ key: "all", label: "Todos" }, { key: "received", label: "Novos" }, { key: "preparing", label: "Em preparo" }, { key: "ready", label: "Prontos" }, { key: "delivered", label: "Concluídos" }];
  return <div className="view-stack"><div className="filter-row"><div className="filter-pills">{filters.map((filter) => <button key={filter.key} className={`filter-pill ${selected === filter.key ? "filter-active" : ""}`} onClick={() => onSelect(filter.key)}>{filter.label}</button>)}</div><div className="operational-note"><span className="online-dot" /> Atualizado em tempo real</div></div><div className="panel table-panel"><OrdersTable orders={orders} onAdvance={onAdvance} /></div><div className="tip-strip"><Icon name="lightning" size={17} /><span><strong>Dica de operação:</strong> reservas de retirada aparecem junto com os pedidos para você preparar tudo na mesma fila.</span></div></div>;
}

function CustomOrdersView({ orders, onUpdate }: { orders: CustomOrder[]; onUpdate: (order: CustomOrder, changes: Record<string, unknown>) => void }) {
  const requested = orders.filter((order) => order.status === "requested").length;
  const pendingDeposit = orders.filter((order) => !order.depositPaid && !["delivered", "cancelled"].includes(order.status)).length;
  return <div className="view-stack"><div className="summary-strip"><div><span className="summary-icon lilac"><Icon name="calendar" /></span><strong>{orders.length}</strong><small>na agenda</small></div><div><span className="summary-icon orange"><Icon name="wallet" /></span><strong>{pendingDeposit}</strong><small>aguardando sinal</small></div><div><span className="summary-icon green"><Icon name="oven" /></span><strong>{orders.filter((order) => order.status === "production").length}</strong><small>em produção</small></div><div><span className="summary-icon blue"><Icon name="clock" /></span><strong>{requested}</strong><small>para confirmar</small></div></div>
    <div className="panel table-panel"><SectionTitle title="Agenda de encomendas" subtitle="Data do evento, sinal e andamento em um único lugar" action={<span className="capacity-tag"><Icon name="calendar" size={14} /> Agenda inteligente</span>} />
      <div className="table-scroll"><table className="data-table custom-table"><thead><tr><th>Cliente / item</th><th>Data do evento</th><th>Retirada</th><th>Total</th><th>Sinal</th><th>Etapa</th><th>Ação</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.customerName}</strong><small className="row-subtle">{orderTypeLabel[order.orderType] ?? order.orderType}{order.flavor ? ` · ${order.flavor}` : ""}</small></td><td><strong>{dayMonth(order.eventDate)}</strong><small className="row-subtle">{order.quantity} {order.orderType === "cake" ? "unidade" : "itens"}</small></td><td><span className="fulfillment-cell"><Icon name={order.fulfillmentType === "delivery" ? "truck" : "store"} size={14} />{order.fulfillmentType === "delivery" ? "Entrega" : "Balcão"}</span></td><td><strong>{currency(order.totalAmount)}</strong></td><td><span className={`deposit-tag ${order.depositPaid ? "deposit-paid" : "deposit-pending"}`}><Icon name={order.depositPaid ? "check" : "clock"} size={13} />{order.depositPaid ? `${currency(order.depositAmount)} pago` : `${currency(order.depositAmount)} pendente`}</span></td><td><StatusBadge status={order.status} custom /></td><td>{order.status === "requested" && !order.depositPaid ? <button className="row-action" onClick={() => onUpdate(order, { depositPaid: true })}>Confirmar sinal <Icon name="check" size={13} /></button> : order.status === "confirmed" ? <button className="row-action" onClick={() => onUpdate(order, { status: "production" })}>Iniciar produção <Icon name="arrow" size={13} /></button> : order.status === "production" ? <button className="row-action" onClick={() => onUpdate(order, { status: "ready" })}>Marcar pronto <Icon name="check" size={13} /></button> : order.status === "ready" ? <button className="row-action" onClick={() => onUpdate(order, { status: "delivered" })}>Entregue <Icon name="arrow" size={13} /></button> : <span className="muted-dash">—</span>}</td></tr>)}</tbody></table></div>
    </div>
    <div className="two-card-row"><div className="panel mini-info-card"><div className="mini-info-icon"><Icon name="info" /></div><div><strong>Sinal que protege a produção</strong><p>O fluxo reserva 40% do valor e cria um pagamento Pix pendente. Na operação real, a confirmação automática depende da integração com o provedor Pix escolhido.</p></div></div><div className="panel mini-info-card calendar-info"><div className="mini-info-icon green"><Icon name="calendar" /></div><div><strong>Agenda sem overbooking</strong><p>Datas com capacidade esgotada são bloqueadas antes de aceitar novas encomendas — sem conversa perdida no WhatsApp.</p></div></div></div>
  </div>;
}

function BatchesView({ batches, reservations, onReserve }: { batches: Batch[]; reservations: Reservation[]; onReserve: () => void }) {
  return <div className="view-stack"><div className="batch-hero"><div><span className="welcome-pill"><Icon name="flame" size={14} /> FORNADA DO DIA</span><h2>O pão quente tem hora marcada.</h2><p>Publique uma fornada, limite a quantidade e deixe o cliente reservar para retirada expressa.</p><button className="button button-white" onClick={onReserve}><Icon name="plus" size={16} /> Criar reserva</button></div><div className="batch-hero-graphic"><div className="oven-graphic"><span /><i /><i /><i /></div><span className="oven-steam">✦</span></div></div>
    <div className="panel batch-panel"><SectionTitle title="Programação de hoje" subtitle="Capacidade e reservas por lote" action={<span className="capacity-tag"><Icon name="clock" size={14} /> Próximas 12 horas</span>} /><div className="batch-grid">{batches.map((batch, index) => { const percent = Math.min(100, Math.round(batch.reservedCount / Math.max(1, batch.capacity) * 100)); return <article key={batch.id} className="batch-card"><div className="batch-card-top"><span className={`batch-symbol batch-symbol-${index % 4}`}><Icon name={index === 0 ? "bread" : index === 1 ? "coffee" : "oven"} /></span><span className={`batch-state ${batch.status === "baking" ? "batch-now" : ""}`}><i />{batch.status === "baking" ? "No forno" : "Programada"}</span></div><p className="batch-time">{clock(batch.expectedAt)} <span>· hoje</span></p><h3>{batch.productName}</h3><p className="batch-description">{batch.notes ?? "Fornada fresca"}</p><div className="capacity-copy"><span>{batch.reservedCount} reservados</span><strong>{batch.capacity - batch.reservedCount} livres</strong></div><div className="capacity-track large"><span style={{ width: `${percent}%` }} /></div><div className="batch-card-foot"><span>{percent}% da capacidade</span><button onClick={onReserve}>Reservar <Icon name="arrow" size={13} /></button></div></article>; })}</div></div>
    <div className="panel table-panel"><SectionTitle title="Reservas de retirada" subtitle="Clientes que já garantiram a próxima fornada" /><div className="table-scroll"><table className="data-table"><thead><tr><th>Código</th><th>Cliente</th><th>Quantidade</th><th>Retirada</th><th>Contato</th><th>Status</th></tr></thead><tbody>{reservations.map((reservation) => <tr key={reservation.id}><td><strong className="order-number">{reservation.reservationCode}</strong></td><td><strong>{reservation.customerName}</strong></td><td>{reservation.quantity} un.</td><td>{clock(reservation.pickupAt)}</td><td><a className="phone-link" href={`https://wa.me/${reservation.phone}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> WhatsApp</a></td><td><StatusBadge status={reservation.status === "reserved" ? "confirmed" : reservation.status} custom /></td></tr>)}</tbody></table>{!reservations.length && <div className="empty-state"><span><Icon name="bread" /></span><strong>Sem reservas por enquanto</strong><p>Compartilhe o link da vitrine para começar.</p></div>}</div></div>
  </div>;
}

function MenuView({ products, categoryById, onToggle }: { products: Product[]; categoryById: Map<string, string>; onToggle: (product: Product) => void }) {
  const categories = [...new Set(products.map((product) => categoryById.get(product.categoryId ?? "") ?? "Outros"))];
  const [selected, setSelected] = useState("Todos");
  const filtered = selected === "Todos" ? products : products.filter((product) => (categoryById.get(product.categoryId ?? "") ?? "Outros") === selected);
  return <div className="view-stack"><div className="menu-callout"><span className="menu-callout-icon"><Icon name="sun" /></span><div><strong>Um cardápio para cada momento do dia.</strong><p>Produtos indisponíveis desaparecem da vitrine sem mexer no restante do catálogo.</p></div><span className="daypart-badge"><i /> Café da manhã</span></div><div className="filter-row"><div className="filter-pills"><button className={`filter-pill ${selected === "Todos" ? "filter-active" : ""}`} onClick={() => setSelected("Todos")}>Todos</button>{categories.map((category) => <button key={category} className={`filter-pill ${selected === category ? "filter-active" : ""}`} onClick={() => setSelected(category)}>{category}</button>)}</div><span className="operational-note">{products.length} itens no catálogo</span></div><div className="panel menu-list-panel"><div className="menu-list-head"><span>Produto</span><span>Período</span><span>Preço</span><span>Na vitrine</span></div>{filtered.map((product) => <div className={`menu-product-row ${!product.isAvailable ? "product-unavailable" : ""}`} key={product.id}><div className="menu-product-main"><span className={`product-thumb product-thumb-${product.productType}`}><Icon name={product.productType === "custom" ? "cake" : product.name.toLowerCase().includes("café") ? "coffee" : "bread"} size={18} /></span><div><strong>{product.name}</strong><small>{product.description}</small></div></div><div className="period-tags">{product.availabilityPeriods.slice(0, 2).map((period) => <span key={period}>{period === "breakfast" ? "Manhã" : period === "lunch" ? "Almoço" : period === "afternoon" ? "Tarde" : "O dia todo"}</span>)}</div><strong className="menu-price">{currency(product.price)}</strong><button className={`toggle-switch ${product.isAvailable ? "toggle-on" : ""}`} role="switch" aria-checked={product.isAvailable} aria-label={`${product.isAvailable ? "Desativar" : "Ativar"} ${product.name}`} onClick={() => onToggle(product)}><span /></button></div>)}</div></div>;
}

function CustomersView({ customers, search, onSearch, subscriptions, accounts }: { customers: Customer[]; search: string; onSearch: (value: string) => void; subscriptions: Subscription[]; accounts: CorporateAccount[] }) {
  const topSpend = customers.reduce((best, customer) => Math.max(best, Number(customer.lifetimeSpend)), 0);
  return <div className="view-stack"><div className="summary-strip customer-summary"><div><span className="summary-icon blue"><Icon name="users" /></span><strong>{customers.length}</strong><small>clientes no CRM</small></div><div><span className="summary-icon orange"><Icon name="star" /></span><strong>{customers.reduce((sum, customer) => sum + Number(customer.loyaltyPoints), 0).toLocaleString("pt-BR")}</strong><small>pontos emitidos</small></div><div><span className="summary-icon green"><Icon name="rotate" /></span><strong>{subscriptions.filter((subscription) => subscription.status === "active").length}</strong><small>assinaturas ativas</small></div><div><span className="summary-icon lilac"><Icon name="store" /></span><strong>{accounts.length}</strong><small>contas corporativas</small></div></div><div className="panel table-panel"><div className="customer-table-heading"><SectionTitle title="Sua comunidade" subtitle="Histórico, pontos e frequência de compra" /><div className="search-input"><Icon name="search" size={17} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar cliente" /></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Cliente</th><th>Fidelidade</th><th>Pedidos</th><th>Última visita</th><th>Total gasto</th><th>Contato</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><div className="customer-cell"><span className="customer-avatar">{customer.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span><div><strong>{customer.name}</strong><small className="row-subtle">{customer.phone}</small></div></div></td><td><span className={`tier-badge tier-${customer.tier}`}><Icon name={customer.tier === "ouro" ? "crown" : "star"} size={12} />{customer.tier}</span><small className="row-subtle point-line">{customer.loyaltyPoints} pontos</small></td><td><strong>{Math.max(1, Math.floor(Number(customer.lifetimeSpend) / 35))}</strong></td><td>{customer.lastOrderAt ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(customer.lastOrderAt)) : "—"}</td><td><strong>{currency(customer.lifetimeSpend)}</strong></td><td><a className="phone-link" href={`https://wa.me/${customer.phone}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> Chamar</a></td></tr>)}</tbody></table>{!customers.length && <div className="empty-state"><span><Icon name="users" /></span><strong>Nenhum cliente encontrado</strong><p>Tente buscar por outro nome ou telefone.</p></div>}</div></div><div className="customer-note"><Icon name="sparkles" size={17} /><span>Cliente de maior valor: <strong>{customers.find((customer) => Number(customer.lifetimeSpend) === topSpend)?.name ?? "—"}</strong> · {currency(topSpend)} em compras registradas.</span></div></div>;
}

function LoyaltyView({ customers, subscriptions }: { customers: Customer[]; subscriptions: Subscription[] }) {
  const active = subscriptions.filter((subscription) => subscription.status === "active");
  const mrr = active.reduce((sum, subscription) => sum + Number(subscription.amount) * (subscription.billingInterval === "weekly" ? 4 : 1), 0);
  return <div className="view-stack"><div className="loyalty-hero"><div className="loyalty-copy"><span className="welcome-pill"><Icon name="star" size={14} /> RECORRÊNCIA DE BAIRRO</span><h2>O pão de todo dia<br />pode virar um clube.</h2><p>Assinaturas simples para manter o cliente por perto — e o caixa previsível para a padaria.</p><button className="button button-white" onClick={() => window.open("https://wa.me/?text=Oi!%20Quero%20conhecer%20o%20Clube%20do%20P%C3%A3o%20Quente", "_blank", "noopener,noreferrer")}><Icon name="whatsapp" size={16} /> Convidar clientes</button></div><div className="loyalty-stamp"><Icon name="bread" size={38} /><strong>10º</strong><span>pão na chapa<br />por nossa conta</span></div></div><div className="loyalty-metrics"><div className="panel"><span className="metric-label">ASSINANTES ATIVOS</span><strong>{active.length}</strong><small>planos recorrentes em vigor</small></div><div className="panel"><span className="metric-label">RECEITA RECORRENTE / MÊS</span><strong>{currency(mrr)}</strong><small>semanal convertido em mensal</small></div><div className="panel"><span className="metric-label">CLIENTES NO CLUBE</span><strong>{customers.filter((customer) => customer.loyaltyPoints > 0).length}</strong><small>com pontos acumulados</small></div></div><div className="plan-grid"><article className="plan-card"><span className="plan-label">MAIS NATURAL</span><div className="plan-icon"><Icon name="bread" /></div><h3>Clube do Pão Quente</h3><p>1 pão fresco por dia útil, com retirada rápida ou entrega agendada.</p><div className="plan-price"><strong>R$ 89,90</strong><span>/ mês · sugestão</span></div><ul><li><Icon name="check" /> 5 pães por semana</li><li><Icon name="check" /> Preferência na fornada</li><li><Icon name="check" /> 1 café de cortesia no mês</li></ul><span className="plan-foot">Plano piloto · validar custo e logística</span></article><article className="plan-card plan-card-featured"><span className="plan-label">ROTINA DE MANHÃ</span><div className="plan-icon coral"><Icon name="coffee" /></div><h3>Café & Salgado</h3><p>Uma pausa gostosa, já paga, para o cliente retirar durante a semana.</p><div className="plan-price"><strong>R$ 39,90</strong><span>/ semana · sugestão</span></div><ul><li><Icon name="check" /> 5 cafés coados</li><li><Icon name="check" /> 5 salgados da vitrine</li><li><Icon name="check" /> Resgate no horário escolhido</li></ul><span className="plan-foot">Preço final depende da margem real</span></article><article className="plan-card"><span className="plan-label">FIDELIDADE DIRETA</span><div className="plan-icon green"><Icon name="gift" /></div><h3>10º pão na chapa grátis</h3><p>Fidelidade sem mensalidade: compra registrada, recompensa automática.</p><div className="plan-price"><strong>10 pontos</strong><span>/ por item elegível</span></div><ul><li><Icon name="check" /> Histórico centralizado</li><li><Icon name="check" /> Resgate no canal próprio</li><li><Icon name="check" /> Dados ficam com a padaria</li></ul><span className="plan-foot">Regra configurável por produto</span></article></div><div className="panel subscriptions-panel"><SectionTitle title="Assinantes de demonstração" subtitle="Amostra de como o painel acompanha recorrência" /><div className="subscription-list">{subscriptions.map((subscription) => <div className="subscription-row" key={subscription.id}><span className="sub-avatar"><Icon name={subscription.planName.toLowerCase().includes("café") ? "coffee" : "bread"} size={16} /></span><div><strong>{subscription.customerName}</strong><small>{subscription.planName} · {subscription.billingInterval === "weekly" ? "semanal" : "mensal"}</small></div><strong>{currency(subscription.amount)}</strong><StatusBadge status={subscription.status === "active" ? "confirmed" : "cancelled"} custom /></div>)}</div></div></div>;
}

function MarketingView({ coupons, onCreate }: { coupons: Coupon[]; onCreate: () => void }) {
  const activeCoupons = coupons.filter((coupon) => coupon.isActive);
  const redemptions = coupons.reduce((sum, coupon) => sum + coupon.redemptionCount, 0);
  return <div className="view-stack"><div className="marketing-hero"><div><span className="welcome-pill"><Icon name="lightning" size={14} /> CAMPANHAS COM PRAZO E LIMITE</span><h2>Promoção boa é promoção que dá para medir.</h2><p>Um toque no cupom, uma venda no canal próprio e o resgate vira dado — não só curtida.</p></div><div className="coupon-ticket"><span>SEU CUPOM</span><strong>BOMDIA15</strong><small>15% NO COMBO DA MANHÃ</small><div className="ticket-cut ticket-left" /><div className="ticket-cut ticket-right" /></div></div><div className="marketing-metrics"><div className="panel"><span className="metric-label">CAMPANHAS ATIVAS</span><strong>{activeCoupons.length}</strong><small>com prazo e limite configurados</small></div><div className="panel"><span className="metric-label">RESGATES REGISTRADOS</span><strong>{redemptions}</strong><small>desde o início das campanhas</small></div><div className="panel"><span className="metric-label">CUPOM MAIS USADO</span><strong>{coupons[0]?.code ?? "—"}</strong><small>{coupons[0]?.redemptionCount ?? 0} utilizações</small></div></div><div className="panel campaign-panel"><SectionTitle title="Campanhas e cupons" subtitle="Oferta publicada, validade e uso" action={<Button variant="secondary" icon="plus" onClick={onCreate}>Nova campanha</Button>} /><div className="campaign-list">{coupons.map((coupon) => { const percent = coupon.maxRedemptions ? Math.min(100, coupon.redemptionCount / coupon.maxRedemptions * 100) : 0; return <div className="campaign-row" key={coupon.id}><span className="campaign-glyph"><Icon name="percent" /></span><div className="campaign-copy"><div><strong>{coupon.title}</strong><span className="campaign-code">{coupon.code}</span></div><small>{coupon.discountType === "percent" ? `${coupon.discountValue}% de desconto` : `${currency(coupon.discountValue)} de desconto`} · {coupon.expiresAt ? `até ${dayMonth(String(coupon.expiresAt).slice(0, 10))}` : "sem prazo definido"}</small></div><div className="campaign-progress"><div><span>{coupon.redemptionCount} resgates</span><strong>{coupon.maxRedemptions ?? "∞"} limite</strong></div><div className="capacity-track"><span style={{ width: `${percent}%` }} /></div></div><span className={`campaign-state ${coupon.isActive ? "campaign-live" : ""}`}><i />{coupon.isActive ? "Ativa" : "Pausada"}</span></div>; })}{!coupons.length && <div className="empty-state"><span><Icon name="megaphone" /></span><strong>Crie sua primeira campanha</strong><p>Limite por cliente, período e rastreamento de resgates.</p></div>}</div></div><div className="automation-strip"><span className="automation-mark"><Icon name="sparkles" /></span><div><strong>Próximo motor: recuperação automática de carrinho</strong><p>Disparar WhatsApp 30 minutos após abandono, com cupom rastreável e opt-in.</p></div><span className="roadmap-tag">FASE 2</span></div></div>;
}

function StrategyView({ tab, onTab }: { tab: "prd" | "pitch"; onTab: (tab: "prd" | "pitch") => void }) {
  return <div className="view-stack strategy-view"><div className="strategy-hero"><div className="strategy-orbit orbit-one" /><div className="strategy-orbit orbit-two" /><div className="strategy-copy"><span className="welcome-pill"><Icon name="layers" size={14} /> PRODUTO REGIONAL · JUNQUEIRÓPOLIS</span><h2>Um core. Duas verticais.<br /><em>O bairro inteiro conectado.</em></h2><p>Do balcão de almoço do Rango à primeira fornada da Pão na Chapa: canais próprios, dados próprios e uma plataforma reaproveitável.</p></div><div className="vertical-pair"><div className="vertical-card"><span className="vertical-mark restaurant-mark"><Icon name="shopping" /></span><span>VERTICAL 01</span><strong>Rango</strong><small>Restaurante · cardápio do dia</small></div><div className="vertical-join"><Icon name="layers" size={20} /></div><div className="vertical-card"><span className="vertical-mark bakery-mark"><Icon name="bread" /></span><span>VERTICAL 02</span><strong>Pão na Chapa</strong><small>Padaria · fornadas & encomendas</small></div></div></div>
    <div className="strategy-tabs"><button className={tab === "prd" ? "strategy-tab-active" : ""} onClick={() => onTab("prd")}><Icon name="book" size={16} /> PRD UNIFICADO</button><button className={tab === "pitch" ? "strategy-tab-active" : ""} onClick={() => onTab("pitch")}><Icon name="sparkles" size={16} /> DECK DE VENDAS · 8 SLIDES</button></div>
    {tab === "prd" ? <>
      <div className="prd-intro"><div><span className="metric-label">PRODUCT REQUIREMENTS DOCUMENT · V1</span><h2>O canal próprio que faz o cliente voltar.</h2><p>Escopo para validar a operação da Pão na Chapa e reutilizar o mesmo núcleo no Rango.</p></div><span className="prd-version">V0.9 · JUNQUEIRÓPOLIS</span></div>
      <div className="prd-grid"><article className="panel prd-card"><span className="prd-number">01</span><h3>Objetivo do produto</h3><p>Vender sem comissão, organizar a operação por período do dia e guardar relacionamento e dados no negócio.</p><div className="prd-tag-row"><span>Canal próprio</span><span>Recorrência</span><span>Margem</span></div></article><article className="panel prd-card"><span className="prd-number">02</span><h3>Personas & histórias</h3><ul><li>Como cliente, quero ver o cardápio do horário e reservar antes de sair.</li><li>Como cliente, quero encomendar uma festa com data, sabor e sinal claro.</li><li>Como padeiro, quero pausar um item esgotado em um toque.</li><li>Como gerente, quero bloquear datas lotadas e ver o sinal recebido.</li></ul></article><article className="panel prd-card"><span className="prd-number">03</span><h3>Core compartilhado</h3><p>Tenants, clientes, endereços, catálogo, pedidos, pagamentos, cupons, resgates, pontos, assinaturas e notificações.</p><div className="schema-pills"><code>tenant_id</code><code>orders</code><code>loyalty_ledger</code><code>subscriptions</code></div></article><article className="panel prd-card"><span className="prd-number">04</span><h3>Plugins por vertical</h3><div className="plugin-line"><Icon name="bread" /><span><strong>Padaria</strong><small>Períodos · fornadas · reservas · encomendas com sinal · produção</small></span></div><div className="plugin-line"><Icon name="shopping" /><span><strong>Restaurante</strong><small>Cardápio do dia · combos · marmita recorrente · retirada</small></span></div></article></div>
      <div className="panel roadmap-panel"><SectionTitle title="Roadmap de entrega" subtitle="Reuso do core reduz tempo e risco entre clientes" /><div className="roadmap-line">{[{week:"SEM 01",title:"Descoberta",text:"Validar telefone, volumes, fotos e tabela de encomendas."},{week:"SEM 02–03",title:"Vitrine viva",text:"PWA, períodos, cupons e pedido estruturado."},{week:"SEM 04–06",title:"Venda própria",text:"Checkout Pix, fornadas, push e fidelidade."},{week:"SEM 07–09",title:"Recorrência",text:"Sinal, agenda, planos e B2B."},{week:"SEM 10+",title:"Escala regional",text:"White-label para padarias e restaurantes."}].map((phase, index) => <div className="roadmap-step" key={phase.week}><span className={`roadmap-node ${index < 2 ? "roadmap-node-done" : ""}`}>{String(index + 1).padStart(2, "0")}</span><small>{phase.week}</small><strong>{phase.title}</strong><p>{phase.text}</p></div>)}</div></div>
      <section className="panel research-panel"><div className="research-heading"><span className="research-icon"><Icon name="search" /></span><div><span className="metric-label">DADOS DE DEMONSTRAÇÃO</span><h3>O cadastro precisa de uma revisão fina.</h3></div><span className="research-stamp">CHECADO EM 2026</span></div><div className="research-findings"><div><span className="finding-mark finding-good"><Icon name="check" size={13} /></span><p><strong>Contato convergente</strong><small>A página pública no Facebook e diretórios locais exibem (18) 99999-0107, consistente com o número oficial do dossiê.</small></p></div><div><span className="finding-mark finding-warn"><Icon name="info" size={13} /></span><p><strong>CEP divergente</strong><small>O dossiê traz 00000-000; Solutudo e cadastros empresariais encontrados listam 00000-000. Confirmar com a loja.</small></p></div><div><span className="finding-mark finding-warn"><Icon name="clock" size={13} /></span><p><strong>Horários de fim de semana divergentes</strong><small>O dossiê informa sáb. até 17h e dom. 6h–12h. Restaurant Guru lista sáb. até 18h e dom. 6h30–13h. Não publicar sem confirmação.</small></p></div><div><span className="finding-mark finding-warn"><Icon name="star" size={13} /></span><p><strong>Avaliações variam por diretório</strong><small>Dossiê: 4,2/5 com 52 avaliações. Restaurant Guru: 4,7/5 com 36 votos. São fotografias de fontes diferentes, não um dado oficial.</small></p></div></div><div className="research-links"><span>Observação</span><a href="https://example.com" target="_blank" rel="noreferrer">Facebook <Icon name="external" size={12} /></a><a href="https://example.com" target="_blank" rel="noreferrer">Solutudo <Icon name="external" size={12} /></a><a href="https://example.com" target="_blank" rel="noreferrer">Restaurant Guru <Icon name="external" size={12} /></a></div></section>
      <div className="risk-note"><Icon name="info" size={17} /><div><strong>Próxima validação com a equipe</strong><p>Confirmar telefone da fachada (final 4688 vs. oficial 4668), CEP e horários de sábado/domingo; depois validar volumes, margens, capacidade por data e logística dos planos. Concorrentes, audiência, avaliações e canais citados no dossiê são premissas de trabalho até reconfirmação direta.</p></div></div>
    </> : <>
      <div className="deck-cover"><span className="welcome-pill"><Icon name="sparkles" size={14} /> PITCH COMERCIAL · CLIENTE FUNDADOR</span><h2>A padaria vende pão.<br /><em>A gente faz o cliente voltar.</em></h2><p>Clube do Pão Quente · plataforma de vendas próprias para o comércio de bairro.</p><div className="deck-cover-foot"><span>PÃO NA CHAPA × RANGO</span><span>JUNQUEIRÓPOLIS · 2026</span></div></div>
      <div className="deck-grid">{[
        ["01", "O hábito já existe", "A padaria começa às 5h40. O cliente volta todo dia. Mesmo assim, os pedidos e o relacionamento se espalham entre balcão, marketplace e WhatsApp."],
        ["02", "A margem escorre", "Comissão no ticket baixo, promoção sem rastreio e conversa manual para cada encomenda — trabalho repetido e dado que não fica com a loja."],
        ["03", "Seu canal, suas regras", "Vitrine com marca própria, cardápio por período, pedido simples, retirada rápida e informação centralizada."],
        ["04", "Do forno direto ao cliente", "Reserva da fornada, aviso de pão quentinho, fidelidade e encomenda com data, sinal e agenda de produção."],
        ["05", "Uma plataforma, duas rotinas", "Rango organiza almoço e marmita recorrente. Pão na Chapa organiza café cedo, fornadas e festas. O core é o mesmo."],
        ["06", "Prova de valor em 30 dias", "Começar com vitrine por período, um combo rastreável e reserva de fornada. Medir pedidos, resgates e recorrência."],
        ["07", "Investimento fundador", "Setup recomendado de R$ 1.200–2.000 + R$ 249–349/mês. Condição fundadora pode abater setup por fidelidade de 6 meses."],
        ["08", "O próximo passo", "Uma conversa de 30 minutos: validar volume, horários de fornada, preço de encomendas e o telefone certo. Depois, piloto com dados reais."],
      ].map(([number, title, text]) => <article className="deck-slide" key={number}><span className="deck-number">{number}</span><span className="deck-spark"><Icon name="sparkle" size={15} /></span><h3>{title}</h3><p>{text}</p></article>)}</div><div className="sales-footnote"><Icon name="info" size={15} /> Premissas de preço, ROI e operação devem ser confirmadas com cada lojista. A integração Pix, WhatsApp e push depende de credenciais e aprovação dos respectivos provedores.</div>
    </>}
  </div>;
}

function TopProducts({ products, orders }: { products: Product[]; orders: Order[] }) {
  const popularity = new Map<string, number>();
  for (const order of orders) for (const item of order.items) popularity.set(item.nameSnapshot, (popularity.get(item.nameSnapshot) ?? 0) + item.quantity);
  const top = products.map((product) => ({ ...product, quantity: popularity.get(product.name) ?? 0 })).sort((a, b) => b.quantity - a.quantity).slice(0, 4);
  const max = Math.max(1, ...top.map((product) => product.quantity));
  return <div className="top-products">{top.map((product, index) => <div className="top-product-row" key={product.id}><span className={`top-product-rank rank-${index}`}>{String(index + 1).padStart(2, "0")}</span><span className="top-product-info"><strong>{product.name}</strong><span className="top-product-bar"><i style={{ width: `${Math.max(10, product.quantity / max * 100)}%` }} /></span></span><span className="top-product-count">{product.quantity} un.</span></div>)}</div>;
}
