import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MerchantCheckout } from "@/components/MerchantCheckout";
import { payMerchant } from "@/lib/actions/merchant";
jest.mock("@/lib/actions/merchant", () => ({ payMerchant: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () => "00000000-0000-4000-8000-000000000001",
  });
});
test("unsigned visitors receive a sign-in link returning to the merchant", () => {
  render(
    <MerchantCheckout
      slug="merchant123"
      name="Daily Grind"
      signedIn={false}
      balance={0}
    />,
  );
  expect(screen.getByRole("link", { name: /Sign in to pay/ })).toHaveAttribute(
    "href",
    "/login?callbackUrl=%2Fpay%2Fmerchant123",
  );
  expect(payMerchant).not.toHaveBeenCalled();
});
test("merchant payment requires review before sending and yields a receipt", async () => {
  jest
    .mocked(payMerchant)
    .mockResolvedValue({
      success: true,
      message: "Paid Daily Grind",
      reference: "PAY-42",
    });
  render(
    <MerchantCheckout
      slug="merchant123"
      name="Daily Grind"
      signedIn
      balance={50000}
    />,
  );
  fireEvent.change(screen.getByLabelText("How much would you like to pay?"), {
    target: { value: "125.50" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Review payment/ }));
  expect(payMerchant).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /Confirm & pay/ }));
  await waitFor(() =>
    expect(payMerchant).toHaveBeenCalledWith(
      "merchant123",
      12550,
      "00000000-0000-4000-8000-000000000001",
    ),
  );
  expect(await screen.findByText("Receipt PAY-42")).toBeInTheDocument();
});
test("insufficient funds never submit merchant payment", () => {
  render(
    <MerchantCheckout
      slug="merchant123"
      name="Daily Grind"
      signedIn
      balance={100}
    />,
  );
  fireEvent.change(screen.getByLabelText("How much would you like to pay?"), {
    target: { value: "10" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Review payment/ }));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Not enough wallet funds",
  );
  expect(payMerchant).not.toHaveBeenCalled();
});
