import { COUNTRIES } from "@/utils/countries"

interface LocationPickerProps {
  country: string
  city: string
  onCountryChange: (code: string) => void
  onCityChange: (city: string) => void
}

export function LocationPicker({
  country,
  city,
  onCountryChange,
  onCityChange,
}: LocationPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-subtle">
          Country <span className="text-red-600">*</span>
        </label>
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          className="auth-formField bg-surface text-body">
          <option value="" className="text-subtle">Select your country</option>
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
        <input
          type="text"
          className="auth-formField bg-surface"
          placeholder="e.g. Ho Chi Minh City"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
        />
      </div>
    </div>
  )
}
