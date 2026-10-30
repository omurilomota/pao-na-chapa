'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

type Product = { id: string; name: string; description: string | null; price: string; productType: string; isAvailable: boolean; availabilityPeriods: string[]; categoryId: string | null };
type OrderItem = { id: string; nameSnapshot: string; quantity: number };
type Order = { id: string; orderNumber: string; customerName: string; customerPhone: string | null; channel: string; fulfillmentType: string; status: string; total: string; createdAt: string; items: OrderItem[] };
type CustomOrder = { id: string; customerName: string; phone: string; orderType: string; flavor: string | null; quantity: number; eventDate: string; totalAmount: string; depositAmount: string; depositPaid: boolean; status: string };
type Batch = { id: string; productName: string; expectedAt: string; capacity: number; reservedCount: number; status: string; notes: string | null };
type Reservation = { id: string; customerName: string; phone: string; quantity: number; reservationCode: string; pickupAt: string };
type Customer = { id: string; name: string; phone: string; email: string | null; loyaltyPoints: number; tier: string; lifetimeSpend: string; lastOrderAt: string | null };
type Coupon = { id: string; code: string; title: string; discountType: string; discountValue: string; redemptionCount: number; maxRedemptions: number | null; isActive: boolean };
type Subscription = { id: string; planName: string; amount: string; status: string; customerName: string };
type Category = { id: string; name: string };
type Workspace = { products: Product[]; orders: Order[]; customOrders: CustomOrder[]; batches: Batch[]; reservations: Reservation[]; customers: Customer[]; coupons: Coupon[]; subscriptions: Subscription[]; categories: Category[] };
type View = "overview" | "orders" | "custom" | "batches" | "menu" | "customers" | "marketing" | "strategy";
type Dialog = "order" | "custom" | "reservation" | "coupon" | null;

