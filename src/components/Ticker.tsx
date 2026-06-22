// Scrolling marquee ticker (Mad Scientists style). Duplicated content so the
// CSS translateX(-50%) loop is seamless.
export function Ticker() {
  const items = [
    "CONNECT EVM", "GET COSMOS WALLET", "GET ATOM", "STAKE", "CLIMB THE BOARD",
  ];
  const strip = (
    <span className="ticker__track">
      {items.concat(items).map((t, i) => (
        <span key={i}>{t} ·</span>
      ))}
    </span>
  );
  return (
    <div className="ticker">
      {strip}
      {strip}
    </div>
  );
}
