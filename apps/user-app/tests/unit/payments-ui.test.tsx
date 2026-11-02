import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BankPayment } from "@/components/BankPayment";
import { TransferClient } from "@/components/TransferClient";
import { settleSandboxPayment } from "@/lib/actions/settleSandboxPayment";
import { createOnRampTransaction } from "@/lib/actions/createOnRampTransaction";
import { p2pTransfer } from "@/lib/actions/p2pTransfer";
const mockPush = jest.fn(),
  mockReplace = jest.fn(),
  mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
}));
jest.mock("@/lib/actions/settleSandboxPayment", () => ({
  settleSandboxPayment: jest.fn(),
}));
jest.mock("@/lib/actions/createOnRampTransaction", () => ({
  createOnRampTransaction: jest.fn(),
}));
jest.mock("@/lib/actions/p2pTransfer", () => ({ p2pTransfer: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () => "00000000-0000-4000-8000-000000000001",
  });
});

test("sandbox controls are absent when disabled or payment is complete", () => {
  const { rerender } = render(
    <BankPayment token="token" status="Processing" enabled={false} />,
  );
  expect(
    screen.queryByRole("button", { name: "Approve demo payment" }),
  ).not.toBeInTheDocument();
  rerender(<BankPayment token="token" status="Success" enabled />);
  expect(
    screen.getByText("Payment complete. Funds are in your wallet."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Approve demo payment" }),
  ).not.toBeInTheDocument();
});
test("approving a sandbox payment invokes settlement then refreshes", async () => {
  jest
    .mocked(settleSandboxPayment)
    .mockResolvedValue({ success: true, message: "Payment complete" });
  render(<BankPayment token="token" status="Processing" enabled />);
  fireEvent.click(screen.getByRole("button", { name: "Approve demo payment" }));
  await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  expect(settleSandboxPayment).toHaveBeenCalledWith("token", "Success");
});
test("add money navigates to the payment URL with an exact paise amount", async () => {
  jest.mocked(createOnRampTransaction).mockResolvedValue({
    success: true,
    message: "Created",
    redirectUrl: "/bank/token",
    token: "00000000-0000-4000-8000-000000000001",
  });
  render(
    <TransferClient balance={{ amount: 50000, locked: 0 }} initialTab="add" />,
  );
  fireEvent.change(screen.getByLabelText("Amount in rupees"), {
    target: { value: "12.50" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Continue to payment →" }),
  );
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/bank/token"));
  expect(createOnRampTransaction).toHaveBeenCalledWith(1250, "HDFC Bank");
});
test("send money requires recipient selection and review before moving funds", async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ users: [{ name: "Bob", number: "9999999002" }] }),
  });
  jest.mocked(p2pTransfer).mockResolvedValue({
    success: true,
    message: "Money sent to Bob",
    transactionId: 42,
  });
  render(
    <TransferClient balance={{ amount: 50000, locked: 0 }} initialTab="send" />,
  );
  fireEvent.change(screen.getByLabelText("Recipient name or phone number"), {
    target: { value: "Bob" },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: /Bob 9999999002/ }),
  );
  fireEvent.change(screen.getByLabelText("Amount in rupees"), {
    target: { value: "10.01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review payment →" }));
  expect(p2pTransfer).not.toHaveBeenCalled();
  expect(screen.getByText("Review your payment")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm & send payment" }),
  );
  await waitFor(() =>
    expect(p2pTransfer).toHaveBeenCalledWith(
      "9999999002",
      1001,
      "00000000-0000-4000-8000-000000000001",
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("Money sent to Bob"),
  );
});
