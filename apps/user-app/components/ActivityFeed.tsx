"use client";
import Link from "next/link";

type FeedIncoming = {
  id: number;
  from: string;
  emoji: string;
  note: string;
  amount: string;
  color: string;
  time: string;
  positive: true;
};

type FeedOutgoing = {
  id: number;
  to: string;
  emoji: string;
  note: string;
  amount: string;
  color: string;
  time: string;
  positive: false;
};

type FeedItem = FeedIncoming | FeedOutgoing;

const FEED: readonly FeedItem[] = [
  {
    id: 1,
    from: "Priya S.",
    emoji: "🍕",
    note: "Pizza night!",
    amount: "+₹350",
    color: "bg-pink-500",
    time: "2 min ago",
    positive: true,
  },
  {
    id: 2,
    to: "Rahul M.",
    emoji: "🎬",
    note: "Movie tickets",
    amount: "-₹600",
    color: "bg-indigo-500",
    time: "1 hr ago",
    positive: false,
  },
  {
    id: 3,
    from: "Ananya K.",
    emoji: "☕",
    note: "Coffee",
    amount: "+₹120",
    color: "bg-blue-500",
    time: "3 hr ago",
    positive: true,
  },
  {
    id: 4,
    to: "Vikram P.",
    emoji: "🏠",
    note: "Rent split",
    amount: "-₹4,500",
    color: "bg-orange-500",
    time: "Yesterday",
    positive: false,
  },
  {
    id: 5,
    from: "Sneha R.",
    emoji: "🎂",
    note: "Birthday dinner",
    amount: "+₹800",
    color: "bg-teal-500",
    time: "2 days ago",
    positive: true,
  },
] as const;

export function ActivityFeed() {
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-black/80">
          Activity preview
        </span>
        <Link
          href="/transactions"
          className="text-xs text-[#2E89FF] font-semibold hover:underline"
        >
          See all
        </Link>
      </div>

      <div className="divide-y divide-black/10">
        {FEED.map((item) => {
          const name = item.positive ? item.from : item.to;
          return (
            <div key={item.id} className="flex items-center gap-3 py-4">
              <div
                className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
              >
                {name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-black truncate">
                  {item.positive ? name : `You → ${name}`}
                </p>
                <p className="text-xs text-black/55 flex items-center gap-1">
                  <span>{item.emoji}</span>
                  <span className="truncate">{item.note}</span>
                  <span className="text-black/20">·</span>
                  <span className="flex-shrink-0">{item.time}</span>
                </p>
              </div>
              <span
                className={`text-sm font-bold flex-shrink-0 ${item.positive ? "text-blue-600" : "text-black/55"}`}
              >
                {item.amount}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-black/40">
        Illustrative activity · Your payments appear after sign-in
      </p>
    </div>
  );
}
