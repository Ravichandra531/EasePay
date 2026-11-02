import { Button } from "./button";

interface AppbarProps {
    user?: { name?: string | null };
    onSignin: () => void;
    onSignout: () => void;
}

export const Appbar = ({ user, onSignin, onSignout }: AppbarProps) => {
    return (
        <div className="fixed top-0 left-0 right-0 z-20 flex justify-between items-center border-b border-[#2A2A2A] bg-[#0F0F0F]/95 backdrop-blur-md px-6 h-16">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#1068c0] rounded-xl flex items-center justify-center shadow-sm shadow-[#1068c0]/20">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="#0F0F0F" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                    </svg>
                </div>
                <span className="text-base font-black text-white tracking-tight">EasePay</span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
                {user && (
                    <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-8 h-8 rounded-full bg-[#1068c0] flex items-center justify-center text-[#0F0F0F] text-xs font-black ring-2 ring-[#1068c0]/20">
                            {(user.name ?? "U")[0]?.toUpperCase()}
                        </div>
                        <span className="hidden sm:block font-medium text-[#A0A0A0]">{user.name || "User"}</span>
                    </div>
                )}
                <Button onClick={user ? onSignout : onSignin}>
                    {user ? "Logout" : "Login"}
                </Button>
            </div>
        </div>
    );
};
