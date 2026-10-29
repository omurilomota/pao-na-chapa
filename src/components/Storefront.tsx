'use client';

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

type Product = { id: string; name: string; description: string | null; price: string; imageUrl: string | null; productType: string; availabilityPeriods: string[]; isAvailable: boolean; isActive: boolean; isFeatured: boolean };
type Batch = { id: string; productName: string; label: string; expectedAt: string; capacity: number; reservedCount: number; status: string; notes: string | null };
type Coupon = { code: string; title: string; discountType: string; discountValue: string; isActive: boolean };
type ShopData = { tenant: { name: string; phone: string; email: string; address: string; city: string; state: string; settings: Record<string, unknown> }; products: Product[]; batches: Batch[]; coupons: Coupon[] };
type Period = "breakfast" | "lunch" | "afternoon";
type CartItem = { product: Product; quantity: number };

const money = (amount: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(amount));
const timeOf = (value: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));

function isShopOpen() {
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() * 60 + now.getMinutes();
  if (day === 0) return time >= 360 && time < 720;
  if (day === 6) return time >= 340 && time < 1020;
  return time >= 340 && time < 1140;
}

function ProductGlyph({ product }: { product: Product }) {
  const name = product.name.toLowerCase();
  const glyph = product.productType === "custom" ? "cake" : name.includes("café") ? "coffee" : name.includes("coxinha") || name.includes("queijo") ? "package" : "bread";
  return <span className={`store-product-glyph glyph-${product.productType}`}><Icon name={glyph} size={24} strokeWidth={1.55} /></span>;
}

