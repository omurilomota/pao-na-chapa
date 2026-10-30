'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

type Product = { id: string; name: string; description: string | null; price: string; imageUrl: string | null; productType: string; availabilityPeriods: string[]; isAvailable: boolean; isActive: boolean };
type Batch = { id: string; productName: string; expectedAt: string; capacity: number; reservedCount: number };
type Coupon = { code: string; title: string; discountType: string; discountValue: string; isActive: boolean };
type StoreData = { products: Product[]; batches: Batch[]; coupons: Coupon[] };
type Period = "breakfast" | "lunch" | "afternoon";
type CartItem = { product: Product; quantity: number };
type Dialog = "cart" | "reservation" | "custom" | null;

const money = (value: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const time = (value: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));

const periods: Array<{ id: Period; label: string; hours: string }> = [
  { id: "breakfast", label: "Manhã", hours: "5h40–10h" },
  { id: "lunch", label: "Almoço", hours: "11h–14h" },
  { id: "afternoon", label: "Tarde", hours: "15h–19h" },
];

function shopIsOpen() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (now.getDay() === 0) return minutes >= 360 && minutes < 720;
  if (now.getDay() === 6) return minutes >= 340 && minutes < 1020;
  return minutes >= 340 && minutes < 1140;
}

function ProductIcon({ product }: { product: Product }) {
  const name = product.name.toLowerCase();
  const icon: IconName = product.productType === "custom" ? "cake" : name.includes("café") ? "coffee" : name.includes("coxinha") ? "package" : "bread";
  return <span className="s-product-icon"><Icon name={icon} /></span>;
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="s-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={`s-modal ${wide ? "is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button onClick={onClose} aria-label="Fechar"><Icon name="close" /></button></header>{children}</section></div>;
}

