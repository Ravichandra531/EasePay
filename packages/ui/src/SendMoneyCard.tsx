"use client";

import { useRef, useState } from "react";
import { Button } from "./button";

interface SendMoneyCardProps {
    onTransfer: (to: string, amount: number, requestId: string) => Promise<{ success: boolean; message: string }>;
}

export const SendMoneyCard = ({ onTransfer }: SendMoneyCardProps) => {
    const requestId = useRef<string | null>(null);
    const [phone, setPhone] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

    const handleSubmit = async () => {
        const parsedAmount = parseFloat(amount);
        if (!phone || phone.length < 10) {
            setMessage({ text: "Please enter a valid phone number", success: false });
            return;
        }
        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            setMessage({ text: "Please enter a valid amount", success: false });
            return;
        }

        setLoading(true);
        setMessage(null);

        const result = await onTransfer(phone, Math.round(parsedAmount * 100), requestId.current ?? (requestId.current = crypto.randomUUID()));
        setMessage({ text: result.message, success: result.success });

        if (result.success) {
            requestId.current = null;
            setPhone("");
            setAmount("");
        }

        setLoading(false);
    };

    return (
        <div className="border border-slate-200 rounded-2xl shadow-sm p-6 bg-white w-full">
            <div className="text-xl font-semibold text-slate-700 mb-4">Send Money</div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 mb-1">
                    Recipient Phone Number
                </label>
                <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    maxLength={15}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6a51a6] focus:border-transparent"
                />
            </div>

            <div className="mb-5">
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
                {loading ? "Sending..." : "Send Money"}
            </Button>
        </div>
    );
};
