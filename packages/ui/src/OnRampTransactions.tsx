"use client";

interface Transaction {
    id: number;
    time: Date;
    amount: number;
    status: string;
    provider: string;
}

const statusStyles: Record<string, string> = {
    Success:    "bg-[#1068c0]/10 text-[#1068c0] ring-1 ring-[#1068c0]/20",
    Failure:    "bg-red-500/10 text-red-400 ring-1 ring-red-500/20",
    Processing: "bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20",
};

export const OnRampTransactions = ({ transactions }: { transactions: Transaction[] }) => {
    if (!transactions.length) {
        return (
            <div className="border border-[#2A2A2A] rounded-2xl p-6 bg-[#161616] w-full">
                <p className="text-base font-bold text-white mb-4">Recent Transactions</p>
                <div className="flex flex-col items-center justify-center py-10 text-[#A0A0A0]">
                    <span className="text-4xl mb-3">💸</span>
                    <span className="text-sm">No transactions yet</span>
                </div>
            </div>
        );
    }

    return (
        <div className="border border-[#2A2A2A] rounded-2xl bg-[#161616] w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2A2A2A]">
                <p className="text-base font-bold text-white">Recent Transactions</p>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
                {transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-[#1E1E1E] transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#1068c0]/10 flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#1068c0" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Received INR</p>
                                <p className="text-xs text-[#A0A0A0]">
                                    {new Date(t.time).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    {" · "}via {t.provider}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-bold text-[#1068c0]">+₹{(t.amount / 100).toFixed(2)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[t.status] ?? "bg-white/5 text-[#A0A0A0]"}`}>
                                {t.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
