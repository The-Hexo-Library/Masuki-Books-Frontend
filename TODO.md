# TODO: Razorpay Standard Web Checkout Integration

## Backend
- [ ] Detect existing checkout/payment flow usage and required endpoints
- [ ] Add backend endpoint: `POST /api/create-order` (Razorpay order creation)
- [ ] Add backend endpoint: `POST /api/verify-payment` (HMAC-SHA256 signature verification)
- [ ] Add backend Razorpay signature verification service (server-side only)

## Frontend
- [ ] Add Razorpay Standard Checkout UI/modal flow on the existing checkout page
- [ ] Add frontend API calls for `create-order` and `verify-payment`
- [ ] Ensure `payment.failed` and user-dismiss handling shows errors

## Environment / Security
- [ ] Create `.env` with `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (server-side only)
- [ ] Add `VITE_RAZORPAY_KEY_ID` for frontend usage (never KEY_SECRET)
- [ ] Add `.env` to `.gitignore`

## Verification
- [ ] Start backend + frontend
- [ ] Click checkout, complete Razorpay test payment, verify library unlock
- [ ] Test signature mismatch returns 400 and does NOT unlock content
