export function MapUnavailable() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#e8f1f7] px-6 text-center">
      <div className="text-4xl">🗺️</div>
      <p className="text-lg font-semibold text-[#2c4a5e]">
        Map unavailable — graphics acceleration is disabled
      </p>
      <p className="text-sm text-[#4a6a80] max-w-md">
        The interactive map requires WebGL, which needs hardware
        acceleration to be enabled in your browser.
      </p>
      <div className="text-sm text-[#4a6a80] max-w-md text-left bg-white/60 rounded-xl p-4 space-y-2">
        <p className="font-semibold text-[#2c4a5e]">How to enable it:</p>
        <p>
          <span className="font-medium">Chrome / Edge:</span> Settings →
          System → turn on{" "}
          <em>Use graphics acceleration when available</em>, then relaunch
          the browser.
        </p>
        <p>
          <span className="font-medium">Firefox:</span> Settings → General
          → Performance → check{" "}
          <em>Use hardware acceleration when available</em>, then
          relaunch.
        </p>
        <p>
          <span className="font-medium">Safari:</span> Develop menu →
          Experimental Features → ensure WebGL is enabled.
        </p>
      </div>
    </div>
  );
}
