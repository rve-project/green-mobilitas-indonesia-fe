"use client";

import { formatNumberId, parseNumberId } from "@/lib/format";

interface RupiahInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

export function RupiahInput({ value, onChange, placeholder, className, id, ...rest }: RupiahInputProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={formatNumberId(Number(value) || 0)}
      onChange={(e) => onChange(String(parseNumberId(e.target.value)))}
      placeholder={placeholder}
      className={className}
      {...rest}
    />
  );
}
