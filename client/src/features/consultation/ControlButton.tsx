interface Props {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}

// A round call-control button (mic, camera, captions…), shared by both call rooms.
export default function ControlButton({ label, onClick, pressed, disabled, danger, children }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 ${
        danger
          ? "bg-maroon-700 hover:bg-maroon-800 text-white"
          : pressed
            ? "bg-white text-navy-950"
            : "bg-white/10 hover:bg-white/20 text-white"
      }`}
    >
      {children}
    </button>
  );
}
