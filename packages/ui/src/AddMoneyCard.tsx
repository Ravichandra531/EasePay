"use client";

import { useState } from "react";
import { Button } from "./button";

const BANKS = [
    { name: "HDFC Bank" },
    { name: "Axis Bank" },
];

interface AddMoneyCardProps {
    onAddMoney: (amount: number, provider: string) => Promise<{ success: boolean; message: string; redirectUrl?: string }>;
}

export const AddMoneyCard = ({ onAddMoney }: AddMoneyCardProps) => {
    const [amount, setAmount] = useState("");
    const [provider, setProvider] = useState(BANKS[0]!.name);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

    const handleSubmit = async () => {
        const parsed = parseFloat(amount);
        if (!amount || isNaN(parsed) || parsed <= 0) {
            setMessage({ text: "Please enter a valid amount", success: false });
            return;
        }

        setLoading(true);
        setMessage(null);

        const result = await onAddMoney(Math.round(parsed * 100), provider);
        setMessage({ text: result.message, success: result.success });

        if (result.success) {
            setAmount("");
            if (result.redirectUrl?.startsWith("/") && !result.redirectUrl.startsWith("//")) window.location.assign(result.redirectUrl);
        }

        setLoading(false);
    };

    return (
        <div className="border border-slate-200 rounded-2xl shadow-sm p-6 bg-white w-full">
            <div className="text-xl font-semibold text-slate-700 mb-4">Add Money</div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 mb-1">Amount (₹)</label>
                <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6a51a6] focus:border-transparent"
                />
            </div>

            <div className="mb-5">
                <label className="block text-sm font-medium text-slate-600 mb-1">Bank</label>
                <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6a51a6] focus:border-transparent bg-white"
                >
                    {BANKS.map((b) => (
                        <option key={b.name} value={b.name}>
                            {b.name}
                        </option>
                    ))}
                </select>
            </div>

            {message && (
                <div
                    className={`mb-4 text-sm px-3 py-2 rounded-lg ${
                        message.success
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                >
                    {message.text}
                </div>
            )}

            <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Processing..." : "Add Money"}
            </Button>
        </div>
    );
};