const money = (value: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const time = (value: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const shortDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`)).replace(" de ", " ");
const orderStatus: Record<string, string> = { received: "Novo", preparing: "Em preparo", ready: "Pronto", delivered: "Concluído", cancelled: "Cancelado" };
const customStatus: Record<string, string> = { requested: "A confirmar", confirmed: "Confirmado", production: "Em produção", ready: "Pronto", delivered: "Entregue", cancelled: "Cancelado" };
const customType: Record<string, string> = { cake: "Bolo", "party-kit": "Kit festa", savories: "Salgados", "filled-bread": "Pão recheado" };

const navigation: Array<{ id: View; label: string; icon: IconName }> = [
  { id: "overview", label: "Resumo", icon: "grid" },
  { id: "orders", label: "Pedidos", icon: "receipt" },
  { id: "custom", label: "Encomendas", icon: "cake" },
  { id: "batches", label: "Fornadas", icon: "oven" },
  { id: "menu", label: "Cardápio", icon: "book" },
  { id: "customers", label: "Clientes", icon: "users" },
  { id: "marketing", label: "Cupons", icon: "percent" },
  { id: "strategy", label: "Projeto", icon: "layers" },
];

const viewTitle: Record<View, string> = { overview: "Resumo", orders: "Pedidos", custom: "Encomendas", batches: "Fornadas", menu: "Cardápio", customers: "Clientes", marketing: "Cupons", strategy: "Projeto" };

function Status({ value, custom = false }: { value: string; custom?: boolean }) {
  return <span className={`c-status c-status-${value}`}><i />{(custom ? customStatus : orderStatus)[value] ?? value}</span>;
}

function Empty({ icon, title }: { icon: IconName; title: string }) {
  return <div className="c-empty"><Icon name={icon} /><p>{title}</p></div>;
}

function Panel({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`c-panel ${className}`}><div className="c-panel-head"><h2>{title}</h2>{action}</div>{children}</section>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="c-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="c-modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button onClick={onClose} aria-label="Fechar"><Icon name="close" /></button></header>{children}</section></div>;
}

export default function CompactDashboard() {
  const [data, setData] = useState<Workspace | null>(null);
  const [view, setView] = useState<View>("overview");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [drawer, setDrawer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar o painel.");
    setData(await response.json() as Workspace);
  }

  useEffect(() => { load().catch((error) => setToast(error instanceof Error ? error.message : "Falha ao carregar.")); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(timer); }, [toast]);

  async function mutate(url: string, body: unknown, method = "POST") {
    setBusy(true);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível concluir.");
      await load();
      setToast("Atualizado com sucesso.");
      return true;
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível concluir."); return false; }
    finally { setBusy(false); }
  }

  function go(next: View) { setView(next); setDrawer(false); }
  function advanceOrder(order: Order) {
    const next = order.status === "received" ? "preparing" : order.status === "preparing" ? "ready" : order.status === "ready" ? "delivered" : order.status;
    void mutate(`/api/orders/${order.id}`, { status: next }, "PATCH");
  }
  function advanceCustom(order: CustomOrder) {
    if (!order.depositPaid) void mutate(`/api/custom-orders/${order.id}`, { depositPaid: true }, "PATCH");
    else { const next = order.status === "confirmed" ? "production" : order.status === "production" ? "ready" : order.status === "ready" ? "delivered" : order.status; void mutate(`/api/custom-orders/${order.id}`, { status: next }, "PATCH"); }
  }

  const orders = data?.orders ?? [];
  const customOrders = data?.customOrders ?? [];
  const batches = data?.batches ?? [];
  const products = data?.products ?? [];
  const customers = data?.customers ?? [];
  const coupons = data?.coupons ?? [];
  const openOrders = orders.filter((order) => ["received", "preparing", "ready"].includes(order.status));
  const activeCustom = customOrders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const todaySales = orders.filter((order) => new Date(order.createdAt).toDateString() === new Date().toDateString()).reduce((total, order) => total + Number(order.total), 0);
  const categoryNames = useMemo(() => new Map((data?.categories ?? []).map((category) => [category.id, category.name])), [data?.categories]);
  const filteredCustomers = customers.filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(search.toLowerCase()));

  const action = view === "orders" ? { label: "Novo pedido", dialog: "order" as Dialog } : view === "custom" ? { label: "Nova encomenda", dialog: "custom" as Dialog } : view === "batches" ? { label: "Reservar", dialog: "reservation" as Dialog } : view === "marketing" ? { label: "Novo cupom", dialog: "coupon" as Dialog } : null;

  return <div className="c-app">
    {drawer && <button className="c-drawer-shade" onClick={() => setDrawer(false)} aria-label="Fechar menu" />}
    <aside className={`c-sidebar ${drawer ? "is-open" : ""}`}>
      <div className="c-logo"><span><Icon name="bread" /></span><div><strong>Pão na Chapa</strong><small>Painel da padaria</small></div></div>
      <nav>{navigation.map((item) => <button key={item.id} className={view === item.id ? "is-active" : ""} onClick={() => go(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === "orders" && openOrders.length > 0 && <b>{openOrders.length}</b>}</button>)}</nav>
      <div className="c-sidebar-foot"><span className="c-online" />Loja conectada</div>
    </aside>

    <div className="c-workspace">
      <header className="c-topbar"><button className="c-menu-button" onClick={() => setDrawer(true)} aria-label="Abrir menu"><Icon name="menu" /></button><div><strong>{viewTitle[view]}</strong><span>Junqueirópolis · SP</span></div><div className="c-top-actions"><Link href="/loja">Ver loja <Icon name="external" size={16} /></Link><span className="c-avatar">AM</span></div></header>
      <main className="c-main">
        <div className="c-page-head"><div><h1>{viewTitle[view]}</h1><p>{view === "overview" ? "O que precisa da sua atenção hoje." : view === "strategy" ? "Escopo e próximos passos do produto." : "Informações atualizadas da operação."}</p></div>{action && <button className="c-primary" onClick={() => setDialog(action.dialog)}><Icon name="plus" size={17} />{action.label}</button>}</div>

        {view === "overview" && <>
          <section className="c-metrics"><article><span>Vendas hoje</span><strong>{money(todaySales)}</strong></article><article><span>Pedidos em aberto</span><strong>{openOrders.length}</strong></article><article><span>Encomendas ativas</span><strong>{activeCustom.length}</strong></article></section>
          <div className="c-overview-grid">
            <Panel title="Pedidos recentes" action={<button className="c-text-button" onClick={() => go("orders")}>Ver todos</button>}><OrderList orders={orders.slice(0, 5)} onAdvance={advanceOrder} /></Panel>
            <Panel title="Próximas fornadas" action={<button className="c-text-button" onClick={() => go("batches")}>Abrir agenda</button>}><div className="c-batch-list">{batches.slice(0, 4).map((batch) => <article key={batch.id}><time>{time(batch.expectedAt)}</time><div><strong>{batch.productName}</strong><span>{batch.reservedCount} de {batch.capacity} reservados</span></div><span className="c-capacity"><i style={{ width: `${Math.min(100, batch.reservedCount / Math.max(1, batch.capacity) * 100)}%` }} /></span></article>)}{!batches.length && <Empty icon="oven" title="Nenhuma fornada programada." />}</div></Panel>
          </div>
          <div className="c-shortcuts"><button onClick={() => setDialog("order")}><Icon name="receipt" /><span><strong>Registrar pedido</strong><small>Venda do balcão ou telefone</small></span></button><button onClick={() => setDialog("custom")}><Icon name="cake" /><span><strong>Nova encomenda</strong><small>Data, sinal e produção</small></span></button><button onClick={() => setDialog("reservation")}><Icon name="bread" /><span><strong>Reservar fornada</strong><small>Separe para retirada</small></span></button></div>
        </>}

        {view === "orders" && <Panel title={`${orders.length} pedidos`}><OrderList orders={orders} onAdvance={advanceOrder} full /></Panel>}

        {view === "custom" && <Panel title={`${activeCustom.length} encomendas ativas`}><div className="c-table-wrap"><table className="c-table"><thead><tr><th>Cliente</th><th>Encomenda</th><th>Data</th><th>Sinal</th><th>Status</th><th /></tr></thead><tbody>{customOrders.map((order) => <tr key={order.id}><td><strong>{order.customerName}</strong><small>{order.phone}</small></td><td>{customType[order.orderType] ?? order.orderType}<small>{order.flavor}</small></td><td>{shortDate(order.eventDate)}</td><td><span className={order.depositPaid ? "c-paid" : "c-pending"}>{order.depositPaid ? "Pago" : money(order.depositAmount)}</span></td><td><Status value={order.status} custom /></td><td>{!["delivered", "cancelled"].includes(order.status) && <button className="c-row-action" onClick={() => advanceCustom(order)}>{!order.depositPaid ? "Confirmar sinal" : order.status === "confirmed" ? "Produzir" : order.status === "production" ? "Marcar pronto" : "Entregar"}</button>}</td></tr>)}</tbody></table></div></Panel>}

        {view === "batches" && <><div className="c-batch-grid">{batches.map((batch) => <article className="c-batch-card" key={batch.id}><header><time>{time(batch.expectedAt)}</time><Status value={batch.status === "baking" ? "preparing" : "received"} /></header><h2>{batch.productName}</h2><p>{batch.notes}</p><div><span>{batch.reservedCount} reservados</span><strong>{batch.capacity - batch.reservedCount} livres</strong></div><span className="c-capacity"><i style={{ width: `${Math.min(100, batch.reservedCount / Math.max(1, batch.capacity) * 100)}%` }} /></span></article>)}</div><Panel title="Reservas"><div className="c-table-wrap"><table className="c-table"><thead><tr><th>Código</th><th>Cliente</th><th>Quantidade</th><th>Retirada</th><th>Contato</th></tr></thead><tbody>{(data?.reservations ?? []).map((reservation) => <tr key={reservation.id}><td><strong>{reservation.reservationCode}</strong></td><td>{reservation.customerName}</td><td>{reservation.quantity} un.</td><td>{time(reservation.pickupAt)}</td><td><a className="c-whatsapp" href={`https://wa.me/${reservation.phone}`} target="_blank" rel="noreferrer">WhatsApp</a></td></tr>)}</tbody></table></div></Panel></>}

        {view === "menu" && <Panel title={`${products.length} produtos`}><div className="c-product-list">{products.map((product) => <article key={product.id}><span className="c-product-icon"><Icon name={product.productType === "custom" ? "cake" : product.name.toLowerCase().includes("café") ? "coffee" : "bread"} /></span><div><strong>{product.name}</strong><small>{categoryNames.get(product.categoryId ?? "") ?? "Cardápio"}</small></div><b>{money(product.price)}</b><button className={`c-switch ${product.isAvailable ? "is-on" : ""}`} role="switch" aria-checked={product.isAvailable} onClick={() => void mutate(`/api/products/${product.id}`, { isAvailable: !product.isAvailable }, "PATCH")}><i /></button></article>)}</div></Panel>}

        {view === "customers" && <Panel title={`${customers.length} clientes`} action={<label className="c-search"><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente" /></label>}><div className="c-table-wrap"><table className="c-table"><thead><tr><th>Cliente</th><th>Pontos</th><th>Total gasto</th><th>Última compra</th><th /></tr></thead><tbody>{filteredCustomers.map((customer) => <tr key={customer.id}><td><strong>{customer.name}</strong><small>{customer.phone}</small></td><td>{customer.loyaltyPoints}</td><td>{money(customer.lifetimeSpend)}</td><td>{customer.lastOrderAt ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(customer.lastOrderAt)) : "—"}</td><td><a className="c-whatsapp" href={`https://wa.me/${customer.phone}`} target="_blank" rel="noreferrer">Chamar</a></td></tr>)}</tbody></table></div></Panel>}

        {view === "marketing" && <Panel title={`${coupons.length} cupons`}><div className="c-coupon-list">{coupons.map((coupon) => <article key={coupon.id}><span><Icon name="percent" /></span><div><strong>{coupon.title}</strong><small>{coupon.code} · {coupon.discountType === "percent" ? `${Number(coupon.discountValue)}%` : money(coupon.discountValue)}</small></div><p><strong>{coupon.redemptionCount}</strong><small>resgates</small></p><Status value={coupon.isActive ? "ready" : "cancelled"} /></article>)}</div></Panel>}

        {view === "strategy" && <Strategy />}
        <p className="c-dev-credit">
          <a href="https://wa.me/5518998133524" target="_blank" rel="noreferrer" aria-label="Falar com Murilo Mota no WhatsApp">
            Desenvolvido por Murilo Mota · 55 (18) 99813-3524
          </a>
        </p>
      </main>
    </div>

    <nav className="c-mobile-nav">{navigation.slice(0, 5).map((item) => <button key={item.id} className={view === item.id ? "is-active" : ""} onClick={() => go(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>

    {dialog === "order" && <Modal title="Novo pedido" onClose={() => setDialog(null)}><form className="c-form" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const ok = await mutate("/api/orders", { name: form.get("name"), phone: form.get("phone"), fulfillmentType: form.get("fulfillmentType"), items: [{ productId: form.get("productId"), quantity: Number(form.get("quantity")) }] }); if (ok) setDialog(null); }}><div><label>Nome<input required name="name" /></label><label>WhatsApp<input required name="phone" inputMode="tel" /></label></div><label>Produto<select name="productId">{products.filter((product) => product.isAvailable).map((product) => <option key={product.id} value={product.id}>{product.name} · {money(product.price)}</option>)}</select></label><div><label>Quantidade<input name="quantity" type="number" min="1" defaultValue="1" /></label><label>Tipo<select name="fulfillmentType"><option value="pickup">Retirada</option><option value="delivery">Entrega</option></select></label></div><button className="c-primary" disabled={busy}>{busy ? "Salvando…" : "Registrar pedido"}</button></form></Modal>}

    {dialog === "custom" && <Modal title="Nova encomenda" onClose={() => setDialog(null)}><form className="c-form" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const ok = await mutate("/api/custom-orders", { name: form.get("name"), phone: form.get("phone"), type: form.get("type"), eventDate: form.get("eventDate"), flavor: form.get("flavor"), quantity: Number(form.get("quantity")), totalAmount: Number(form.get("totalAmount")), fulfillmentType: "pickup", depositPercent: 40 }); if (ok) setDialog(null); }}><div><label>Nome<input required name="name" /></label><label>WhatsApp<input required name="phone" /></label></div><div><label>Tipo<select name="type"><option value="cake">Bolo</option><option value="party-kit">Kit festa</option><option value="savories">Salgados</option></select></label><label>Data<input required name="eventDate" type="date" min={new Date().toISOString().slice(0, 10)} /></label></div><label>Sabor ou detalhes<input name="flavor" /></label><div><label>Quantidade<input name="quantity" type="number" min="1" defaultValue="1" /></label><label>Valor total<input required name="totalAmount" type="number" min="1" step="0.01" /></label></div><button className="c-primary" disabled={busy}>{busy ? "Salvando…" : "Criar encomenda"}</button></form></Modal>}

    {dialog === "reservation" && <Modal title="Reservar fornada" onClose={() => setDialog(null)}><form className="c-form" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const ok = await mutate("/api/reservations", { batchId: form.get("batchId"), name: form.get("name"), phone: form.get("phone"), quantity: Number(form.get("quantity")) }); if (ok) setDialog(null); }}><label>Fornada<select name="batchId">{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.productName} · {time(batch.expectedAt)}</option>)}</select></label><div><label>Nome<input required name="name" /></label><label>WhatsApp<input required name="phone" /></label></div><label>Quantidade<input required name="quantity" type="number" min="1" max="30" defaultValue="6" /></label><button className="c-primary" disabled={busy}>{busy ? "Reservando…" : "Confirmar reserva"}</button></form></Modal>}

    {dialog === "coupon" && <Modal title="Novo cupom" onClose={() => setDialog(null)}><form className="c-form" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const ok = await mutate("/api/coupons", { title: form.get("title"), code: form.get("code"), discountType: form.get("discountType"), discountValue: Number(form.get("discountValue")), maxRedemptions: Number(form.get("maxRedemptions")) }); if (ok) setDialog(null); }}><div><label>Nome<input required name="title" /></label><label>Código<input required name="code" /></label></div><div><label>Tipo<select name="discountType"><option value="percent">Percentual</option><option value="fixed">Valor fixo</option></select></label><label>Desconto<input required name="discountValue" type="number" min="1" /></label></div><label>Limite de resgates<input name="maxRedemptions" type="number" min="1" defaultValue="50" /></label><button className="c-primary" disabled={busy}>{busy ? "Publicando…" : "Publicar cupom"}</button></form></Modal>}

    {toast && <div className="c-toast"><Icon name="check" size={17} />{toast}</div>}
  </div>;
}

