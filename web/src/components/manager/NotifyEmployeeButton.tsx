"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function NotifyEmployeeButton({ employeeId, month }: { employeeId: string; month: string }) {
  const t = useTranslations("manager.pending");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<null | boolean>(null);

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    setOk(null);
    try {
      const res = await fetch(`/api/manager/notify-employee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month }),
      });
      setOk(res.ok);
    } catch {
      setOk(false);
    } finally {
      setLoading(false);
    }
  };

  let label = t("notifyEmployee");
  if (loading) label = t("notifying");
  if (ok === true) label = t("notifySuccess");
  if (ok === false) label = t("notifyError");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm ${ok === true ? "border-green-600 text-green-600" : ok === false ? "border-red-600 text-red-600" : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]/50"}`}
      aria-live="polite"
    >
      {label}
    </button>
  );
}

