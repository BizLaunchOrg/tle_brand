import { useEffect, useState } from "react";
import type { BookingTransferDetails } from "../data/bookingTransferDetails.ts";

type Props = {
  details: BookingTransferDetails;
  className?: string;
};

const DEMO_COUNTDOWN_START_SEC = 15 * 60;

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-black/[0.06] py-3 last:border-b-0">
      <dt className="text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">
        {label}
      </dt>
      <dd
        className={`text-[15px] font-semibold text-tle-ink ${mono ? "font-mono tracking-wide" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatMmSs(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function BookingTransferDetailsCard({ details, className = "" }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(DEMO_COUNTDOWN_START_SEC);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? DEMO_COUNTDOWN_START_SEC : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const copyAccountNumber = async () => {
    if (!details.accountNumber) return;
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(details.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-black/8 bg-white px-5 py-4 shadow-[0_8px_28px_rgba(0,0,0,0.04)] ${className}`}
    >
      <div className="mb-4 flex justify-end border-b border-black/[0.06] pb-3">
        <span className="font-mono text-[22px] font-semibold tabular-nums tracking-tight text-tle-pink">
          {formatMmSs(secondsLeft)}
        </span>
      </div>
      <dl className="m-0">
        <Row label="Bank" value={details.bankName} />
        <Row label="Account name" value={details.accountName} />
        <Row label="Account number" value={details.accountNumber} mono />
      </dl>
      <div className="border-t border-black/[0.06] pb-1 pt-3">
        <button
          type="button"
          onClick={() => void copyAccountNumber()}
          className="w-full rounded-xl border-[1.5px] border-tle-pink/40 bg-tle-blush/80 px-4 py-3 font-sans text-xs font-bold tracking-wide text-tle-deep uppercase transition-colors hover:border-tle-pink hover:bg-tle-blush"
        >
          {copied ? "Copied" : "Copy number"}
        </button>
        {copyError ? (
          <p className="mt-2 mb-0 text-center text-[11px] text-tle-muted">
            Copy failed
          </p>
        ) : null}
      </div>
    </div>
  );
}
