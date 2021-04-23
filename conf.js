exports.bServeAsHub = false;
exports.bLight = true;
exports.bSingleAddress = true;


exports.bIgnoreUnpairRequests = true;
exports.hub = process.env.testnet ? 'obyte.org/bb-test' : 'obyte.org/bb';
exports.assets_data_url = process.env.testnet ? "http://cmc.papabyte.com/api/v1/assets" : "https://data.ostable.org/api/v1/assets";

exports.assets_locker_aa = "7AUBFK4YAUGUF3RWWYRFXXF7BBWY2V7Y";
exports.lock_period_in_days = 7;
exports.token_registry_aa_address = process.env.testnet ? "O6H6ZIFI57X3PLTYHOCVYPP5A553CYFQ" : "O6H6ZIFI57X3PLTYHOCVYPP5A553CYFQ";

exports.first_distribution_datetime = "2020-10-28 12:00:00"; //UTC
exports.hoursBetweenDistributions = process.env.testnet ? 2 : 7 * 24;
exports.distribution_amount = process.env.testnet ? 1e9 : 100e9; // in bytes

exports.webServerPort = process.env.testnet ? 4031 : 4030;
exports.explorer_base_url = process.env.testnet ? "https://testnetexplorer.obyte.org" : "https://explorer.obyte.org";
exports.oswap_base_url = process.env.testnet ? "https://testnet.oswap.io/#/add-liquidity/" : "https://oswap.io/#/add-liquidity/";
exports.oswap_main_url = process.env.testnet ? "https://testnet.oswap.io" : "https://oswap.io";
exports.wallet_uri = process.env.testnet ? "obyte-tn" : "obyte";

exports.eligiblePools = process.env.testnet ?
	{
		HZCD3MDGCLU2G2IVYGGTMTZXS7DII2O5: { coeff: 0.5 }, // OUSD-GBYTE
		G6BGN6PBZEABBWJF2I42XYHVDWI3E5KT: { coeff: 1 } // GRAU-OUSD
	}
	:
	{
		AR3SHS7SFH3PF6ZM6UIF7HWIV44TZ46H: { coeff: 1 }, // IUSD-OUSD
		O4PXOZZ655Q53PDYLKW3GYN22U4RKO5R: { coeff: 1 }, // IBIT-OBIT
		YGOUPTI7UXYPNUNWW3SSD4H7SWN5D6SN: { coeff: 1 }, // IAU-OAU
		L553WBVMGVOGK2CFPHDF4XJR74JBYHQG: { coeff: 1 }, // IGB-OGB

		WGXHCMIBZRYHDHQPR253UTRPMEGDQDDY: { coeff: 1 }, // GBYTE-OUSD
		VI7TK23R2QHFRFRQSLO2QZQEWMEGMMLF: { coeff: 1 }, // GBYTE-OBIT
		NKWC7MJO366YB3VNW33A4EQFUZCAE7WC: { coeff: 1 }, // GBYTE-OGB

		QFIBPWBW6ADYSIZPTJ2FAHNARLHPGAN4: { coeff: 1 }, // OBIT-OUSD
		C3XRJVE5RGJLTZ2V3K3NLS2IY5RIQPRI: { coeff: 1 }, // OAU-OUSD

		'5V3DVQ7LTONTE7XN5U7NL7Q625CYD2RV': { coeff: 1 }, // GBYTE-OETH
		A6BRE6PSZC3W5RDIKU6KSF6FLP3UYKCZ: { coeff: 1 }, // ITH-OETH

		FU3CNEGHP23BJNX5CVJ2TKNGOSBEARE5: { coeff: 2 }, // OUSDV2-OBITV2
		IX3BHPN433VVJCBZKT4UBSDGFSRW4TD5: { coeff: 2 }, // OUSDV2-OETHV2
		NG6WS5CJ6WSG2GRZLWZQ2RBI5WQH7WKO: { coeff: 2 }, // OETHV2-OBITV2
	};
