import type { ReactNode } from "react";

const box = "h-6 w-6";

export function CoinIcon({ asset }: { asset: string }) {
  if (asset === "USDC")
    return (
      <svg className={box} viewBox="0 0 32 32" aria-hidden><circle cx="16" cy="16" r="16" fill="#2775CA" /><path d="M20.4 18.4c0-2.3-1.4-3.1-4.2-3.4-2-.3-2.4-.8-2.4-1.7s.7-1.5 1.9-1.5c1.1 0 1.8.4 2.1 1.4.1.2.2.3.4.3h1c.2 0 .4-.2.4-.4-.3-1.4-1.3-2.4-2.7-2.7v-1.6c0-.2-.2-.4-.4-.4h-.9c-.2 0-.4.2-.4.4v1.5c-1.9.3-3.1 1.5-3.1 3.1 0 2.2 1.3 3 4.1 3.3 1.9.4 2.5.8 2.5 1.8s-.9 1.7-2.1 1.7c-1.6 0-2.1-.7-2.3-1.6 0-.2-.2-.3-.4-.3h-1.1c-.2 0-.4.2-.3.4.3 1.6 1.3 2.5 3.2 2.8v1.6c0 .2.2.4.4.4h.9c.2 0 .4-.2.4-.4v-1.6c1.9-.3 3.1-1.6 3.1-3.2z" fill="#fff" /></svg>
    );
  return (
    <svg className={box} viewBox="0 0 32 32" aria-hidden><circle cx="16" cy="16" r="16" fill="#26A17B" /><path d="M17.9 17.3v0c-.1 0-.7.1-1.9.1s-1.7 0-1.9-.1v0c-3.7-.2-6.4-.8-6.4-1.6s2.7-1.5 6.4-1.6v2.5c.2 0 .9.1 1.9.1 1.1 0 1.7-.1 1.9-.1v-2.5c3.7.2 6.4.8 6.4 1.6s-2.7 1.4-6.4 1.6zm0-3.5v-2.2h5v-3.3H9v3.3h5v2.2c-4.2.2-7.3 1-7.3 2.1s3.1 1.9 7.3 2.1v7.2h3.9v-7.2c4.1-.2 7.2-1 7.2-2.1s-3.1-1.9-7.2-2.1z" fill="#fff" /></svg>
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function MethodIcon({ method }: { method: string }): ReactNode {
  const cls = `${box} text-cyan-300`;
  if (method === "paypal")
    return <svg className={cls} viewBox="0 0 24 24" aria-hidden><path {...stroke} d="M7 20l1.6-11.5c.1-.6.6-1 1.2-1H14c2.6 0 4 1.3 3.6 3.5-.4 2.4-2.2 3.5-4.6 3.5h-1.8L10.5 20H7z" /></svg>;
  if (method === "crypto")
    return <svg className={cls} viewBox="0 0 24 24" aria-hidden><circle {...stroke} cx="12" cy="12" r="8.5" /><path {...stroke} d="M9.5 8.5h3.8a1.7 1.7 0 0 1 0 3.5H9.5m0 0h4.2a1.8 1.8 0 0 1 0 3.6H9.5M9.5 8.5v7.1M11 7v1.5m2-1.5v1.5m-2 7.1V17m2-1.4V17" /></svg>;
  if (method === "gift_card")
    return <svg className={cls} viewBox="0 0 24 24" aria-hidden><rect {...stroke} x="4" y="9" width="16" height="11" rx="1.5" /><path {...stroke} d="M3 9h18v3H3zM12 9v11M12 9c-2-4-5.5-3-4.5-.8.6 1.2 3 .8 4.5.8zm0 0c2-4 5.5-3 4.5-.8-.600 1.2-3 .8-4.5.8z" /></svg>;
  return <svg className={cls} viewBox="0 0 24 24" aria-hidden><path {...stroke} d="M3.5 10 12 4.5 20.5 10M5.5 10v7.5M9.5 10v7.5M14.5 10v7.5M18.5 10v7.5M3.5 20h17" /></svg>;
}
