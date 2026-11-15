"use client";

import { useActionState } from "react";
import { savePayout, type PayoutState } from "./payout-actions";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "NGN", "CAD", "AUD", "ZAR", "KES", "GHS", "INR", "PHP", "BRL", "MXN", "SGD"];

export function PayoutForm({ partnerId, saved }: { partnerId: string; saved: { currency: string; hint: string | null; updated: string } | null }) {
  const [state, action, pending] = useActionState<PayoutState, FormData>(savePayout, {});
  const field = "mb-1.5 block text-xs font-medium text-slate-400";
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="partnerId" value={partnerId} />
      {saved && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Saved: {saved.currency} · {saved.hint ?? "••••"} · updated {saved.updated}. For your security we never show saved details again. Enter new ones to replace them.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={field}>Payout currency</label>
          <input name="currency" list="currencies" defaultValue={saved?.currency ?? "USD"} maxLength={3} required className="input uppercase" />
          <datalist id="currencies">{CURRENCIES.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div><label className={field}>Country of the account</label><input name="country" required className="input" /></div>
        <div>
          <label className={field}>Method</label>
          <select name="method" className="input" defaultValue="bank_transfer">
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other (describe in notes)</option>
          </select>
        </div>
        <div><label className={field}>Account holder name</label><input name="holder" required className="input" autoComplete="off" /></div>
        <div><label className={field}>Bank name</label><input name="bank" className="input" autoComplete="off" /></div>
        <div><label className={field}>Account number or IBAN</label><input name="account" className="input font-mono" autoComplete="off" /></div>
        <div><label className={field}>SWIFT / BIC (if outside your country)</label><input name="swift" className="input font-mono uppercase" autoComplete="off" /></div>
        <div><label className={field}>Notes (sort code, branch, anything the bank needs)</label><input name="notes" className="input" autoComplete="off" /></div>
      </div>
      {state.error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Saved. We emailed you a confirmation.</p>}
      <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : saved ? "Replace payout details" : "Save payout details"}</button>
      <p className="text-xs text-slate-500">Paid in US dollars by default. If you choose another currency we convert at our payout provider&apos;s rate on the payout date, and bank or conversion fees are yours. Details are encrypted and only used to pay you.</p>
    </form>
  );
}