export default function Storefront() {
  const [data, setData] = useState<ShopData | null>(null);
  const [period, setPeriod] = useState<Period>("breakfast");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [couponValue, setCouponValue] = useState("");
  const [dialog, setDialog] = useState<"reservation" | "custom" | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [successOrder, setSuccessOrder] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Não foi possível carregar o cardápio.");
      setData(await response.json() as ShopData);
    }).catch(() => setToast("Não foi possível carregar a vitrine. Atualize a página."));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const open = isShopOpen();
  const products = data?.products ?? [];
  const visibleProducts = useMemo(() => products.filter((product) => product.productType !== "custom" && product.isActive && product.isAvailable && (product.availabilityPeriods.includes("all") || product.availabilityPeriods.includes(period))), [products, period]);
  const items = Object.values(cart);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const deliveryFee = fulfillment === "delivery" && items.length ? 4.9 : 0;
  const activeCoupon = data?.coupons.find((coupon) => coupon.isActive);
  const matchedCoupon = data?.coupons.find((coupon) => coupon.isActive && coupon.code.toUpperCase() === couponValue.trim().toUpperCase());
  const couponDiscount = matchedCoupon ? Math.min(subtotal, matchedCoupon.discountType === "percent" ? subtotal * Number(matchedCoupon.discountValue) / 100 : Number(matchedCoupon.discountValue)) : 0;
  const nextBatch = data?.batches.find((batch) => batch.reservedCount < batch.capacity) ?? data?.batches[0];

  function add(product: Product) {
    setCart((current) => ({ ...current, [product.id]: { product, quantity: (current[product.id]?.quantity ?? 0) + 1 } }));
    setToast(`${product.name} adicionado à cestinha.`);
  }
  function changeQuantity(id: string, change: number) {
    setCart((current) => {
      const item = current[id]; if (!item) return current;
      const quantity = item.quantity + change;
      if (quantity <= 0) { const next = { ...current }; delete next[id]; return next; }
      return { ...current, [id]: { ...item, quantity } };
    });
  }
  async function copyCode() {
    if (!activeCoupon) return;
    setCouponValue(activeCoupon.code);
    try { await navigator.clipboard.writeText(activeCoupon.code); setCopied(true); setToast(`Cupom ${activeCoupon.code} copiado e pronto para usar!`); window.setTimeout(() => setCopied(false), 2200); }
    catch { setToast(`Cupom ${activeCoupon.code} selecionado para o próximo pedido.`); }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: form.get("name"), phone: form.get("phone"), email: form.get("email"), fulfillmentType: fulfillment,
        scheduledFor: form.get("scheduledFor") || undefined, notes: form.get("notes"), couponCode: couponValue,
        items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      }) });
      const result = await response.json() as { error?: string; order?: { orderNumber: string } };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível enviar o pedido.");
      setSuccessOrder(result.order?.orderNumber ?? "Pedido confirmado");
      setCart({});
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível enviar o pedido."); }
    finally { setBusy(false); }
  }

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: form.get("batchId"), name: form.get("name"), phone: form.get("phone"), quantity: Number(form.get("quantity")) }) });
      const result = await response.json() as { error?: string; reservation?: { reservationCode: string } };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível reservar.");
      setDialog(null); setToast(`Reserva ${result.reservation?.reservationCode ?? "confirmada"}. Te esperamos na fornada!`);
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível reservar."); }
    finally { setBusy(false); }
  }

  async function submitCustomOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/custom-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), type: form.get("type"), flavor: form.get("flavor"), quantity: Number(form.get("quantity")), eventDate: form.get("eventDate"), fulfillmentType: form.get("fulfillmentType"), totalAmount: Number(form.get("totalAmount")), message: form.get("message"), depositPercent: 40 }) });
      const result = await response.json() as { error?: string; order?: { id: string } };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível enviar a encomenda.");
      setDialog(null); setToast("Pedido de encomenda recebido! Vamos confirmar os detalhes pelo WhatsApp.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível enviar a encomenda."); }
    finally { setBusy(false); }
  }

  return <main className="storefront-page">
    <header className="store-header"><Link href="/loja" className="store-brand"><span className="store-brand-mark"><Icon name="bread" size={22} /></span><span><strong>pão na chapa</strong><small>PADARIA & DOCERIA</small></span></Link><nav className="store-nav"><a href="#cardapio">Cardápio</a><a href="#fornada">Fornadas</a><a href="#encomendas">Encomendas</a></nav><div className="store-header-actions"><span className={`store-open-pill ${open ? "" : "store-closed"}`}><i />{open ? "Aberto agora" : "Fechado agora"}</span><a className="store-account" href="#clube"><Icon name="star" size={16} /> Clube</a><Link href="/" className="store-admin-link">Painel <Icon name="arrow" size={14} /></Link></div><button className="store-mobile-cart" onClick={() => setCartOpen(true)} aria-label="Abrir cestinha"><Icon name="cart" />{itemCount > 0 && <span>{itemCount}</span>}</button></header>

    <section className="store-hero" style={{ backgroundImage: "linear-gradient(90deg, rgba(38,28,22,.78) 0%, rgba(38,28,22,.56) 44%, rgba(38,28,22,.06) 100%), url('/images/vitrine-pao-na-chapa.jpg')" }}>
      <div className="store-hero-content"><span className="store-hero-kicker"><span /> NOVO CONCEITO EM PÃES E DOCES</span><h1>O cheiro de pão<br />quentinho <em>chama.</em></h1><p>Feito aqui, pertinho. Escolha o seu café da manhã e passe para buscar sem fila.</p><div className="store-hero-buttons"><a href="#cardapio" className="store-button-primary">Pedir agora <Icon name="arrow" size={16} /></a><button className="store-button-text" onClick={() => setDialog("custom")}>Encomendar para uma festa <Icon name="chevron" size={15} /></button></div><div className="store-hero-note"><Icon name="pin" size={15} /> Rua das Flores, 180 · Centro</div></div>
      <div className="hero-photo-label"><span>01</span><i /> Feito fresco, todos os dias</div>
    </section>

    {activeCoupon && <button className="store-promo-strip" onClick={copyCode}><span className="promo-icon"><Icon name="percent" size={17} /></span><span><strong>Um bom dia merece um mimo.</strong><small>{activeCoupon.title} · {activeCoupon.discountType === "percent" ? `${activeCoupon.discountValue}% OFF` : `${money(activeCoupon.discountValue)} OFF`}</small></span><span className="promo-code">{copied ? <><Icon name="check" size={14} /> COPIADO</> : <>{activeCoupon.code} <Icon name="copy" size={14} /></>}</span><span className="promo-ends">Toque para copiar</span></button>}

    <section className="store-benefits"><div><span className="benefit-icon"><Icon name="flame" /></span><span><strong>Fornada fresca</strong><small>Todo dia, várias vezes</small></span></div><div><span className="benefit-icon"><Icon name="clock" /></span><span><strong>Retirada sem fila</strong><small>Peça antes, passe e leve</small></span></div><div><span className="benefit-icon"><Icon name="heart" /></span><span><strong>Feito com carinho</strong><small>Receitas da nossa casa</small></span></div><div><span className="benefit-icon"><Icon name="star" /></span><span><strong>Vantagem de verdade</strong><small>Peça direto com a gente</small></span></div></section>

    <section className="store-section menu-section" id="cardapio"><div className="store-section-heading"><div><span className="store-eyebrow">FEITO AGORA, PRA VOCÊ</span><h2>O que vai ser hoje?</h2><p>Escolha seu momento. A gente prepara na hora.</p></div><a className="store-location-link" href="https://maps.google.com/?q=Rua+das+Flores+180+Junqueiropolis+SP" target="_blank" rel="noreferrer"><Icon name="pin" size={15} /> Ver como chegar <Icon name="external" size={13} /></a></div>
      <div className="period-tabs">{([{ id: "breakfast", title: "Café da manhã", time: "05h40 — 10h" }, { id: "lunch", title: "Almoço", time: "11h — 14h" }, { id: "afternoon", title: "Café da tarde", time: "15h — 19h" }] as { id: Period; title: string; time: string }[]).map((entry) => <button key={entry.id} onClick={() => setPeriod(entry.id)} className={`period-tab ${period === entry.id ? "period-tab-active" : ""}`}><span>{entry.title}</span><small>{entry.time}</small>{period === entry.id && <i />}</button>)}</div>
      {visibleProducts.length ? <div className="store-product-grid">{visibleProducts.map((product, index) => <article className={`store-product-card ${product.isFeatured ? "store-product-featured" : ""}`} key={product.id}><div className={`store-product-image store-image-${index % 4}`} style={product.imageUrl ? { backgroundImage: `url('${product.imageUrl}')` } : undefined}><span className="product-fresh-tag"><Icon name="flame" size={12} /> Feito na casa</span><ProductGlyph product={product} /></div><div className="store-product-info"><div><h3>{product.name}</h3>{product.description && <p>{product.description}</p>}</div><div className="store-product-bottom"><strong>{money(product.price)}</strong><button className="add-product-button" onClick={() => add(product)} aria-label={`Adicionar ${product.name}`}><Icon name="plus" size={19} /></button></div></div></article>)}</div> : <div className="store-empty"><span><Icon name="coffee" /></span><strong>Estamos preparando o próximo momento.</strong><p>Escolha outro período para ver o cardápio.</p></div>}
      <div className="store-fresh-note"><span className="fresh-dot" /><span>O cardápio muda ao longo do dia. Um item esgotado some daqui automaticamente.</span><a href={`https://wa.me/5518999990107?text=${encodeURIComponent("Oi! Pode me dizer o que saiu quentinho agora?")}`} target="_blank" rel="noreferrer">Perguntar pelo WhatsApp <Icon name="arrow" size={14} /></a></div>
    </section>

    <section className="batch-public-section" id="fornada"><div className="batch-public-photo" style={{ backgroundImage: "url('/images/vitrine-pao-na-chapa.jpg')" }}><span className="baking-sticker"><Icon name="flame" size={15} /> DIRETO DO FORNO</span></div><div className="batch-public-copy"><span className="store-eyebrow">PEGA QUENTINHO, SEM ESPERAR</span><h2>Da fornada<br />para a sua mesa.</h2><p>Reserve o pão antes de sair do forno. A gente separa, você passa no horário e não fica sem.</p>{nextBatch ? <div className="next-batch-card"><span className="next-batch-icon"><Icon name="bread" /></span><span><small>PRÓXIMA FORNADA</small><strong>{nextBatch.productName}</strong></span><span className="next-batch-time">{timeOf(nextBatch.expectedAt)}</span></div> : <div className="next-batch-card"><span className="next-batch-icon"><Icon name="bread" /></span><span><small>FORNADAS DO DIA</small><strong>Consulte a equipe</strong></span></div>}<button className="store-button-dark" onClick={() => setDialog("reservation")}>Reservar minha fornada <Icon name="arrow" size={16} /></button><small className="batch-remaining">{nextBatch ? `${Math.max(0, nextBatch.capacity - nextBatch.reservedCount)} unidades disponíveis nesta fornada` : "Consulte a disponibilidade na loja"}</small></div></section>

    <section className="party-section" id="encomendas"><div className="party-copy"><span className="store-eyebrow">CELEBRAÇÃO COM SABOR DE CASA</span><h2>Tem festa chegando?<br /><em>A gente cuida da mesa.</em></h2><p>Bolos confeitados, mini salgados, kits festa, pizzas, hot-dog e pães recheados. Encomende com data e deixe o resto com a gente.</p><div className="party-tags"><span><Icon name="cake" size={14} /> Bolos & tortas</span><span><Icon name="package" size={14} /> Kits festa</span><span><Icon name="calendar" size={14} /> Data garantida</span></div><button className="store-button-primary" onClick={() => setDialog("custom")}>Montar minha encomenda <Icon name="arrow" size={16} /></button></div><div className="party-photo"><img src="/images/vitrine-pao-na-chapa.jpg" alt="Pães e quitutes preparados na padaria" /><div className="party-note"><span className="party-note-icon"><Icon name="sparkle" /></span><span><strong>Feito para o seu momento</strong><small>Converse com a gente sobre sabores</small></span></div></div></section>

    <section className="club-section" id="clube"><div className="club-stamp"><Icon name="bread" size={24} /><span>10ª</span></div><div className="club-copy"><span className="store-eyebrow">CADA VISITA VALE MAIS</span><h2>O décimo pão na chapa<br />é por nossa conta.</h2><p>Entre para o Clube do Pão Quente: acumule pontos a cada compra e ganhe um café da manhã completo.</p></div><button className="club-join-button" onClick={() => setToast("O Clube do Pão Quente estará disponível em breve. Peça pelo WhatsApp para entrar na lista!")}>Quero fazer parte <Icon name="arrow" size={16} /></button></section>

    <section className="store-info-section"><div className="store-info-main"><div className="store-brand store-brand-footer"><span className="store-brand-mark"><Icon name="bread" size={22} /></span><span><strong>pão na chapa</strong><small>PADARIA & DOCERIA</small></span></div><p>O bom dia mora aqui. Pães, doces e momentos feitos com carinho no coração de Junqueirópolis.</p><div className="store-social"><a href={`https://wa.me/5518999990107`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><Icon name="whatsapp" /></a><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="camera" /></a></div></div><div className="store-info-col"><strong>Encontre a gente</strong><span><Icon name="pin" size={15} /> Rua das Flores, 180<br />Centro · Junqueirópolis/SP</span><a href="https://maps.google.com/?q=Rua+das+Flores+180+Junqueiropolis+SP" target="_blank" rel="noreferrer">Abrir no mapa <Icon name="external" size={13} /></a></div><div className="store-info-col"><strong>Horários</strong><span>Segunda a sexta <b>05h40 — 19h</b></span><span>Sábado <b>05h40 — 17h</b></span><span>Domingos e feriados <b>06h — 12h</b></span></div><div className="store-info-col"><strong>Fale com a gente</strong><a href="tel:+5518999990107"><Icon name="phone" size={14} /> (18) 99999-0107</a><a href="mailto:contato@exemplo.com">contato@exemplo.com</a><small>Telefone confirmado antes de divulgar</small></div></section>
    <footer className="store-footer"><span>© 2026 Pão na Chapa · Junqueirópolis, SP</span><span>Feito com <Icon name="heart" size={12} /> para quem ama pão quentinho</span></footer>

    {itemCount > 0 && !cartOpen && <button className="floating-cart" onClick={() => { setSuccessOrder(null); setCartOpen(true); }}><span className="floating-cart-icon"><Icon name="cart" size={18} /><i>{itemCount}</i></span><span><strong>Ver minha cestinha</strong><small>{itemCount} {itemCount === 1 ? "item" : "itens"}</small></span><b>{money(subtotal - couponDiscount + deliveryFee)}</b><Icon name="arrow" size={16} /></button>}

    {cartOpen && <div className="modal-scrim cart-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCartOpen(false); setSuccessOrder(null); } }}><section className="cart-drawer" role="dialog" aria-modal="true" aria-label="Sua cestinha"><div className="cart-drawer-head"><div><span className="store-eyebrow">SEU PEDIDO</span><h2>{successOrder ? "Pedido recebido!" : "Sua cestinha"}</h2></div><button className="icon-button quiet" onClick={() => { setCartOpen(false); setSuccessOrder(null); }} aria-label="Fechar"><Icon name="close" /></button></div>{successOrder ? <div className="order-success"><span><Icon name="check" size={27} /></span><p className="store-eyebrow">TUDO CERTO</p><h3>{successOrder}</h3><p>Recebemos seu pedido! A equipe vai confirmar o preparo pelo WhatsApp. Obrigado por pedir direto com a gente.</p><button className="store-button-primary" onClick={() => { setCartOpen(false); setSuccessOrder(null); }}>Voltar para a loja <Icon name="arrow" size={15} /></button></div> : <>{items.length ? <><div className="cart-items">{items.map((item) => <div className="cart-item" key={item.product.id}><ProductGlyph product={item.product} /><div className="cart-item-copy"><strong>{item.product.name}</strong><small>{money(item.product.price)} cada</small><div className="quantity-control"><button onClick={() => changeQuantity(item.product.id, -1)} aria-label="Diminuir quantidade">−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.product.id, 1)} aria-label="Aumentar quantidade">+</button></div></div><strong className="cart-line-total">{money(Number(item.product.price) * item.quantity)}</strong></div>)}</div><form className="store-checkout-form" onSubmit={submitOrder}><div className="fulfillment-switch"><button type="button" className={fulfillment === "pickup" ? "fulfillment-active" : ""} onClick={() => setFulfillment("pickup")}><Icon name="store" size={15} /> Retirada grátis</button><button type="button" className={fulfillment === "delivery" ? "fulfillment-active" : ""} onClick={() => setFulfillment("delivery")}><Icon name="truck" size={15} /> Entrega + R$ 4,90</button></div><div className="form-grid"><label>Seu nome<input required name="name" placeholder="Nome e sobrenome" /></label><label>WhatsApp<input required name="phone" inputMode="tel" placeholder="(18) 99999-9999" /></label></div><label>Email <span className="optional-label">opcional</span><input name="email" type="email" placeholder="voce@exemplo.com" /></label><label>Cupom <span className="optional-label">toque no cupom da página para copiar</span><input name="couponCode" value={couponValue} onChange={(event) => setCouponValue(event.target.value.toUpperCase())} placeholder="BOMDIA15" /></label><div className="form-grid"><label>Horário de retirada <span className="optional-label">opcional</span><input name="scheduledFor" type="datetime-local" /></label><label>Observação <span className="optional-label">opcional</span><input name="notes" placeholder="Ex.: sem açúcar" /></label></div><div className="cart-totals"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>{couponDiscount > 0 && <div className="coupon-total"><span>Cupom {matchedCoupon?.code}</span><strong>− {money(couponDiscount)}</strong></div>}<div><span>Entrega</span><strong>{deliveryFee ? money(deliveryFee) : "Grátis"}</strong></div><div className="cart-total-line"><span>Total</span><strong>{money(subtotal - couponDiscount + deliveryFee)}</strong></div></div><button className="store-submit-order" type="submit" disabled={busy}>{busy ? "Enviando pedido…" : <>Confirmar pedido <Icon name="arrow" size={16} /></>}</button><p className="checkout-note"><Icon name="info" size={14} /> A equipe confirma o pagamento e o prazo pelo WhatsApp.</p></form></> : <div className="cart-empty"><span><Icon name="cart" /></span><h3>Sua cestinha está vazia.</h3><p>Escolha algo gostoso do cardápio para começar.</p><button className="store-button-primary" onClick={() => setCartOpen(false)}>Voltar ao cardápio</button></div>}</>}</section></div>}

    {dialog === "reservation" && <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><section className="modal-card store-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><p className="eyebrow">RETIRADA EXPRESSA</p><h2>Reserve uma fornada</h2></div><button className="icon-button quiet" onClick={() => setDialog(null)} aria-label="Fechar"><Icon name="close" /></button></div><form className="form-stack" onSubmit={submitReservation}><div className="reservation-hint"><span className="hint-icon"><Icon name="flame" /></span><div><strong>O cheirinho chega antes da fila.</strong><small>Separe o pão quente e retire no horário da fornada.</small></div></div><label>Escolha a fornada<select name="batchId" required>{(data?.batches ?? []).map((batch) => <option key={batch.id} value={batch.id}>{batch.productName} · {timeOf(batch.expectedAt)} · {Math.max(0, batch.capacity - batch.reservedCount)} livres</option>)}</select></label><div className="form-grid"><label>Seu nome<input required name="name" placeholder="Nome e sobrenome" /></label><label>WhatsApp<input required name="phone" inputMode="tel" placeholder="(18) 99999-9999" /></label></div><label>Quantidade<input required name="quantity" type="number" min="1" max="30" defaultValue="6" /></label><div className="modal-footer"><span className="form-note">Capacidade limitada</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Reservando…" : "Confirmar reserva"}</button></div></form></section></div>}

    {dialog === "custom" && <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><section className="modal-card store-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><p className="eyebrow">CELEBRE COM A GENTE</p><h2>Conte sua ideia pra nós.</h2></div><button className="icon-button quiet" onClick={() => setDialog(null)} aria-label="Fechar"><Icon name="close" /></button></div><form className="form-stack" onSubmit={submitCustomOrder}><div className="form-grid"><label>Seu nome<input required name="name" placeholder="Nome e sobrenome" /></label><label>WhatsApp<input required name="phone" inputMode="tel" placeholder="(18) 99999-9999" /></label></div><div className="form-grid"><label>O que você precisa?<select name="type"><option value="cake">Bolo confeitado</option><option value="party-kit">Kit festa</option><option value="savories">Mini salgados</option><option value="filled-bread">Pão recheado</option></select></label><label>Data do evento<input required name="eventDate" type="date" min={new Date().toISOString().slice(0, 10)} /></label></div><div className="form-grid"><label>Sabor / detalhes<input name="flavor" placeholder="Ex.: Ninho com morango" /></label><label>Quantidade<input name="quantity" type="number" min="1" defaultValue="1" /></label></div><div className="form-grid"><label>Valor estimado (R$)<input required name="totalAmount" type="number" min="1" step="0.01" placeholder="250,00" /></label><label>Entrega<select name="fulfillmentType"><option value="pickup">Retirada</option><option value="delivery">Entrega</option></select></label></div><label>Mensagem / observações<input name="message" placeholder="Texto no bolo, restrições, etc." /></label><div className="deposit-callout"><Icon name="wallet" size={17} /><span><strong>40% de sinal para reservar a data</strong><small>O valor e o pagamento são confirmados pela equipe no WhatsApp.</small></span></div><div className="modal-footer"><span className="form-note"><Icon name="calendar" size={14} /> Data consultada na agenda</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar encomenda"}</button></div></form></section></div>}

    {toast && <div className="toast-message"><span className="toast-check"><Icon name="check" size={15} /></span>{toast}</div>}
  </main>;
}
