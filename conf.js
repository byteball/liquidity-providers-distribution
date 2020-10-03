exports.bServeAsHub = false;
exports.bLight = true;
exports.bSingleAddress = true;


exports.bIgnoreUnpairRequests = true;
exports.hub = process.env.testnet ? 'obyte.org/bb-test' : 'obyte.org/bb';
exports.assets_summary_url = "http://cmc.papabyte.com/api/v1/summary";

exports.assets_keeper_aa = "LCCZRLRHTYKPC3LUGGAPQ2AQJ2XMCXP7";

exports.first_distribution_datetime = "2020-10-03T12:00:00.000Z";
exports.hoursBetweenDistributions = 1; // 7 * 24
exports.distribution_amount = process.env.testnet ? 10e6 : 100e9; // in bytes

exports.eligiblePools = process.env.testnet ? {

	HZCD3MDGCLU2G2IVYGGTMTZXS7DII2O5: {coeff: 100}, //OUSD-GBYTE
	G6BGN6PBZEABBWJF2I42XYHVDWI3E5KT: {coeff: 100} //GRAU-OUSD
} : 
{

};