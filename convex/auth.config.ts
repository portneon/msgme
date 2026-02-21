/**
 * Tells Convex to verify JWTs issued by Clerk.
 * Convex fetches public keys from <domain>/.well-known/jwks.json
 */
export default {
    providers: [
        {
            domain: "https://sure-heron-36.clerk.accounts.dev",
            applicationID: "convex",
        },
    ],
};
