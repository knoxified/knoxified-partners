"use client";

import { useActionState, useMemo, useState } from "react";
import { NeonSelect, type NeonOption } from "@/components/neon-select";
import { CoinIcon, MethodIcon } from "@/components/payout-icons";
import { COUNTRIES } from "@/lib/countries";
import { CRYPTO_ASSETS, CURRENCIES, GIFT_CARDS, METHODS, type Method } from "@/lib/payout-options";
import { savePayout, type PayoutState } from "./payout-actions";

const label = "mb-1.5 block text-xs font-medium text-slate-400";
const countryOptions: NeonOption[] = COUNTRIES.map((c) => ({ value: c, label: c }));
const methodOptions: NeonOption[] = METHODS.map((m) => ({ value: m.value, label: m.label, sub: m.sub, icon: <MethodIcon method={m.value} /> }));
const currencyOptions: NeonOption[] = CURRENCIES.map((c) => ({ value: c.code, label: c.code, sub: c.name }));
const assetOptions: NeonOption[] = CRYPTO_ASSETS.map((a) => ({ value: a.value, label: a.label, sub: a.sub, icon: <CoinIcon asset={a.value} /> }));
const cardOptions: NeonOption[] = GIFT_CARDS.map((c) => ({ value: c, label: c }));

export function PayoutForm({ partnerId, saved }: { partnerId: string; saved: { method: string; hint: string | null } | null }) {
  const [state, action, pending] = useActionState<PayoutState, FormData>(savePayout, {});
  const [method, setMethod] = useState<Method>("bank_transfer");
  const [asset, setAsset] = useState<string>("USDT");
  const [network, setNetwork] = useState<string>("");
  const networks = useMemo(() => CRYPTO_ASSETS.find((a) => a.value === asset)?.networks ?? [], [asset]);
  const networkOptions: NeonOption[] = networks.map((n) => ({ value: n.value, label: n.label, sub: n.sub }));
  const input = (n: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => <input name={n} autoComplete="off" className="input" {...props} />;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="partnerId" value={partnerId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>How do you want to be paid?</label>
          <NeonSelect name="method" options={methodOptions} value={method} onChange={(v) => setMethod(v as Method)} />
        </div>
        <div>
          <label className={label}>Your country</label>
          <NeonSelect name="country" options={countryOptions} searchable placeholder="Choose your country" required />
        </div>

        <div key={method} className="contents">
          {method === "bank_transfer" && (
            <>
              <div><label className={label}>Payout currency</label><NeonSelect name="currency" options={currencyOptions} defaultValue="USD" searchable /></div>
              <div><label className={label}>Account holder name</label>{input("holder", { required: true })}</div>
              <div><label className={label}>Bank name</label>{input("bank", { required: true })}</div>
              <div><label className={label}>Account number or IBAN</label>{input("account", { required: true, className: "input font-mono" })}</div>
              <div><label className={label}>SWIFT / BIC (only if the bank is outside your country)</label>{input("swift", { className: "input font-mono uppercase" })}</div>
              <div><label className={label}>Notes (sort code, branch, anything the bank needs)</label>{input("notes")}</div>
            </>
          )}

          {method === "paypal" && (
            <>
              <div><label className={label}>Full name on the PayPal account</label>{input("holder", { required: true })}</div>
              <div className="sm:col-span-2"><label className={label}>PayPal email</label>{input("account", { type: "email", required: true })}</div>
              <p className="text-xs text-slate-500 sm:col-span-2">Paid in US dollars to this PayPal account.</p>
            </>
          )}

          {method === "crypto" && (
            <>
              <div><label className={label}>Name of the wallet owner</label>{input("holder", { required: true })}</div>
              <div><label className={label}>Stablecoin</label><NeonSelect name="asset" options={assetOptions} value={asset} onChange={(v) => { setAsset(v); setNetwork(""); }} /></div>
              <div><label className={label}>Network</label><NeonSelect key={asset} name="network" options={networkOptions} value={network} onChange={setNetwork} placeholder="Choose the network" required /></div>
              <div><label className={label}>Wallet address</label>{input("account", { required: true, className: "input font-mono text-xs", spellCheck: false, placeholder: networks.find((n) => n.value === network)?.example ?? "Pick a network first" })}</div>
              <label className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-sm text-amber-100 sm:col-span-2">
                <input type="checkbox" name="confirm" className="mt-1 h-4 w-4 accent-cyan-400" />
                <span>I checked that this address belongs to me and works on the network I chose. I understand crypto sent to a wrong address or network cannot be recovered.</span>
              </label>
              <p className="text-xs text-slate-500 sm:col-span-2">Only USDT and USDC are supported, so your payout keeps its US dollar value. Paid in US dollars.</p>
            </>
          )}

          {method === "gift_card" && (
            <>
              <div><label className={label}>Name</label>{input("holder", { required: true })}</div>
              <div><label className={label}>Gift card</label><NeonSelect name="card" options={cardOptions} placeholder="Choose a gift card" required /></div>
              <div className="sm:col-span-2"><label className={label}>Email to send the gift card to</label>{input("account", { type: "email", required: true })}</div>
              <p className="text-xs text-slate-500 sm:col-span-2">Gift cards must work in your country. Paid in US dollars.</p>
            </>
          )}
        </div>
      </div>

      {state.error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Saved. We emailed you a confirmation.</p>}
      <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : saved ? "Replace payout details" : "Save payout details"}</button>

      <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4 text-xs leading-relaxed text-slate-400">
        <p><b className="text-slate-200">Fees: what we pay and what we can&apos;t control.</b> We send you the full amount shown in your dashboard and cover the fees we are charged to send it (up to 2% of your payout).</p>
        <p className="mt-2">We can&apos;t control what your own bank, wallet provider or country does after the money arrives. Receiving fees, intermediary bank charges on international (SWIFT) wires, currency conversion and local taxes can still appear on your own statement after the money has entered your account. To keep those low, a local bank transfer, PayPal or stablecoins usually work better than an international wire.</p>
        <p className="mt-2">Payouts are made on the 15th, from US$50. Your details are encrypted and only used to pay you.</p>
      </div>
    </form>
  );
}
