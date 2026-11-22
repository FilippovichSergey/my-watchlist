/**
 * Shown while the server is still fetching the list: the shape of the home page, so nothing jumps when the
 * content arrives. It lives in this route group on purpose: a loading boundary streams the page shell with
 * status 200, which would turn the title page's not-found answer into a soft 404.
 */
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
