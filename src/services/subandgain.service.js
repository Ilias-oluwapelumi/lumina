const axios = require("axios");

const api = axios.create({
    baseURL: process.env.SUBANDGAIN_BASE_URL,
    timeout: 30000,
});

const username = process.env.SUBANDGAIN_USERNAME;
const apiKey = process.env.SUBANDGAIN_API_KEY;

/*
|--------------------------------------------------------------------------
| NETWORK MAPPING
|--------------------------------------------------------------------------
*/

const NETWORKS = {
    MTN: "MTN",
    Airtel: "AIRTEL",
    Glo: "GLO",
    "9Mobile": "9MOBILE",
};

/*
|--------------------------------------------------------------------------
| Generic Request Function
|--------------------------------------------------------------------------
*/

async function request(endpoint, params = {}) {
    try {

        console.log("==================================");
        console.log("SUBANDGAIN REQUEST");
        console.log(endpoint);
        console.log(params);
        console.log("==================================");

        const { data } = await api.get(endpoint, {
            params: {
                username,
                apiKey,
                ...params,
            },
        });

        console.log("==================================");
        console.log("SUBANDGAIN RESPONSE");
        console.log(data);
        console.log("==================================");

        // Provider returned an error
        if (data.error) {
            throw new Error(data.description || data.error);
        }

        return data;

    } catch (err) {

        if (err.response?.data) {

            throw new Error(
                err.response.data.description ||
                err.response.data.error ||
                "SubAndGain Error"
            );

        }

        throw err;
    }
}

/*
|--------------------------------------------------------------------------
| AIRTIME
|--------------------------------------------------------------------------
*/

async function buyAirtime({
    network,
    phone,
    amount,
}) {

    const apiNetwork = NETWORKS[network];

    if (!apiNetwork) {
        throw new Error("Unsupported Network");
    }

    return request("/airtime.php", {
        network: apiNetwork,
        phoneNumber: phone,
        amount,
    });

}

/*
|--------------------------------------------------------------------------
| QUERY AIRTIME
|--------------------------------------------------------------------------
*/

async function queryAirtime(trans_id) {

    return request("/query_airtime.php", {
        trans_id,
    });

}
/**
 * Buy Data
 */
async function buyData({
    network,
    dataPlan,
    phone,
}) {
    try {

        const response = await api.get("/data.php", {
            params: {
                username,
                apiKey,
                network: network.toUpperCase(),
                dataPlan,
                phoneNumber: phone,
            },
        });

        console.log("FULL SUBANDGAIN DATA RESPONSE");
        console.log(response.data);

        return response.data;

    } catch (err) {

        if (err.response) {
            throw new Error(
                err.response.data?.description ||
                err.response.data?.message ||
                "SubAndGain Data API Error"
            );
        }

        throw new Error(err.message);
    }
}

/**
 * Get Data Bundles
 */
async function getDataBundles() {
    try {

        const response = await api.get("/databundles.php");

        return response.data;

    } catch (err) {

        if (err.response) {
            throw new Error(
                err.response.data?.description ||
                "Unable to fetch data bundles"
            );
        }

        throw new Error(err.message);
    }
}

module.exports = {

    buyAirtime,
    queryAirtime,
    buyData,
    getDataBundles,


    queryAirtime,
};
