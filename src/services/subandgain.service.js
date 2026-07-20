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
| Generic GET Request
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

        if (data.error) {
            throw new Error(
                data.description ||
                data.error ||
                "SubAndGain Error"
            );
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

        throw new Error(err.message);
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

}/*
|--------------------------------------------------------------------------
| DATA
|--------------------------------------------------------------------------
*/

/**
 * Buy Data
 */
async function buyData({
    network,
    dataPlan,
    phone,
}) {

    const apiNetwork = NETWORKS[network];

    if (!apiNetwork) {
        throw new Error("Unsupported Network");
    }

    console.log("SENDING TO SUBANDGAIN");
    console.log({
        network: apiNetwork,
        dataPlan,
        phoneNumber: phone,
    });

    return request("/data.php", {
        network: apiNetwork,
        dataPlan,
        phoneNumber: phone,
    });

}

/*
|--------------------------------------------------------------------------
| QUERY DATA
|--------------------------------------------------------------------------
*/

async function queryData(trans_id) {

    return request("/query_data.php", {
        trans_id,
    });

}

/*
|--------------------------------------------------------------------------
| GET DATA PLANS
|--------------------------------------------------------------------------
*/

async function getDataPlans(network) {

    const apiNetwork = NETWORKS[network];

    if (!apiNetwork) {
        throw new Error("Unsupported Network");
    }

    const bundles = await request("/databundles.php");

    const networkData = bundles.find(
        item => item.NETWORK === apiNetwork
    );

    if (!networkData) {
        throw new Error("Network not found");
    }

    return networkData.BUNDLE.map(plan => {

        // SubAndGain price
        const providerPrice = Number(
            plan.price?.[0]?.api_user || 0
        );

        // Your selling price
        const sellingPrice =
            providerPrice + (pricing.data || 0);

        return {
            id: plan.dataPlan,
            code: plan.dataPlan,
            name: plan.dataBundle,
            validity: plan.duration,
            network: apiNetwork,

            // Provider price
            providerPrice,

            // Price shown to your users
            price: sellingPrice,
        };

    });

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
| VERIFY CABLE CUSTOMER
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
| BUY CABLE
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
| QUERY CABLE
|--------------------------------------------------------------------------
*/

async function queryCable(trans_id) {

    return request("/query_bills.php", {
        trans_id,
    });

}

/*
|--------------------------------------------------------------------------
| GET CABLE PACKAGES
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
        .map(plan => {

            const providerPrice = Number(plan.price);

            return {

                code: plan.billsCode,

                name: plan.package,

                service: apiService,

                // SubAndGain price
                providerPrice,

                // Price shown in your app
                price: providerPrice + (pricing.cable || 0),

            };

        });

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

/*
|--------------------------------------------------------------------------
| EDUCATION
|--------------------------------------------------------------------------
*/

async function getEducationProducts() {

    const products = await request("/edu_prices.php");

    return products.map(item => ({
        code: item.eduType,
        name: item.package,

        // Provider price
        providerPrice: Number(item.price),

        // Selling price (provider + your profit)
        price: Number(item.price) + pricing.education,
    }));
}

async function buyEducation({ eduType }) {

    return request("/education.php", {
        eduType,
    });

}

async function queryEducation(trans_id) {

    return request("/query_education.php", {
        trans_id,
    });

}

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
    // Airtime
    buyAirtime,
    queryAirtime,

    // Data
    buyData,
    getDataPlans,

    // Cable
    verifyCable,
    buyCable,
    getCablePackages,

    // Electricity
    getDiscos,
    verifyElectricity,
    payElectricity,

    // Education
    getEducationProducts,
    buyEducation,
    queryEducation,
};