function OrderList({ orders, onAdvance, full = false }: { orders: Order[]; onAdvance: (order: Order) => void; full?: boolean }) {
  if (!orders.length) return <Empty icon="receipt" title="Nenhum pedido por aqui." />;
  return <div className={`c-order-list ${full ? "is-full" : ""}`}>{orders.map((order) => <article key={order.id}><div className="c-order-id"><strong>{order.orderNumber}</strong><span>{time(order.createdAt)}</span></div><div className="c-order-customer"><strong>{order.customerName}</strong><span>{order.items.map((item) => `${item.quantity}× ${item.nameSnapshot}`).join(", ")}</span></div><strong className="c-order-total">{money(order.total)}</strong><Status value={order.status} />{!["delivered", "cancelled"].includes(order.status) && <button className="c-row-action" onClick={() => onAdvance(order)}>{order.status === "received" ? "Iniciar" : order.status === "preparing" ? "Pronto" : "Concluir"}</button>}</article>)}</div>;
}

function Strategy() {
  return <div className="c-strategy"><section className="c-project-intro"><div><span>Projeto unificado</span><h2>Um sistema para duas operações locais.</h2><p>O mesmo núcleo atende pedidos, clientes, cupons e fidelidade. Cada negócio ativa apenas o que precisa.</p></div><div><span><Icon name="shopping" /></span><strong>Rango</strong><small>Cardápio do dia e marmitas</small></div><div><span><Icon name="bread" /></span><strong>Pão na Chapa</strong><small>Fornadas e encomendas</small></div></section><div className="c-strategy-grid"><Panel title="Primeira entrega"><ul><li>Cardápio por período</li><li>Pedido próprio com Pix pendente</li><li>Reserva de fornada</li><li>Cupom rastreável</li></ul></Panel><Panel title="Segunda entrega"><ul><li>Encomenda com sinal</li><li>Agenda de produção</li><li>Clube de fidelidade</li><li>Contas corporativas</li></ul></Panel><Panel title="Antes de publicar"><ul><li>Confirmar telefone da fachada</li><li>Confirmar CEP e horários</li><li>Validar preços e capacidade</li><li>Escolher provedor de pagamento</li></ul></Panel></div><section className="c-research-note"><Icon name="info" /><div><strong>Dados públicos têm divergências.</strong><p>O telefone 99999-0107 aparece de forma consistente. CEP, horários de fim de semana e avaliações variam entre diretórios e precisam ser confirmados com a loja.</p><p><a href="https://example.com" target="_blank" rel="noreferrer">Facebook</a> · <a href="https://example.com" target="_blank" rel="noreferrer">Solutudo</a> · <a href="https://example.com" target="_blank" rel="noreferrer">Restaurant Guru</a></p></div></section></div>;
}
