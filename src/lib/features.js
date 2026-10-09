// Feature switches read at build time. Keep each one documented in .env.example.

// Sign in with Apple needs an Apple Developer Services ID + key configured in Firebase
// (Authentication → Sign-in method → Apple). Until then the button stays hidden,
// otherwise every click fails with auth/operation-not-allowed.
export const APPLE_SIGNIN_ENABLED = import.meta.env.VITE_ENABLE_APPLE_SIGNIN === "true";
