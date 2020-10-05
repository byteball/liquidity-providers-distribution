/*jslint node: true */
"use strict";
const eventBus = require('ocore/event_bus.js');
const headlessWallet = require('headless-obyte');
const conf = require('ocore/conf.js');
const constants = require('ocore/constants.js');

const db = require('ocore/db.js');
const validationUtils = require("ocore/validation_utils.js");
const mutex = require('ocore/mutex.js');
const dag = require('aabot/dag.js');
const fetch = require('node-fetch');
const sqlite_tables = require('./sqlite_tables.js');
const webserver = require('./webserver');

eventBus.on('headless_wallet_ready', start);

const eligiblePools = conf.eligiblePools;
const valueByPoolsAssets = {};
const infoByPoolAsset = {};
var my_address;

async function start(){
	await sqlite_tables.create();
	my_address = await headlessWallet.readSingleAddress();
	await discoverPoolAssets();
	console.log("eligiblePools")
	console.log(eligiblePools);
	webserver.start(infoByPoolAsset);
	distributeIfReady();
	makeNextDistribution();
	setInterval(makeNextDistribution, 60 * 1000);
	setInterval(distributeIfReady, 60 * 1000);

}

async function distributeIfReady(){
	const unlock = await mutex.lock(['distribute']);

	const rows = await db.query("SELECT datetime,id FROM distributions WHERE is_frozen=1 AND is_completed=0");

	if (!rows[0]){
		console.log("no distribution ready")
		return unlock();
	}
	const arrOutputs = await createDistributionOutputs(rows[0].id, rows[0].datetime)

	if (!arrOutputs) { // done
		db.query("UPDATE distributions SET is_completed=1 WHERE id=?", [rows[0].id], function() {});
		//return verifyDistribution(rows[0].id, rows[0].creation_date);
		return unlock();
	}
	var opts = {
		base_outputs: arrOutputs,
		change_address: my_address
	};
	console.log(opts);
	headlessWallet.sendMultiPayment(opts, async function(err, unit) {
		if (err) {
			//notifications.notifyAdmin("a payment failed", err);
			setTimeout(distributeIfReady, 300 * 1000);
			return unlock();

		} else {
			await db.query("UPDATE rewards SET payment_unit=? WHERE payout_address IN (?) AND distribution_id=?", 
			[unit, arrOutputs.map(o => o.address), rows[0].id]);
			setTimeout(distributeIfReady, 30 * 1000);
			return unlock();
		}
	});
}


async function createDistributionOutputs(distributionID, distributionDate, handleOutputs) {
	const rows = await db.query(
		"SELECT reward_amount,payout_address \n\
		FROM rewards \n\
		LEFT JOIN outputs \n\
			ON rewards.payout_address=outputs.address \n\
			AND asset IS NULL \n\
			AND (SELECT address FROM unit_authors WHERE unit_authors.unit=outputs.unit)=? \n\
			AND (SELECT creation_date FROM units WHERE units.unit=outputs.unit)>? \n\
			AND reward_amount=outputs.amount\n\
		WHERE outputs.address IS NULL \n\
			AND distribution_id=?  \n\
			AND payment_unit IS NULL \n\
		ORDER BY reward_amount \n\
		LIMIT ?", [my_address, distributionDate, distributionID, constants.MAX_OUTPUTS_PER_PAYMENT_MESSAGE-1]);
			if (rows.length === 0)
				return;
			var arrOutputs = [];
			rows.forEach(function(row) {
				arrOutputs.push({
					amount: row.reward_amount,
					address: row.payout_address
				});


			});
			return arrOutputs;

}


