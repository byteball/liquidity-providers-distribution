exports.bServeAsHub = false;
exports.bLight = true;
exports.bSingleAddress = true;


exports.bIgnoreUnpairRequests = true;
exports.hub = process.env.testnet ? 'obyte.org/bb-test' : 'obyte.org/bb';
exports.assets_data_url = process.env.testnet ? "http://cmc.papabyte.com/api/v1/assets" : "https://data.ostable.org/api/v1/assets";

exports.assets_locker_aa = "M3CQWMSWHEWJ4J7HNAQFEJQKCMG2YDMH";
exports.token_registry_aa_address = process.env.testnet ? "O6H6ZIFI57X3PLTYHOCVYPP5A553CYFQ" : "O6H6ZIFI57X3PLTYHOCVYPP5A553CYFQ";

exports.first_distribution_datetime = "2020-10-08 06:30:00"; //UTC
exports.hoursBetweenDistributions = process.env.testnet ? 2 : 7 * 24;
exports.distribution_amount = process.env.testnet ? 1e9 : 100e9; // in bytes

exports.webServerPort = process.env.testnet ? 4031 : 4030;
exports.explorer_base_url = process.env.testnet ? "https://testnetexplorer.obyte.org" : "https://explorer.obyte.org";
exports.oswap_base_url = process.env.testnet ? "https://testnet.oswap.io/#/add-liquidity/" : "https://oswap.io/#/add-liquidity/";
exports.oswap_main_url = process.env.testnet ? "https://testnet.oswap.io" : "https://oswap.io";

exports.eligiblePools = process.env.testnet ? {
	HZCD3MDGCLU2G2IVYGGTMTZXS7DII2O5: {coeff: 50}, //OUSD-GBYTE
	G6BGN6PBZEABBWJF2I42XYHVDWI3E5KT: {coeff: 100} //GRAU-OUSD
} : 
{

};