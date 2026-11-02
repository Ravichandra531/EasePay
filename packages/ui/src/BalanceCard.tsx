"use client";

interface BalanceCardProps {
    amount: number;
    locked: number;
}

export const BalanceCard = ({ amount, locked }: BalanceCardProps) => {
    return (
        <div className="rounded-2xl overflow-hidden border border-[#2A2A2A] w-full">
            {/* Header */}
            <div className="bg-[#161616] px-6 py-5 border-b border-[#2A2A2A]">
                <p className="text-[#A0A0A0] text-xs font-medium uppercase tracking-wider mb-1">Available Balance</p>
                <p className="text-white text-3xl font-black">₹ {(amount / 100).toFixed(2)}</p>
                <div className="mt-2 h-1 w-16 rounded-full bg-[#1068c0]/60" />
            </div>
            {/* Rows */}
            <div className="bg-[#161616] px-6 py-4 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                    <span className="text-[#A0A0A0] text-sm">Unlocked</span>
                    <span className="font-semibold text-white">₹ {(amount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                    <span className="text-[#A0A0A0] text-sm">Locked</span>
                    <span className="font-semibold text-[#A0A0A0]">₹ {(locked / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                    <span className="text-[#F5F5F5] font-semibold text-sm">Total</span>
                    <span className="font-black text-[#1068c0] text-lg">₹ {((amount + locked) / 100).toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};
