const axios = require("axios");
const pricing = require("../config/pricing");

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
        console.log("SENDING TO SUBANDGAIN");
console.log({
    network: network.toUpperCase(),
    dataPlan,
    
    phoneNumber: phone,
});

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

async function getDataPlans(network) {

    const apiNetwork = NETWORKS[network];

    if (!apiNetwork) {
        throw new Error("Unsupported Network");
    }

    const bundles = await request("/databundles.php");

    // Find the requested network
    const networkData = bundles.find(
        item => item.NETWORK === apiNetwork
    );

    if (!networkData) {
        throw new Error("Network not found");
    }
    console.log(networkData.BUNDLE[0]);

   const PROFIT = 100;

return networkData.BUNDLE.map(plan => ({
    id: plan.dataPlan,
    name: plan.dataBundle,
    validity: plan.duration,
    network: apiNetwork,
    price: Number(plan.price[0].api_user) + pricing.data,

   
}));
}

/*
|--------------------------------------------------------------------------
| CABLE TV
|--------------------------------------------------------------------------
*/

const CABLE_SERVICES = {
    DSTV: "DSTV",
    GOtv: "GOTV",
    GOTV: "GOTV",
    Gotv: "GOTV",

    StarTimes: "STARTIMES",
    STARTIMES: "STARTIMES",
    Startimes: "STARTIMES",
};

/*
|--------------------------------------------------------------------------
| Verify Cable Customer
|--------------------------------------------------------------------------
*/

async function verifyCable({
    service,
    smartNumber,
}) {

    const apiService = CABLE_SERVICES[service];

    if (!apiService) {
        throw new Error("Unsupported Cable Provider");
    }

    return request("/verify_bills.php", {
        service: apiService,
        smartNumber,
    });

}

/*
|--------------------------------------------------------------------------
| Buy Cable
|--------------------------------------------------------------------------
*/

async function buyCable({
    service,
    bills_code,
    smartNumber,
}) {

    const apiService = CABLE_SERVICES[service];

    if (!apiService) {
        throw new Error("Unsupported Cable Provider");
    }

    return request("/bills.php", {
        service: apiService,
        bills_code,
        smartNumber,
    });

}

/*
|--------------------------------------------------------------------------
| Get Cable Packages
|--------------------------------------------------------------------------
*/
async function getCablePackages(service) {

    const apiService = CABLE_SERVICES[service];

    if (!apiService) {
        throw new Error("Unsupported Cable Provider");
    }

    const bundles = await request("/cablebundles.php");

    const provider = bundles.find(
        item => item.SERVICE === apiService
    );

    if (!provider) {
        throw new Error("Cable Provider not found");
    }

    return provider.BUNDLE
        .filter(plan => plan.status === "Active")
        .map(plan => ({
            code: plan.billsCode,
            name: plan.package,
            price: Number(plan.price),
            service: apiService,
        }));
}

/*
|--------------------------------------------------------------------------
| ELECTRICITY
|--------------------------------------------------------------------------
*/

const DISCOS = {
    IKEDC: "IKEDC",
    EKEDC: "EKEDC",
    AEDC: "AEDC",
    KEDC: "KEDC",
    JEDC: "JEDC",
    IBEDC: "IBEDC",
    KAEDC: "KAEDC",
    EEDC: "EEDC",
    PhED: "PhED",
    BEDC: "BEDC",
    ABA: "ABA",
    YEDC: "YEDC",
};

async function verifyElectricity({
    service,
    meterNumber,
    meterType,
}) {

    const apiService = DISCOS[service];

    if (!apiService) {
        throw new Error("Unsupported Disco");
    }

    return request("/verify_electricity.php", {
        service: apiService,
        meterNumber,
        meterType,
    });

}
async function payElectricity({
    service,
    meterNumber,
    meterType,
    accessToken,
    amount,
}) {

    const apiService = DISCOS[service];

    if (!apiService) {
        throw new Error("Unsupported Disco");
    }
    console.log({
  service,
  meterNumber,
  meterType,
});

    return request("/electricity.php", {
        service: apiService,
        meterNumber,
        meterType,
        accessToken,
        amount,
    });

}

async function getDiscos() {

    return [
        { code: "IKEDC", name: "Ikeja Electric" },
        { code: "EKEDC", name: "Eko Electric" },
        { code: "AEDC", name: "Abuja Electric" },
        { code: "KEDC", name: "Kano Electric" },
        { code: "JEDC", name: "Jos Electric" },
        { code: "IBEDC", name: "Ibadan Electric" },
        { code: "KAEDC", name: "Kaduna Electric" },
        { code: "EEDC", name: "Enugu Electric" },
        { code: "PhED", name: "Port Harcourt Electric" },
        { code: "BEDC", name: "Benin Electric" },
        { code: "ABA", name: "Aba Power" },
        { code: "YEDC", name: "Yola Electric" },
    ];

}


module.exports = {
    buyAirtime,
    queryAirtime,

    buyData,
    getDataPlans,

    verifyCable,
    buyCable,
    getCablePackages,

    verifyElectricity,
    payElectricity,
    getDiscos,
};
