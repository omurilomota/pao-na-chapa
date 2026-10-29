import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "grid" | "receipt" | "cake" | "oven" | "menu" | "users" | "star" | "megaphone"
  | "layers" | "chevron" | "arrow" | "search" | "bell" | "plus" | "trend" | "clock"
  | "bread" | "coffee" | "shopping" | "pin" | "phone" | "external" | "sparkle" | "close"
  | "heart" | "cart" | "flame" | "check" | "package" | "gift" | "chart" | "truck"
  | "filter" | "info" | "copy" | "sun" | "crown" | "rotate" | "wallet" | "calendar"
  | "arrow-up" | "arrow-down" | "whatsapp" | "camera" | "store" | "percent" | "lightning"
  | "dots" | "home" | "logout" | "target" | "layers-plus" | "book" | "sparkles";

const artwork: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
  receipt: <><path d="M5 3.5h14v17l-3.5-2-3.5 2-3.5-2-3.5 2z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h3"/></>,
  cake: <><path d="M4 13h16v7H4zM6 13V9h12v4M12 9V4"/><path d="M9 5.5c0 1.2 1.3 1.5 1.3 2.6M15 5.5c0 1.2-1.3 1.5-1.3 2.6M4 16h16"/></>,
  oven: <><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M7 7h.01M11 7h.01M15 7h.01M7 11h10v6H7z"/><path d="M9.5 14h5"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  star: <><path d="m12 3 2.7 5.47 6.03.88-4.36 4.25 1.03 6-5.4-2.84-5.4 2.84 1.03-6-4.36-4.25 6.03-.88z"/></>,
  megaphone: <><path d="m3 11 18-6v14l-18-6zM11 17l2 4h3l-2-5M3 11v2a3 3 0 0 0 3 3h1"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
  chevron: <><path d="m9 18 6-6-6-6"/></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  trend: <><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  bread: <><path d="M4.5 11a4 4 0 0 1 0-8 5.5 5.5 0 0 1 7.5 1 5.5 5.5 0 0 1 7.5 7v6a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3z"/><path d="M8 8v2M13 7v2M17 10v2"/></>,
  coffee: <><path d="M5 8h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM17 10h2a2 2 0 1 1 0 4h-2M8 4c0 1 1 1 1 2M12 4c0 1 1 1 1 2"/></>,
  shopping: <><path d="M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  phone: <><path d="M6.5 3h3l1.5 4-2 1.5a15 15 0 0 0 6.5 6.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z"/></>,
  external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></>,
  sparkle: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></>,
  close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  heart: <><path d="M20.8 8.8c0 5.1-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"/></>,
  cart: <><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.5L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  flame: <><path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-2 5-2 5-1-2-2-4-4-6 0 4-4 7-4 11a7 7 0 0 0 7 7Z"/><path d="M12 22a3 3 0 0 0 3-3c0-2-2-3-3-5-1 2-3 3-3 5a3 3 0 0 0 3 3Z"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  package: <><path d="m12 3 9 5-9 5-9-5zM3 8v9l9 5 9-5V8M12 13v9"/><path d="m7.5 5.5 9 5"/></>,
  gift: <><rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M2 6h20v3H2zM12 6v15M12 6H8.5a2.5 2.5 0 1 1 2.5-2.5V6ZM12 6h3.5A2.5 2.5 0 1 0 13 3.5V6Z"/></>,
  chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M17 6h3v3"/></>,
  truck: <><path d="M3 6h11v12H3zM14 10h4l3 3v5h-7z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
  crown: <><path d="m2 8 5 4 5-8 5 8 5-4-2 12H4zM4 20h16"/></>,
  rotate: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 11.6-2L20 12M4 12l2.9 5a7 7 0 0 0 11.6-2"/></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M16 14h2"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01"/></>,
  "arrow-up": <><path d="M12 19V5M6 11l6-6 6 6"/></>,
  "arrow-down": <><path d="M12 5v14M18 13l-6 6-6-6"/></>,
  whatsapp: <><path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3 20l1-4.8a8.4 8.4 0 1 1 16.5-3.6Z"/><path d="M8.5 8.5c.5 3 2.5 5 5.5 6l1-1.5-2-1-1 1a6 6 0 0 1-2.5-2.5l1-1-1-2z"/></>,
  camera: <><path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="14" r="3.5"/></>,
  store: <><path d="M4 10v10h16V10M3 10l2-6h14l2 6"/><path d="M3 10a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M9 20v-6h6v6"/></>,
  percent: <><path d="m19 5-14 14"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/></>,
  lightning: <><path d="m13 2-3 9h7l-6 11 2-9H6z"/></>,
  dots: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  "layers-plus": <><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 5-2.8"/><path d="M19 14v6M16 17h6"/></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5zM4 16a2 2 0 0 1 2-2h14M8 7h7M8 10h5"/></>,
  sparkles: <><path d="m12 3 1.3 4.2L17.5 9l-4.2 1.3L12 14.5l-1.3-4.2L6.5 9l4.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></>,
};

export function Icon({ name, size = 18, strokeWidth = 1.8, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number; strokeWidth?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{artwork[name]}</svg>;
}