async function makeNextDistribution(){

	const unlock = await mutex.lockOrSkip(['make']);

	const rows = await db.query("SELECT is_frozen, is_completed,id FROM distributions ORDER BY id DESC LIMIT 1");
	if (rows[0].is_frozen && !rows[0].is_completed){
		console.log("Skip building, distribution ongoing");
		return unlock();
	}


	if (!await determinePoolAssetsValues()){
		console.log("couldn't determine pools assets values");
		return unlock();
	}

	try {
		var deposited_pools_assets = await dag.readAAStateVars(conf.assets_keeper_aa, "amount_");
	} catch(e){
		console.log("couldn't read assets_keeper_aa vars " + e.message);
		return unlock();
	}

	if (rows[0].is_completed) // the previous distribution is completed, let's create an id and a planned time for the next one
		await db.query("INSERT INTO distributions (datetime) VALUES ((SELECT datetime(datetime, '+"+ conf.hoursBetweenDistributions + " hours')\n\
		FROM distributions ORDER BY id DESC LIMIT 1))") // 

	const distri_id = (await db.query("SELECT MAX(id) AS id FROM distributions"))[0].id;

	const poolsAssetsValuesByAddresses = {};
	var total_value = 0;
	var total_weighted_value = 0;
	console.log(deposited_pools_assets);
	for (var key in deposited_pools_assets){
		const address = key.split("_")[2];
		if (!validationUtils.isValidAddress(address))
			throw Error("Invalid address: " + address);
		const asset = key.split("_")[1];
		if (!validationUtils.isValidBase64(asset, constants.HASH_LENGTH))
			throw Error("Invalid asset: " + asset);
		const amount = deposited_pools_assets[key];
		if (!validationUtils.isPositiveInteger(amount))
			throw Error("Invalid amount: " + asset);
		if (!valueByPoolsAssets[asset]) // if we didn't determine its value then it's not an eligible pool asset
			continue;

		if (!poolsAssetsValuesByAddresses[address])
			poolsAssetsValuesByAddresses[address] = {};
		const value = valueByPoolsAssets[asset].value * amount;
		const weighted_value = valueByPoolsAssets[asset].weighted_value * amount;

		poolsAssetsValuesByAddresses[address][asset] = {value, weighted_value, amount};
		total_value += value;
		total_weighted_value+= weighted_value;
	}

	console.log("poolsAssetsValuesByAddresses")
console.log(poolsAssetsValuesByAddresses)
console.log(total_value)
	if (total_value === 0){
		console.log("nothing currently locked");
		return unlock();
	}

	const conn = await db.takeConnectionFromPool();
	await conn.query("BEGIN");
	await conn.query("DELETE FROM per_asset_rewards WHERE distribution_id=?",[distri_id]);
	await conn.query("DELETE FROM rewards WHERE distribution_id=?",[distri_id]);
	await conn.query("UPDATE distributions SET assets_total_value=?,assets_total_weighted_value=? WHERE id=?",[total_value, total_weighted_value, distri_id]);

	for (var address in poolsAssetsValuesByAddresses){
		await conn.query("INSERT INTO rewards(distribution_id, payout_address) VALUES (?,?)",[distri_id, address]);
		for (var asset in poolsAssetsValuesByAddresses[address]){
			const share = poolsAssetsValuesByAddresses[address][asset].weighted_value / total_weighted_value;
			const reward_amount = Math.round(share * conf.distribution_amount);
			console.log("reward_amount " + reward_amount)
			const asset_amount = poolsAssetsValuesByAddresses[address][asset].amount;
			const asset_value = poolsAssetsValuesByAddresses[address][asset].value;
			const asset_weighted_value = poolsAssetsValuesByAddresses[address][asset].weighted_value;
			await conn.query("INSERT INTO per_asset_rewards(distribution_id, reward_id, asset, asset_amount, reward_amount,asset_value,\n\
			asset_weighted_value) VALUES (?,(SELECT MAX(id) FROM rewards),?,?,?,?,?)",[distri_id, asset, asset_amount, reward_amount, asset_value, asset_weighted_value]);
			await conn.query("UPDATE rewards SET distribution_share=distribution_share+?,reward_amount=reward_amount+? \n\
			WHERE id=(SELECT MAX(id) FROM rewards)",[share, reward_amount]);
		}
	}
	await conn.query("UPDATE distributions SET is_frozen=1 WHERE datetime < datetime('now')");
	await conn.query("COMMIT");
	conn.release();
	unlock();
}

async function discoverPoolAssets(){
	for (var pool_address in eligiblePools ){
		const definition = await dag.readAADefinition(pool_address);
		const factory_aa = definition[1].params.factory;	
		const pool_asset = await dag.readAAStateVar(factory_aa, "pools." + pool_address +".asset");
		eligiblePools[pool_address].pool_asset = pool_asset;
		eligiblePools[pool_address].asset0 = definition[1].params.asset0;
		eligiblePools[pool_address].asset1 = definition[1].params.asset1;

		const symbol = await dag.readAAStateVar(conf.token_registry_aa_address, "a2s_" + pool_asset);
		const desc_hash = await dag.readAAStateVar(conf.token_registry_aa_address, "current_desc_" + pool_asset);
		const decimals = await dag.readAAStateVar(conf.token_registry_aa_address, "decimals_" + desc_hash);
		infoByPoolAsset[pool_asset] = {symbol, decimals};
	}
}

async function determinePoolAssetsValues(){
	try {
		var assets_data = await (await fetch(conf.assets_data_url)).json();
	} catch(e) {
		console.log("error when fetching " + e.message);
		return false;
	}
	try {
		for (var pool_address in eligiblePools){
			const asset0 = eligiblePools[pool_address].asset0;
			const asset1 = eligiblePools[pool_address].asset1;
			const pool_asset = eligiblePools[pool_address].pool_asset;

			const balances = await dag.readBalance(pool_address); 

			if (!balances[asset0] || !balances[asset0].stable || !balances[asset1] || !balances[asset1].stable)
				continue;
			const total_pool_value = balances[asset0].stable * getAssetGbValue(asset0) + balances[asset1].stable * getAssetGbValue(asset1);
			
			const pool_asset_supply = await dag.readAAStateVar(pool_address, "supply");
			const asset_value = total_pool_value / pool_asset_supply;
			if (!asset_value)
				throw Error("no gb value for asset " + pool_asset);

			valueByPoolsAssets[pool_asset] =  {
				value: asset_value,
				weighted_value: asset_value * (eligiblePools[pool_address].coeff / 100)
			};
		}
	} catch(e) {
		console.log("error " + e.message);
		return false;
	}

	return true;

	function getAssetGbValue(asset){
		for (var symbol in assets_data){
			if (assets_data[symbol].asset_id == asset)
				return assets_data[symbol].last_gbyte_value / (10 ** assets_data[symbol].decimals);
		}
	}


}


process.on('unhandledRejection', up => { throw up });