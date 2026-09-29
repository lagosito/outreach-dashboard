"use client";

import { ChevronDown, Search } from "lucide-react";
import type { ReactNode } from "react";

export interface SegOption {
  value: string;
  label: string;
  count?: number;
}

export function SegControl({
  label,
  labelId,
  options,
  value,
  onChange,
}: {
  label: string;
  labelId: string;
  options: SegOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <span className="lbl" id={labelId}>
        {label}
      </span>
      <div className="seg" role="group" aria-labelledby={labelId}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.count != null ? <small>{option.count}</small> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SearchField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field searchbox-field">
      <label htmlFor={id}>{label}</label>
      <div className="searchbox">
        <Search size={18} />
        <input
          id={id}
          className="input"
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface KpiItem {
  value: string | number;
  label: string;
}

export function StripCard({
  title,
  kpis,
  actionLabel,
  activeCount = 0,
  open,
  onToggle,
  bodyId,
  className,
  children,
}: {
  title: string;
  kpis: KpiItem[];
  actionLabel?: string;
  activeCount?: number;
  open?: boolean;
  onToggle?: () => void;
  bodyId?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={className ? `card ${className}` : "card"}>
      <div className="strip">
        <h2>{title}</h2>
        <div className="kpis">
          {kpis.map((kpi) => (
            <div className="kpi" key={kpi.label}>
              <b>{kpi.value}</b>
              <span>{kpi.label}</span>
            </div>
          ))}
        </div>
        {actionLabel ? (
          <button
            className="linkbtn"
            type="button"
            aria-expanded={Boolean(open)}
            aria-controls={bodyId}
            onClick={onToggle}
          >
            {actionLabel}
            {activeCount > 0 ? <span className="count hot">{activeCount}</span> : null}
            <ChevronDown size={16} strokeWidth={2.2} />
          </button>
        ) : null}
      </div>
      {actionLabel ? (
        <div className="strip-body" id={bodyId} hidden={!open}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
