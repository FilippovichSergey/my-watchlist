/** Shown while the server is still fetching: the shape of the page, so nothing jumps when the content arrives. */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-[14px] desk:grid desk:grid-cols-[250px_minmax(0,1fr)] desk:items-start desk:gap-6">
      <div className="card hidden h-[520px] desk:block" />
      <div className="flex min-w-0 flex-col gap-[14px] desk:gap-5">
        <div className="card h-[66px] rounded-xl" />
        <div className="h-11 rounded-xl border border-line bg-card" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card h-[156px] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
