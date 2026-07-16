const axios = require('axios');

const api = axios.create({
    baseURL: process.env.SUBANDGAIN_BASE_URL,
    timeout: 30000,
});

const username = process.env.SUBANDGAIN_USERNAME;
const apiKey = process.env.SUBANDGAIN_API_KEY;

/**
 * Buy Airtime
 */
async function buyAirtime({
    network,
    phone,
    amount,
}) {
    try {

        const response = await api.get('/airtime.php', {
            params: {
                username,
                apiKey,
                network,
                phoneNumber: phone,
                amount,
            },
        });

        console.log(response.data);

        return response.data;

    } catch (err) {

        if (err.response) {
            throw new Error(
                err.response.data?.message ||
                'SubAndGain Airtime API Error'
            );
        }

        throw new Error(err.message);
    }
}

module.exports = {
    buyAirtime,
};