import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/utils/authContext";
import { decodeToken } from "@/utils/decodeToken";
import { LocationPicker } from "./LocationPicker";
import { COUNTRIES } from "@/utils/countries";
import NavBar from "@/components/layout/navbar/NavBar";
import { useNavigate } from "@tanstack/react-router";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-control rounded-none p-6">
      <h2 className="text-base font-semibold text-body mb-4">{title}</h2>
      {children}
    </section>
  );
}

function StatusMessage({ success, error }: { success: string; error: string }) {
  if (success) return <p className="text-success text-sm mt-2">{success}</p>;
  if (error) return <p className="text-error text-sm mt-2">{error}</p>;
  return null;
}

function ChangeUsername() {
  const { authState, setAuthState } = useAuth();
  const [username, setUsername] = useState(authState.username);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.patch<{ token?: string; error?: string }>(
        "/profile/me/username",
        { username },
        { headers: { accesstoken: localStorage.getItem("accessToken") ?? "" } },
      );
      if (data.error) {
        setError(data.error);
        return;
      }
      localStorage.setItem("accessToken", data.token!);
      const decoded = decodeToken(data.token!);
      if (decoded) setAuthState(decoded);
      setSuccess("Username updated.");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setError(msg ?? "Error updating username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        className="auth-formField"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="New username"
        minLength={3}
        maxLength={30}
      />
      <StatusMessage success={success} error={error} />
      <button
        type="submit"
        disabled={loading || username === authState.username}
        className="auth-formSubmitButton disabled:transition-none disabled:bg-muted"
      >
        {loading ? "Saving..." : "Save username"}
      </button>
    </form>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.patch<{ message?: string; error?: string }>(
        "/profile/me/password",
        { currentPassword: current, newPassword: next },
        { headers: { accesstoken: localStorage.getItem("accessToken") ?? "" } },
      );
      if (data.error) {
        setError(data.error);
        return;
      }
      setSuccess("Password updated.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setError(msg ?? "Error updating password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        className="auth-formField"
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="Current password"
      />
      <input
        className="auth-formField"
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="New password"
        minLength={8}
      />
      <input
        className="auth-formField"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password"
      />
      <StatusMessage success={success} error={error} />
      <button
        type="submit"
        disabled={loading || !current || !next || !confirm}
        className="auth-formSubmitButton disabled:opacity-40"
      >
        {loading ? "Saving..." : "Update password"}
      </button>
    </form>
  );
}

function ChangeRegion() {
  const { authState, setAuthState } = useAuth();
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [currentSource, setCurrentSource] = useState<string | null>(null);
  const [currentCountry, setCurrentCountry] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    axios
      .get<{
        location_country: string | null;
        location_city: string | null;
        location_source: string | null;
      }>("/profile/me/location", {
        headers: { accesstoken: localStorage.getItem("accessToken") ?? "" },
      })
      .then(({ data }) => {
        setCountry(data.location_country ?? "");
        setCity(data.location_city ?? "");
        setCurrentCountry(data.location_country);
        setCurrentSource(data.location_source);
      })
      .catch(() => {});
  }, []);

  const currentCountryName =
    COUNTRIES.find((c) => c.code === currentCountry)?.name ?? currentCountry;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.patch<{ token?: string; error?: string }>(
        "/profile/me/location",
        { country, city },
        { headers: { accesstoken: localStorage.getItem("accessToken") ?? "" } },
      );
      if (data.error) {
        setError(data.error);
        return;
      }
      localStorage.setItem("accessToken", data.token!);
      const decoded = decodeToken(data.token!);
      if (decoded) setAuthState(decoded);
      setCurrentCountry(country);
      setCurrentSource("manual");
      setSuccess("Region updated.");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setError(msg ?? "Error updating region.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    setSuccess("");
    setError("");
    setDetecting(true);
    try {
      const { data } = await axios.post<{
        token?: string;
        location_country?: string;
        location_city?: string;
        error?: string;
      }>(
        "/profile/me/location/detect",
        {},
        {
          headers: { accesstoken: localStorage.getItem("accessToken") ?? "" },
        },
      );
      if (data.error) {
        setError(data.error);
        return;
      }
      localStorage.setItem("accessToken", data.token!);
      const decoded = decodeToken(data.token!);
      if (decoded) {
        setAuthState(decoded);
        setCountry(data.location_country ?? "");
        setCity(data.location_city ?? "");
        setCurrentCountry(data.location_country ?? null);
        setCurrentSource("ip");
      }
      setSuccess("Region auto-detected.");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setError(msg ?? "Could not detect location.");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {currentCountry && (
        <p className="text-sm text-subtle">
          Current:{" "}
          <span className="text-body">
            {currentCountryName}
            {currentSource === "ip" ? " (auto-detected)" : " (set manually)"}
          </span>
        </p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <LocationPicker
          country={country}
          city={city}
          onCountryChange={setCountry}
          onCityChange={setCity}
        />
        <button
          type="submit"
          disabled={loading || !country || !city}
          className="auth-formSubmitButton disabled:opacity-40"
        >
          {loading ? "Saving..." : "Save manually"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleAutoDetect}
        disabled={detecting}
        className="text-sm text-subtle underline text-left cursor-pointer disabled:opacity-40"
      >
        {detecting ? "Detecting..." : "Auto-detect from IP instead"}
      </button>

      <StatusMessage success={success} error={error} />
    </div>
  );
}

export function AccountSettings() {
  const { authState } = useAuth();
  const navigate = useNavigate();

  if (!authState.status) {
    navigate({ to: "/login" });
    return null;
  }

  return (
    <div className="font-primary min-h-screen text-body">
      <NavBar />
      <div className="pt-24 pb-12 max-w-xl mx-auto px-4 flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Account Settings</h1>

        <Section title="Change Username">
          <ChangeUsername />
        </Section>

        <Section title="Change Password">
          <ChangePassword />
        </Section>

        <Section title="Your Region">
          <ChangeRegion />
        </Section>
      </div>
    </div>
  );
}
