export default function Loading() {
  return (
    <div className="py-10 animate-pulse" aria-label="Loading wallet">
      <div className="h-8 w-48 bg-white/5 rounded-lg mb-8" />
      <div className="h-56 bg-white/5 rounded-3xl mb-6" />
      <div className="h-72 bg-white/5 rounded-3xl" />
    </div>
  );
}