export default function CompactStorefront() {
  const [data, setData] = useState<StoreData | null>(null);
  const [period, setPeriod] = useState<Period>("breakfast");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [dialog, setDialog] = useState<Dialog>(null);
  const [couponCode, setCouponCode] = useState("");
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => { fetch("/api/dashboard", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(); setData(await response.json() as StoreData); }).catch(() => setToast("Não foi possível carregar o cardápio.")); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(timer); }, [toast]);

  const products = data?.products ?? [];
  const batches = data?.batches ?? [];
  const coupons = data?.coupons ?? [];
  const menuProducts = useMemo(() => products.filter((product) => product.productType !== "custom" && product.isActive && product.isAvailable && (product.availabilityPeriods.includes("all") || product.availabilityPeriods.includes(period))), [products, period]);
  const items = Object.values(cart);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const matchedCoupon = coupons.find((coupon) => coupon.isActive && coupon.code.toUpperCase() === couponCode.trim().toUpperCase());
  const discount = matchedCoupon ? Math.min(subtotal, matchedCoupon.discountType === "percent" ? subtotal * Number(matchedCoupon.discountValue) / 100 : Number(matchedCoupon.discountValue)) : 0;
  const deliveryFee = delivery === "delivery" && items.length ? 4.9 : 0;
  const total = subtotal - discount + deliveryFee;
  const nextBatch = batches.find((batch) => batch.capacity > batch.reservedCount) ?? batches[0];
  const featuredCoupon = coupons.find((coupon) => coupon.isActive);

  function add(product: Product) {
    setCart((current) => ({ ...current, [product.id]: { product, quantity: (current[product.id]?.quantity ?? 0) + 1 } }));
    setToast(`${product.name} foi adicionado.`);
  }
  function updateQuantity(id: string, delta: number) {
    setCart((current) => {
      const item = current[id];
      if (!item) return current;
      if (item.quantity + delta <= 0) { const copy = { ...current }; delete copy[id]; return copy; }
      return { ...current, [id]: { ...item, quantity: item.quantity + delta } };
    });
  }
  function openCart() { setOrderNumber(""); setDialog("cart"); }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), fulfillmentType: delivery, couponCode, notes: form.get("notes"), items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })) }) });
      const result = await response.json() as { error?: string; order?: { orderNumber: string } };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível enviar o pedido.");
      setOrderNumber(result.order?.orderNumber ?? "Pedido confirmado"); setCart({});
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível enviar o pedido."); }
    finally { setBusy(false); }
  }

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: form.get("batchId"), name: form.get("name"), phone: form.get("phone"), quantity: Number(form.get("quantity")) }) });
      const result = await response.json() as { error?: string; reservation?: { reservationCode: string } };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível reservar.");
      setDialog(null); setToast(`Reserva ${result.reservation?.reservationCode ?? "confirmada"}.`);
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível reservar."); }
    finally { setBusy(false); }
  }

  async function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/custom-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), type: form.get("type"), eventDate: form.get("eventDate"), flavor: form.get("flavor"), quantity: Number(form.get("quantity")), totalAmount: Number(form.get("totalAmount")), fulfillmentType: "pickup", depositPercent: 40 }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível enviar a encomenda.");
      setDialog(null); setToast("Encomenda recebida. Vamos confirmar pelo WhatsApp.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível enviar a encomenda."); }
    finally { setBusy(false); }
  }

  return <main className="s-page">
    <header className="s-header"><a className="s-logo" href="#inicio"><span><Icon name="bread" /></span><div><strong>Pão na Chapa</strong><small>Padaria e doceria</small></div></a><nav className={mobileMenu ? "is-open" : ""}><a href="#cardapio" onClick={() => setMobileMenu(false)}>Cardápio</a><a href="#servicos" onClick={() => setMobileMenu(false)}>Fornadas e encomendas</a><a href="#contato" onClick={() => setMobileMenu(false)}>Contato</a></nav><div className="s-header-actions"><span className={shopIsOpen() ? "is-open" : ""}><i />{shopIsOpen() ? "Aberto" : "Fechado"}</span><button className="s-cart-button" onClick={openCart}><Icon name="cart" /><b>{itemCount}</b><em>{money(total)}</em></button><button className="s-menu-button" onClick={() => setMobileMenu((current) => !current)} aria-label="Abrir menu"><Icon name={mobileMenu ? "close" : "menu"} /></button></div></header>

    <section className="s-hero" id="inicio"><div className="s-hero-photo" style={{ backgroundImage: "url('/images/vitrine-pao-na-chapa.jpg')" }} /><div className="s-hero-copy"><span>Bom dia, Junqueirópolis.</span><h1>Pão quente.<br />Café passado na hora.</h1><p>Faça seu pedido pelo nosso canal e retire sem fila no balcão.</p><div><a href="#cardapio" className="s-primary">Ver cardápio</a><button onClick={() => setDialog("reservation")} className="s-secondary">Reservar fornada</button></div><small><Icon name="pin" size={16} />Rua das Flores, 180 · Centro</small></div></section>

    <section className="s-info"><div><Icon name="clock" /><span><strong>Seg–sex</strong><small>5h40–19h</small></span></div><div><Icon name="store" /><span><strong>Retirada no balcão</strong><small>Peça antes e evite a fila</small></span></div><div><Icon name="phone" /><span><strong>(18) 99999-0107</strong><small>Atendimento pelo WhatsApp</small></span></div>{featuredCoupon && <button onClick={() => { setCouponCode(featuredCoupon.code); setToast(`Cupom ${featuredCoupon.code} selecionado.`); }}><Icon name="percent" /><span><strong>{featuredCoupon.code}</strong><small>{featuredCoupon.title}</small></span></button>}</section>

    <section className="s-menu-section" id="cardapio"><div className="s-section-head"><div><h2>Cardápio</h2><p>Mostramos apenas o que está disponível neste período.</p></div><div className="s-periods">{periods.map((entry) => <button key={entry.id} className={period === entry.id ? "is-active" : ""} onClick={() => setPeriod(entry.id)}><strong>{entry.label}</strong><small>{entry.hours}</small></button>)}</div></div>{data === null ? <div className="s-loading">Carregando cardápio…</div> : menuProducts.length ? <div className="s-product-grid">{menuProducts.map((product) => <article key={product.id} className="s-product"><div className="s-product-media">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <ProductIcon product={product} />}</div><div className="s-product-copy"><div><h3>{product.name}</h3><p>{product.description}</p></div><footer><strong>{money(product.price)}</strong><button onClick={() => add(product)}><Icon name="plus" size={17} />Adicionar</button></footer></div></article>)}</div> : <div className="s-loading">O cardápio deste período está sendo preparado.</div>}</section>

    <section className="s-services" id="servicos"><article><div className="s-service-icon"><Icon name="oven" /></div><div><h2>Reserve a próxima fornada</h2><p>Escolha a quantidade e passe para buscar no horário.</p>{nextBatch && <span>Próxima: <strong>{nextBatch.productName} às {time(nextBatch.expectedAt)}</strong></span>}<button className="s-primary" onClick={() => setDialog("reservation")}>Fazer reserva</button></div></article><article><div className="s-service-icon"><Icon name="cake" /></div><div><h2>Encomendas para festas</h2><p>Bolos, salgados e kits com data organizada e sinal de 40%.</p><span>O valor final é confirmado pela equipe.</span><button className="s-secondary" onClick={() => setDialog("custom")}>Pedir orçamento</button></div></article></section>

    <section className="s-club"><div><Icon name="star" /><span><strong>Clube do Pão Quente</strong><small>Acumule pontos quando pedir direto com a padaria.</small></span></div><button onClick={() => setToast("Peça pelo WhatsApp para entrar na lista do clube.")}>Quero participar</button></section>

    <footer className="s-footer" id="contato"><div><a className="s-logo" href="#inicio"><span><Icon name="bread" /></span><div><strong>Pão na Chapa</strong><small>Padaria e doceria</small></div></a><p>Pães, doces e café no Centro de Junqueirópolis.</p></div><div><strong>Endereço</strong><p>Rua das Flores, 180<br />Centro · Junqueirópolis/SP</p><a href="https://maps.google.com/?q=Rua+das+Flores+180+Junqueiropolis+SP" target="_blank" rel="noreferrer">Abrir no mapa</a></div><div><strong>Horários informados</strong><p>Seg–sex: 5h40–19h<br />Sáb: 5h40–17h<br />Dom/feriados: 6h–12h</p></div><div><strong>Contato</strong><a href="https://wa.me/5518999990107" target="_blank" rel="noreferrer">WhatsApp: (18) 99999-0107</a><a href="mailto:contato@exemplo.com">Enviar e-mail</a><Link href="/">Acessar painel</Link></div><div className="s-footer-credit"><a href="https://wa.me/5518998133524" target="_blank" rel="noreferrer" aria-label="Falar com Murilo Mota no WhatsApp">Desenvolvido por Murilo Mota · 55 (18) 99813-3524</a></div></footer>

    {itemCount > 0 && <button className="s-mobile-cart" onClick={openCart}><span><Icon name="cart" />{itemCount} {itemCount === 1 ? "item" : "itens"}</span><strong>{money(total)}</strong></button>}

    {dialog === "cart" && <Modal title="Seu pedido" onClose={() => setDialog(null)} wide>{orderNumber ? <div className="s-success"><span><Icon name="check" /></span><h3>Pedido recebido</h3><strong>{orderNumber}</strong><p>A padaria vai confirmar o preparo e o pagamento pelo WhatsApp.</p><button className="s-primary" onClick={() => setDialog(null)}>Voltar à loja</button></div> : items.length ? <div className="s-checkout"><div className="s-cart-items">{items.map((item) => <article key={item.product.id}><ProductIcon product={item.product} /><div><strong>{item.product.name}</strong><small>{money(item.product.price)} cada</small></div><div className="s-quantity"><button onClick={() => updateQuantity(item.product.id, -1)}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.product.id, 1)}>+</button></div><strong>{money(Number(item.product.price) * item.quantity)}</strong></article>)}</div><form className="s-form" onSubmit={submitOrder}><div className="s-delivery"><button type="button" className={delivery === "pickup" ? "is-active" : ""} onClick={() => setDelivery("pickup")}><Icon name="store" />Retirada</button><button type="button" className={delivery === "delivery" ? "is-active" : ""} onClick={() => setDelivery("delivery")}><Icon name="truck" />Entrega + R$ 4,90</button></div><div className="s-field-row"><label>Seu nome<input required name="name" /></label><label>WhatsApp<input required name="phone" inputMode="tel" /></label></div><div className="s-field-row"><label>Cupom<input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Código" /></label><label>Observação<input name="notes" placeholder="Opcional" /></label></div><div className="s-totals"><p><span>Subtotal</span><strong>{money(subtotal)}</strong></p>{discount > 0 && <p className="is-discount"><span>Desconto</span><strong>− {money(discount)}</strong></p>}<p><span>Entrega</span><strong>{deliveryFee ? money(deliveryFee) : "Grátis"}</strong></p><p><span>Total</span><strong>{money(total)}</strong></p></div><button className="s-primary s-submit" disabled={busy}>{busy ? "Enviando…" : "Confirmar pedido"}</button><small className="s-checkout-note">Pagamento e prazo são confirmados pelo WhatsApp.</small></form></div> : <div className="s-success"><span><Icon name="cart" /></span><h3>Sua cesta está vazia</h3><p>Adicione um produto para começar.</p><button className="s-primary" onClick={() => setDialog(null)}>Ver cardápio</button></div>}</Modal>}

    {dialog === "reservation" && <Modal title="Reservar fornada" onClose={() => setDialog(null)}><form className="s-form" onSubmit={submitReservation}><label>Fornada<select name="batchId">{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.productName} · {time(batch.expectedAt)} · {batch.capacity - batch.reservedCount} livres</option>)}</select></label><div className="s-field-row"><label>Seu nome<input required name="name" /></label><label>WhatsApp<input required name="phone" inputMode="tel" /></label></div><label>Quantidade<input required name="quantity" type="number" min="1" max="30" defaultValue="6" /></label><button className="s-primary s-submit" disabled={busy}>{busy ? "Reservando…" : "Confirmar reserva"}</button></form></Modal>}

    {dialog === "custom" && <Modal title="Pedir uma encomenda" onClose={() => setDialog(null)}><form className="s-form" onSubmit={submitCustom}><div className="s-field-row"><label>Seu nome<input required name="name" /></label><label>WhatsApp<input required name="phone" /></label></div><div className="s-field-row"><label>Tipo<select name="type"><option value="cake">Bolo</option><option value="party-kit">Kit festa</option><option value="savories">Salgados</option></select></label><label>Data<input required name="eventDate" type="date" min={new Date().toISOString().slice(0, 10)} /></label></div><label>Sabor ou detalhes<input name="flavor" /></label><div className="s-field-row"><label>Quantidade<input name="quantity" type="number" min="1" defaultValue="1" /></label><label>Valor estimado<input required name="totalAmount" type="number" min="1" step="0.01" /></label></div><p className="s-form-note">A data é reservada após o sinal de 40%. A equipe confirma o orçamento pelo WhatsApp.</p><button className="s-primary s-submit" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitação"}</button></form></Modal>}

    {toast && <div className="s-toast"><Icon name="check" />{toast}</div>}
  </main>;
}
