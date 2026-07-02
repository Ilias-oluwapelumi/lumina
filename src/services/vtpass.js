const axios = require('axios');

const requestId = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${Date.now().toString().slice(-4)}`;
};

const getHeaders = (type = 'post') => ({
  'Content-Type': 'application/json',
  'api-key': process.env.VTPASS_API_KEY,
  ...(type === 'post'
    ? { 'secret-key': process.env.VTPASS_SECRET_KEY }
    : { 'public-key': process.env.VTPASS_PUBLIC_KEY }),
});

const vtGet = (path) => axios.get(`${process.env.VTPASS_BASE_URL}${path}`, { headers: getHeaders('get') });
const vtPost = (path, body) => axios.post(`${process.env.VTPASS_BASE_URL}${path}`, body, { headers: getHeaders('post') });

// ─── AIRTIME ─────────────────────────────────────────────────────────────────
const AIRTIME_SERVICE_IDS = {
  MTN: 'mtn', Airtel: 'airtel', Glo: 'glo', '9Mobile': 'etisalat',
};

exports.buyAirtime = async ({ network, phone, amount }) => {
  const serviceID = AIRTIME_SERVICE_IDS[network];
  if (!serviceID) throw new Error('Invalid network');
  const { data } = await vtPost('/pay', { request_id: requestId(), serviceID, amount, phone });
  if (data.code !== '000') throw new Error(data.response_description || 'Airtime purchase failed');
  return data;
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const DATA_SERVICE_IDS = {
  MTN: 'mtn-data', Airtel: 'airtel-data', Glo: 'glo-data', '9Mobile': 'etisalat-data',
};

exports.getDataPlans = async (network) => {
  const serviceID = DATA_SERVICE_IDS[network];
  if (!serviceID) throw new Error('Invalid network');
  const { data } = await vtGet(`/service-variations?serviceID=${serviceID}`);
  return data.content.variations.map(v => ({
    id: v.variation_code,
    name: v.name,
    price: parseFloat(v.variation_amount),
    validity: v.name,
  }));
};

exports.buyData = async ({ network, phone, planId, amount }) => {
  const serviceID = DATA_SERVICE_IDS[network];
  if (!serviceID) throw new Error('Invalid network');
  const { data } = await vtPost('/pay', {
    request_id: requestId(), serviceID,
    billersCode: phone, variation_code: planId, amount, phone,
  });
  if (data.code !== '000') throw new Error(data.response_description || 'Data purchase failed');
  return data;
};

// ─── ELECTRICITY ──────────────────────────────────────────────────────────────
const DISCO_SERVICE_IDS = {
  IKEDC: 'ikeja-electric', EKEDC: 'eko-electric',
  AEDC: 'abuja-electric', PHED: 'phed',
  IBEDC: 'ibadan-electric', KEDCO: 'kaduna-electric',
  JEDC: 'jos-electric', BEDC: 'benin-electric',
};

exports.verifyMeter = async ({ meterNumber, disco, meterType }) => {
  const serviceID = DISCO_SERVICE_IDS[disco];
  if (!serviceID) throw new Error('Invalid DISCO');
  const { data } = await vtPost('/merchant-verify', { billersCode: meterNumber, serviceID, type: meterType });
  if (!data.content?.Customer_Name) throw new Error('Meter verification failed');
  return { meterNumber, customerName: data.content.Customer_Name, address: data.content.Address || '', disco, meterType, minimumAmount: 500 };
};

exports.payElectricity = async ({ meterNumber, disco, meterType, amount, phone }) => {
  const serviceID = DISCO_SERVICE_IDS[disco];
  if (!serviceID) throw new Error('Invalid DISCO');
  const { data } = await vtPost('/pay', {
    request_id: requestId(), serviceID,
    billersCode: meterNumber, variation_code: meterType.toLowerCase(), amount, phone,
  });
  if (data.code !== '000') throw new Error(data.response_description || 'Electricity payment failed');
  return { token: data.purchased_code || data.content?.transactions?.product_name || 'N/A', units: data.content?.transactions?.units || '' };
};

// ─── CABLE TV ─────────────────────────────────────────────────────────────────
const CABLE_SERVICE_IDS = {
  DSTV: 'dstv', GOtv: 'gotv', StarTimes: 'startimes',
};

exports.getCablePlans = async (provider) => {
  const serviceID = CABLE_SERVICE_IDS[provider];
  if (!serviceID) throw new Error('Invalid provider');
  const { data } = await vtGet(`/service-variations?serviceID=${serviceID}`);
  return data.content.variations.map(v => ({ id: v.variation_code, name: v.name, price: parseFloat(v.variation_amount) }));
};

exports.verifyCableCard = async ({ smartCardNumber, provider }) => {
  const serviceID = CABLE_SERVICE_IDS[provider];
  if (!serviceID) throw new Error('Invalid provider');
  const { data } = await vtPost('/merchant-verify', { billersCode: smartCardNumber, serviceID });
  if (!data.content?.Customer_Name) throw new Error('Card verification failed');
  return { smartCardNumber, customerName: data.content.Customer_Name, currentBouquet: data.content.Current_Bouquet || '', provider, dueDate: data.content.Due_Date || '' };
};

exports.subscribeCable = async ({ smartCardNumber, provider, planId, amount, phone }) => {
  const serviceID = CABLE_SERVICE_IDS[provider];
  if (!serviceID) throw new Error('Invalid provider');
  const { data } = await vtPost('/pay', {
    request_id: requestId(), serviceID,
    billersCode: smartCardNumber, variation_code: planId, amount, phone,
  });
  if (data.code !== '000') throw new Error(data.response_description || 'Cable subscription failed');
  return data;
};