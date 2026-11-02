"use client";
import Link from "next/link";
import { useState } from "react";
import type { WalletTransaction } from "@/lib/actions/getTransactions";
import { money, dateTime } from "@/lib/format";
const statuses: Record<string, string> = {
  Success: "bg-blue-400/10 text-blue-300",
  Processing: "bg-amber-400/10 text-amber-300",
  Failure: "bg-red-400/10 text-red-300",
};
function csvCell(value: string) {
  const safe = /^-?\d+(?:\.\d+)?$/.test(value)
    ? value
    : /^[=+@\-\t\r]/.test(value.trimStart())
      ? "'" + value
      : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function TransactionList({
  transactions,
  compact = false,
}: {
  transactions: WalletTransaction[];
  compact?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [open, setOpen] = useState<string | null>(null);
  const filtered = transactions.filter(
    (t) =>
      (type === "all" || t.type === type) &&
      (status === "all" || t.status === status) &&
      `${t.description} ${t.id} ${t.phone ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20)),
    currentPage = Math.min(page, pages);
  const visible = compact
    ? transactions.slice(0, 5)
    : filtered.slice((currentPage - 1) * 20, currentPage * 20);
  function exportCsv() {
    const lines = [
      [
        "Reference",
        "Date (IST)",
        "Type",
        "Counterparty",
        "Amount (INR)",
        "Status",
      ],
      ...filtered.map((t) => [
        t.id,
        dateTime(t.time),
        t.type,
        t.description,
        `${t.type === "sent" || t.type === "withdrawal" ? "-" : ""}${(t.amount / 100).toFixed(2)}`,
        t.status,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.map((row) => row.map(csvCell).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "easepay-transactions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      {!compact && (
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            aria-label="Search transactions"
            className="wallet-input flex-1 min-w-40"
            placeholder="Search name, number, reference…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Transaction type"
            className="wallet-input !w-auto"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All types</option>
            <option value="deposit">Added money</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
          <select
            aria-label="Transaction status"
            className="wallet-input !w-auto"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {["all", "Success", "Processing", "Failure"].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
          <button
            onClick={exportCsv}
            disabled={!filtered.length}
            className="secondary-button"
          >
            Export CSV ↓
          </button>
        </div>
      )}
      <div className="wallet-card overflow-hidden">
        {visible.length ? (
          visible.map((t) => (
            <div
              key={t.id}
              className="border-b last:border-0 border-white/[.05]"
            >
              <button
                aria-expanded={open === t.id}
                onClick={() => setOpen(open === t.id ? null : t.id)}
                className="w-full text-left p-4 sm:p-5 flex gap-3 sm:gap-4 items-center hover:bg-white/[.02] transition-colors"
              >
                <span
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full grid place-items-center text-xl shrink-0 ${t.type === "sent" || t.type === "withdrawal" ? "bg-white/5 text-neutral-300" : "bg-blue-400/10 text-blue-300"}`}
                  aria-hidden="true"
                >
                  {t.type === "sent" || t.type === "withdrawal" ? "↗" : "↙"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {t.type === "deposit"
                      ? "Added from "
                      : t.type === "sent" || t.type === "withdrawal"
                        ? "To "
                        : "From "}
                    {t.description}
                  </p>
                  <p className="text-[11px] sm:text-xs text-neutral-500 mt-1">
                    {dateTime(t.time)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-semibold text-sm ${t.type === "sent" || t.type === "withdrawal" ? "text-neutral-200" : t.status === "Success" ? "text-blue-300" : "text-neutral-400"}`}
                  >
                    {t.type === "sent" || t.type === "withdrawal" ? "−" : "+"}
                    {money(t.amount)}
                  </p>
                  <span
                    className={`text-[9px] font-medium px-2 py-0.5 rounded-full mt-1.5 inline-block ${statuses[t.status]}`}
                  >
                    {t.status}
                  </span>
                </div>
              </button>
              {open === t.id && (
                <div className="px-5 pb-5 text-xs text-neutral-400 space-y-2">
                  <p>
                    Reference:{" "}
                    <span className="font-mono text-neutral-200">{t.id}</span>
                  </p>
                  {t.phone && <p>Phone: {t.phone}</p>}
                  {t.token && (
                    <p className="break-all">Payment ID: {t.token}</p>
                  )}
                  <p>Time zone: India (IST)</p>
                  {t.type === "deposit" && t.status === "Processing" && (
                    <Link
                      href={`/bank/${t.token}`}
                      className="inline-block text-blue-300 pt-2"
                    >
                      Continue pending payment →
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-14 px-5">
            <p className="text-3xl mb-4 text-blue-300">↔</p>
            <h3 className="font-semibold">
              {transactions.length
                ? "No matching activity"
                : "Your story starts here"}
            </h3>
            <p className="text-sm text-neutral-500 mt-2">
              {transactions.length
                ? "Try a different search or filter."
                : "Add money to your wallet to make your first payment."}
            </p>
            {!transactions.length && (
              <Link
                href="/transfer?tab=add"
                className="inline-block mt-6 text-sm text-blue-300"
              >
                Add money →
              </Link>
            )}
          </div>
        )}
      </div>
      {!compact && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 mt-5 text-xs text-neutral-500">
          <span>
            {filtered.length} transaction{filtered.length === 1 ? "" : "s"} ·
            Page {currentPage} of {pages}
          </span>
          <div className="flex gap-2">
            <button
              className="secondary-button !py-2 !px-3 !text-xs"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              ← Previous
            </button>
            <button
              className="secondary-button !py-2 !px-3 !text-xs"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
