import { COUNTRIES } from "@/utils/countries";
import { useState, useEffect, useRef } from "react";

interface LocationPickerProps {
  country: string;
  city: string;
  onCountryChange: (code: string) => void;
  onCityChange: (city: string) => void;
}

interface GeonamesCity {
  name: string;
  countryCode: string;
}

const GEONAMES_USER = import.meta.env.VITE_GEONAMES_USERNAME;

export function LocationPicker({
  country,
  city,
  onCountryChange,
  onCityChange,
}: LocationPickerProps) {
  const [query, setQuery] = useState(city);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(city);
  }, [city]);

  function handleInput(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setSuggestions([]);
      setNoResults(false);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: value,
          featureClass: "P",
          maxRows: "10",
          username: GEONAMES_USER,
          lang: "en",
          ...(country && { country }),
        });

        const res = await fetch(
          `https://secure.geonames.org/searchJSON?${params}`,
        );
        const data = await res.json();
        const cities: GeonamesCity[] = data.geonames ?? [];

        const names = cities
          .map((c) => c.name)
          .filter(Boolean)
          .filter((name, i, arr) => arr.indexOf(name) === i)
          .slice(0, 6);

        setSuggestions(names);
        setNoResults(names.length === 0);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setNoResults(false);
        setOpen(false);
      }
    }, 300);
  }

  function handleSelect(name: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery(name);
    onCityChange(name);
    setSuggestions([]);
    setNoResults(false);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-subtle">
          Country <span className="text-red-600">*</span>
        </label>
        <select
          value={country}
          onChange={(e) => {
            onCountryChange(e.target.value);
            setQuery("");
            onCityChange("");
            setSuggestions([]);
            setNoResults(false);
            setOpen(false);
          }}
          className="auth-formField border-dark"
        >
          <option value="">Select your country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-subtle">
          City <span className="text-red-600">*</span>
        </label>
        <div className="w-[18rem] border-dark relative">
          <input
            type="text"
            className="auth-formField w-full border-dark"
            placeholder={
              country ? "Start typing your city..." : "Select a country first"
            }
            value={query}
            disabled={!country}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() =>
              (suggestions.length > 0 || noResults) && setOpen(true)
            }
          />
          {open && (
            <ul className="absolute z-50 w-full mt-1 bg-elevated border border-control rounded-lg shadow-lg overflow-hidden">
              {suggestions.length > 0 ? (
                suggestions.map((name) => (
                  <li
                    key={name}
                    tabIndex={0}
                    className="px-3 py-2 text-sm text-body hover:bg-surface cursor-pointer"
                    onMouseDown={() => handleSelect(name)}
                  >
                    {name}
                  </li>
                ))
              ) : noResults ? (
                <li className="px-3 py-2 text-sm text-subtle italic">
                  No cities found
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
