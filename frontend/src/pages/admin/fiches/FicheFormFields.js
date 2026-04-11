import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function Section({ title, icon, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-zinc-200/80 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <button onClick={() => setOpen(!open)} type="button"
        className="w-full flex items-center gap-3 px-6 py-4 text-left group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6600] to-[#E55B00] flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <span className="font-semibold text-sm tracking-wide text-zinc-900 flex-1">{title}</span>
        {count !== undefined && (
          <span className="text-xs font-bold text-[#FF6600] bg-[#FF6600]/10 px-2 py-0.5 rounded-full">{count}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-6 pb-6 border-t border-zinc-100">{children}</div>}
    </div>
  );
}

export function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export function Input({ label, value, onChange, placeholder, type = "text", className = "", ...rest }) {
  return (
    <Field label={label} className={className}>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] transition-all"
        {...rest} />
    </Field>
  );
}

export function TextArea2({ label, value, onChange, placeholder, rows = 3, className = "" }) {
  return (
    <Field label={label} className={className}>
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] transition-all resize-y" />
    </Field>
  );
}

export function Select({ label, value, onChange, options, className = "", testId }) {
  return (
    <Field label={label} className={className}>
      <select value={value} onChange={onChange}
        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]"
        data-testid={testId}>
        {options.map(o => typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </Field>
  );
}

export const CURRENCIES = ["GNF", "EUR", "USD", "CAD", "XOF", "GBP"];
export const STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publie" },
  { value: "archived", label: "Archive" },
];
