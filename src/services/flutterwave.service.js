const axios = require("axios");

const api = axios.create({
    baseURL: "https://api.flutterwave.com/v3",
    timeout: 30000,
    headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    },
});

/*
|--------------------------------------------------------------------------
| INITIALIZE PAYMENT
|--------------------------------------------------------------------------
| Creates a Flutterwave "Standard" payment session and returns a hosted
| payment link. The user is redirected there to pay, then Flutterwave
| redirects back to `redirect_url` with ?status & ?tx_ref query params.
*/
async function initializePayment({
    tx_ref,
    amount,
    email,
    name,
    phone,
    redirect_url,
}) {
    try {
        const { data } = await api.post("/payments", {
            tx_ref,
            amount,
            currency: "NGN",
            redirect_url,
            customer: {
                email,
                phonenumber: phone,
                name,
            },
            customizations: {
                title: "Lumina Wallet Funding",
                description: "Fund your Lumina wallet",
            },
        });

        if (data.status !== "success") {
            throw new Error(data.message || "Unable to initialize payment");
        }

        return data.data; // { link, ... }
    } catch (err) {
        if (err.response?.data) {
            throw new Error(
                err.response.data.message || "Flutterwave initialization error"
            );
        }
        throw new Error(err.message);
    }
}

/*
|--------------------------------------------------------------------------
| VERIFY PAYMENT (BY REFERENCE)
|--------------------------------------------------------------------------
| Always re-verify with Flutterwave directly server-side before crediting
| a wallet — never trust the redirect query params alone, since those are
| fully attacker-controllable on the client.
*/
async function verifyByReference(tx_ref) {
    try {
        const { data } = await api.get("/transactions/verify_by_reference", {
            params: { tx_ref },
        });

        if (data.status !== "success") {
            throw new Error(data.message || "Unable to verify transaction");
        }

        return data.data;
    } catch (err) {
        if (err.response?.data) {
            throw new Error(
                err.response.data.message || "Flutterwave verification error"
            );
        }
        throw new Error(err.message);
    }
}

module.exports = {
    initializePayment,
    verifyByReference,
};