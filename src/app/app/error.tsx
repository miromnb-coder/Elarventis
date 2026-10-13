"use client";
export default function ErrorView({ reset }: { reset: () => void }) { return <div className="workspace-empty" role="alert"><h2>Tietojen lataus epäonnistui</h2><button className="workspace-primary" onClick={reset}>Yritä uudelleen</button></div>; }
