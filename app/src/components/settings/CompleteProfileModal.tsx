import { useState } from "react";
import { LocationPicker } from "./LocationPicker";
import { authClient } from "@/lib/authClient";

export function CompleteProfileModal() {
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !country) return;
    setLoading(true);
    setError("");
    try {
      const { error: updateError } = await authClient.updateUser({
        email,
        locationCountry: country,
        locationCity: city,
        locationSource: "manual",
      } as any);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      // useSession() updates automatically — modal unmounts when authState.email becomes truthy
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-overlay/80 font-primary">
      <div className="bg-elevated border border-control rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-body mb-2">
          One quick update!
        </h2>
        <p className="text-subtle text-sm mb-6">
          We recently updated The Film Atlas. Please add your email and region
          to keep your account secure and access all of our new features.
        </p>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-subtle">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            className="auth-formField bg-surface"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <LocationPicker
          country={country}
          city={city}
          onCountryChange={setCountry}
          onCityChange={setCity}
        />

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <button
          className="mt-6 w-full bg-dark text-light py-2.5 text-sm font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:enabled:bg-atlas-green disabled:transition-none transition-colors duration-200 ease-out"
          onClick={handleSubmit}
          disabled={!email || !country || !city || loading}
        >
          {loading ? "Saving..." : "Save and continue"}
        </button>
      </div>
    </div>
  );
}
