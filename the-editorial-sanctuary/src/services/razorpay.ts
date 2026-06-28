/**
 * Razorpay Standard Web Checkout helpers.
 * This file avoids scattering Razorpay global typings across App.tsx.
 */
export type RazorpaySuccessCallback = (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}) => void;

export type RazorpayErrorCallback = (error: unknown) => void;

declare global {
    interface Window {
        Razorpay?: any;
    }
}

export function loadRazorpayCheckoutScript(src = "https://checkout.razorpay.com/v1/checkout.js"): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined") return reject(new Error("window is undefined"));
        if (window.Razorpay) return resolve();

        const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
        if (existing) {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout.js")));
            return;
        }

        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Razorpay checkout.js"));
        document.body.appendChild(s);
    });
}
