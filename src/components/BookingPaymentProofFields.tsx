import { useEffect, useId, useMemo, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  /** Wording for booking vs shop checkout */
  context?: "booking" | "checkout";
};

export function BookingPaymentProofFields({
  file,
  onFileChange,
  confirmed,
  onConfirmedChange,
  context = "booking",
}: Props) {
  const isCheckout = context === "checkout";
  const submitNoun = isCheckout ? "order" : "booking";
  const baseId = useId();
  const fileInputId = `${baseId}-payment-screenshot`;
  const checkboxId = `${baseId}-payment-confirmed`;
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) onConfirmedChange(false);
  }, [file, onConfirmedChange]);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="mb-8 rounded-2xl border border-black/8 bg-white px-5 py-4 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
      <p className="mb-1 text-[10px] font-bold tracking-[0.18em] text-tle-muted uppercase">
        Payment proof
      </p>
      <p className="mb-4 text-[13px] leading-relaxed text-tle-ink">
        After you transfer, upload a clear screenshot of your payment receipt.{" "}
        <span className="font-semibold text-tle-ink">
          Without a screenshot you cannot tick &ldquo;I&apos;ve made payment&rdquo; or place your {submitNoun}
        </span>
        — we need it to confirm your transfer.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <input
          id={fileInputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            e.target.value = "";
            setPickError(null);
            if (!picked) {
              onFileChange(null);
              return;
            }
            if (!picked.type.startsWith("image/")) {
              setPickError("Please choose an image file.");
              onFileChange(null);
              return;
            }
            if (picked.size > MAX_BYTES) {
              setPickError("Image must be 5 MB or smaller.");
              onFileChange(null);
              return;
            }
            onFileChange(picked);
          }}
        />
        <label
          htmlFor={fileInputId}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-tle-pink/40 bg-tle-blush/50 px-4 py-3 font-sans text-xs font-bold tracking-wide text-tle-deep uppercase transition-colors hover:border-tle-pink hover:bg-tle-blush"
        >
          Choose screenshot
        </label>
        <div className="min-w-0 flex-1">
          {file ? (
            <p className="truncate text-[13px] font-medium text-tle-ink" title={file.name}>
              {file.name}
            </p>
          ) : (
            <p className="text-[13px] text-tle-muted">No file selected</p>
          )}
          {pickError ? (
            <p className="mt-1 text-[12px] font-medium text-rose-700">{pickError}</p>
          ) : null}
        </div>
      </div>

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-black/8 bg-tle-cream/40">
          <img
            src={previewUrl}
            alt="Payment screenshot preview"
            className="max-h-56 w-full object-contain"
          />
        </div>
      ) : null}

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-black/[0.06] bg-tle-cream/30 px-3 py-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={confirmed}
          disabled={!file}
          onChange={(e) => onConfirmedChange(e.target.checked)}
          className="mt-1 size-4 shrink-0 rounded border-black/20 text-tle-pink focus:ring-tle-pink disabled:cursor-not-allowed disabled:opacity-40"
        />
        <label
          htmlFor={checkboxId}
          className={`cursor-pointer text-[13px] leading-snug ${!file ? "cursor-not-allowed text-tle-muted" : "text-tle-ink"}`}
        >
          <span className="font-semibold">I&apos;ve made payment</span>
          {!file ? (
            <span className="mt-1 block text-[12px] font-normal text-tle-muted">
              Upload a screenshot above to enable this.
            </span>
          ) : null}
        </label>
      </div>
    </div>
  );
}
