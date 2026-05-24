export default function LoadingScreen({ message = "Loading" }) {
  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4"
      style={{ background: "#0c0c18" }}
    >
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 48 48" className="w-12 h-12 animate-spin">
          <defs>
            <linearGradient id="spinner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
          <circle cx="24" cy="24" r="20" fill="none" stroke="url(#spinner-grad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="30 96" />
        </svg>
      </div>
      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
        {message}
      </p>
    </div>
  );
}
