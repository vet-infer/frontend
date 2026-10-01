import { Search, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useId, useMemo, useState } from "react";
import { cn } from "../../utils/cn";

export type AutocompleteOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
};

type AutocompleteProps = {
  label: string;
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  emptyMessage?: string;
  maxResults?: number;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function Autocomplete({
  label,
  options,
  value,
  onChange,
  placeholder,
  helpText,
  emptyMessage = "Sin coincidencias.",
  maxResults = 8,
}: AutocompleteProps) {
  const listId = useId();
  const selected = options.find((option) => option.value === value) ?? null;
  const [query, setQuery] = useState(selected?.label ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [syncedLabel, setSyncedLabel] = useState(selected?.label);

  // Sincroniza el texto cuando la selección cambia desde fuera (ej. ?patientId= en la URL).
  if (selected?.label !== syncedLabel) {
    setSyncedLabel(selected?.label);
    if (selected) setQuery(selected.label);
  }

  const results = useMemo(() => {
    const term = normalize(query);
    const matches = term
      ? options.filter((option) =>
          normalize(`${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`).includes(term)
        )
      : options;

    return matches.slice(0, maxResults);
  }, [maxResults, options, query]);

  function select(option: AutocompleteOption) {
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
  }

  function clear() {
    setQuery("");
    setIsOpen(false);
    if (value) onChange("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && isOpen && results[activeIndex]) {
      event.preventDefault();
      select(results[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            aria-activedescendant={isOpen && results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={isOpen}
            autoComplete="off"
            className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            onBlur={() => {
              setIsOpen(false);
              setQuery(selected?.label ?? "");
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
              setIsOpen(true);
              if (value) onChange("");
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            type="text"
            value={query}
          />
          {query ? (
            <button
              aria-label="Limpiar"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
              onClick={clear}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <X size={16} />
            </button>
          ) : null}
        </span>
      </label>

      {isOpen ? (
        <ul
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          id={listId}
          role="listbox"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm font-medium text-slate-500">{emptyMessage}</li>
          ) : (
            results.map((option, index) => (
              <li
                aria-selected={option.value === value}
                className={cn(
                  "cursor-pointer px-4 py-2.5 text-sm",
                  index === activeIndex ? "bg-teal-50" : "hover:bg-slate-50"
                )}
                id={`${listId}-${index}`}
                key={option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(option)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
              >
                <span className="block font-bold text-slate-700">{option.label}</span>
                {option.description ? <span className="block text-xs text-slate-500">{option.description}</span> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}

      {helpText ? <span className="mt-2 block text-xs font-medium leading-5 text-slate-500">{helpText}</span> : null}
    </div>
  );
}
