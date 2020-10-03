/*jslint node: true */
"use strict";
const eventBus = require('ocore/event_bus.js');
const headlessWallet = require('headless-obyte');
const conf = require('ocore/conf.js');
const db = require('ocore/db.js');
const validationUtils = require("ocore/validation_utils.js");
const mutex = require('ocore/mutex.js');
const dag = require('aabot/dag.js');
const fetch = require('node-fetch');
const sqlite_tables = require('./sqlite_tables.js');

eventBus.on('headless_wallet_ready', start);

const eligiblePools = conf.eligiblePools;
const valueByPoolsAssets = {};

async function start(){
	await sqlite_tables.create();
	await discoverPoolAssets();
	makeNextDistribution();
	setInterval(makeNextDistribution, 60 * 1000)

}

async function distributeIfReady(){


	
}

async function makeNextDistribution(){

	const unlock = await mutex.skipOrLock(['make']);

	const rows = await db.query("SELECT is_frozen, is_completed,id FROM distributions ORDER BY id DESC LIMIT 1");
	if (rows[0].is_frozen && !rows[0].is_completed){
		console.log("Skip building, distribution ongoing");
		return unlock();
	}
	if (rows[0].is_completed) // the previous distribution is completed, let's create an id and a planned time for the next one
		await db.query("INSERT INTO distributions (datetime) VALUES ((SELECT date(datetime, '+"+ conf.hoursBetweenDistributions + " hours')\n\
		FROM distributions ORDER BY id DESC LIMIT 1)") // 

	if (!await determinePoolAssetsValues()){
		console.log("couldn't determine pools assets values");
		return unlock();
	}

	try {
		var deposited_pools_assets = await dag.readAAStateVars(assets_keeper_aa, "amount_");
	} catch(e){
		console.log("couldn't read assets_keeper_aa vars");
		return unlock();
	}

	const distri_id = (await db.query("SELECT MAX(id) AS id FROM distribution"))[0].id;

	const poolsAssetsValuesByAddresses = {};
	var total_value = 0;
	for (var key in deposited_pools_assets){
		const address = key.split("_")[2];
		if (!validationUtils.isValidAddress(address))
			throw Error("Invalid address: " + address);
		const asset = key.split("_")[2];
		if (!validationUtils.isValidUnit(asset))
			throw Error("Invalid asset: " + asset);
		const amount = deposited_pools_assets[key];
		if (!validationUtils.isPositiveNumber(amount))
			throw Error("Invalid amount: " + asset);
		if (!valueByPoolsAssets[asset])
			throw Error("unknown value for asset: " + asset);

		if (!poolsAssetsValuesByAddresses[address])
			poolsAssetsValuesByAddresses[address] = {};
		const value = valueByPoolsAssets[asset] * amount;
		poolsAssetsValuesByAddresses[address][asset] = {value, amount};
		total_value += value;
	}

	const conn = await db.takeConnectionFromPool();
	await conn.query("BEGIN");

	for (var address in poolsAssetsValuesByAddresses){
		await conn.query("INSERT " + db.getIgnore() + " INTO rewards(distribution_id, payout_address) VALUES (?,?)",[distri_id, address]);
		for (var asset in poolsAssetsValuesByAddresses[address]){
			const share = poolsAssetsValuesByAddresses[address][asset].value / total_value;
			const reward_amount = share * conf.distribution_amount;
			await conn.query("INSERT " + db.getIgnore() + " INTO per_asset_rewards(distribution_id, reward_id, asset, asset_amount, reward_amount)\n\
			VALUES (?,(SELECT MAX(id) FROM rewards),?,?,?)",[distri_id, asset, poolsAssetsValuesByAddresses[address][asset].amount, reward_amount]);
			await conn.query("UPDATE rewards SET distribution_share=distribution_share+?,reward_amount+? WHERE id=(SELECT MAX(id) FROM rewards)",[share,reward_amount]);
		}
	}
	await conn.query("UPDATE distributions SET is_frozen=1 WHERE datetime > date('now')");
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
	}
}

async function determinePoolAssetsValues(){
	try {
		var assets_data = fetch(conf.assets_summary_url).json();
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
			console.log(balances);
			const total_pool_value = balances[asset0].stable * getAssetGbValue(asset0) + balances[asset1].stable * getAssetGbValue(asset1);//decimals missing
			const pool_asset_supply = await dag.readAAStateVar(pool_address, "supply");
			valueByPoolsAssets[pool_asset] = (total_pool_value / pool_asset_supply) * (eligiblePools[pool_address].coeff / 100);
		}
	} catch(e) {
		console.log("error " + e.message);
		return false;
	}
	return true;

	function getAssetGbValue(asset){
		for (var symbol in assets_data){
			if (assets_data[symbol].asset_id == asset)
				return assets_data[symbol].last_gbyte_value;
		}
	}


}
