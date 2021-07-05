const conf = require('ocore/conf.js');
const express = require('express')
const path = require('path');
const db = require('ocore/db.js');
const validationUtils = require('ocore/validation_utils.js')
const dag = require('aabot/dag.js');
const fetch = require('node-fetch');
const moment = require('moment');
const usdPrices = [];

function start(infoByPoolAsset, eligiblePoolsByAddress, poolAssetPrices){

	const app = express();
	const server = require('http').Server(app);

	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'ejs');
	app.use(express.urlencoded({ extended: false }));

	app.get('/', async (req, res) => {
		if (validationUtils.isValidAddress(req.query.address)){
			renderForAddress(res, req.query.address);
		} else {
			renderForDistribution(res, null, !!req.query.address, req.query.r);
		}
	});
	app.get('/:id', async (req, res) => {
		const id = parseInt(req.params.id);
		if (!id)
			return res.status(400).send('invalid distribution id');
		renderForDistribution(res, id, false, req.query.r);
	});

	server.listen(conf.webServerPort, () => {
		console.log(`== server started listening on ${conf.webServerPort} port`);
	});


	async function renderForDistribution(res, id, bInvalidAddress, ref){

		const distributionsRows = await db.query("SELECT id,is_completed,snapshot_time,datetime,assets_total_value,assets_total_weighted_value \n\
		FROM distributions ORDER BY id ASC");
		const selected_id = id || distributionsRows.length; // first id is 1

		const rewardsRows = await db.query("SELECT payout_address, payment_unit, distribution_share,reward_amount, GROUP_CONCAT(reward_details) AS reward_details \n\
		FROM (SELECT reward_id,rewards.reward_amount,distribution_share,payment_unit,\n\
		payout_address,asset||'@'||asset_amount||'@'||asset_value||'@'||asset_weighted_value||'@'||per_asset_rewards.reward_amount AS reward_details \n\
		FROM per_asset_rewards INNER JOIN rewards ON rewards.id=per_asset_rewards.reward_id \n\
		WHERE per_asset_rewards.distribution_id=?) GROUP BY reward_id;", [selected_id])
	
		if (!distributionsRows.map(d => d.id).includes(selected_id))
			return res.status(400).send('invalid distribution id');

		var usdPrice = 0;
		var priceTimestamp = moment(distributionsRows[selected_id-1].snapshot_time).unix();
		 // rewind priceTimestamp 6 minutes for ongoing distribution
		priceTimestamp = distributionsRows[selected_id-1].is_completed ? priceTimestamp : priceTimestamp-360;

		if (usdPrices[priceTimestamp] && usdPrices[priceTimestamp][0]) {
			usdPrice = usdPrices[priceTimestamp];
		}
		else {
			try {
				usdPrice = usdPrices[priceTimestamp] = await (await fetch('https://api.coinpaprika.com/v1/tickers/gbyte-obyte/historical?quote=usd&start='+ priceTimestamp +'&limit=1')).json();
			}
			catch (ex) {
				console.error(ex.message);
			}
		}

		res.render('distribution.ejs', {
			rewardsRows,
			conf,
			formatters,
			distributionsRows,
			selected_id,
			eligiblePoolsByAddress,
			bInvalidAddress,
			ref,
			usdPrice,
		});
	}

	async function renderForAddress(res, address){ 

		const assocAmountVars = await dag.readAAStateVars(conf.assets_locker_aa, "amount_" + address);
		const assocTsVars = await dag.readAAStateVars(conf.assets_locker_aa, "ts_" + address);

		const balances = [];
		

		for (var key in assocAmountVars){
			const amount = assocAmountVars[key];
			const asset = key.split('_')[2];
			const timestamp = assocTsVars[ "ts_" + address + "_" + asset] + conf.lock_period_in_days * 24 * 3600;
			const to = moment().to(moment.unix(timestamp));
			const bUnlockable = moment.unix(timestamp).isBefore();
			balances.push({amount, asset, to, bUnlockable} )
		}
		res.render('address.ejs', {
			balances,
			conf,
			formatters,
			infoByPoolAsset,
			address,
			poolAssetPrices,
			btoa
		});

	}


	const formatters = {
		assetAmount: (asset, amount) => {
			if (!infoByPoolAsset[asset]) // foreign asset could be shown on address page
				return amount + " " + asset;
			const decimals = infoByPoolAsset[asset].decimals || 0;
			amount =  parseInt(amount) / (10 ** decimals)
			return parseFloat((decimals > 0 ? (amount).toFixed(decimals) : amount)) + " " + infoByPoolAsset[asset].symbol
		},
		gbAmount: amount => parseFloat(parseFloat(amount).toFixed(6)) + " GB",
		usdAmount: amount => parseFloat(parseFloat(amount).toFixed(2)) + " USD",
		baseAmount: (amount, decimals) => parseFloat((parseInt(amount) / 1e9).toFixed(typeof decimals == "number" ? decimals : 6)) + " GB",
		assetSymbol: asset => infoByPoolAsset[asset].symbol,
		share: amount => parseFloat((amount * 100).toPrecision(3))+"%",
		unit: unit => unit ? '<a href="'+conf.explorer_base_url+ "/#" + unit +'" target="_blank">'+unit.slice(0,8)+'...</a>' : '',
		address: address => '<a class="address" href="/?address=' + address +'" target="_blank">'+address+'</a>',
		url: url => '<a href="'+ url +'" target="_blank">'+url.replace(/^https?:\/\//, '')+'</a>',
		explorer: (addressOrUnit, name) => addressOrUnit ? '<a class="address" href="'+conf.explorer_base_url+ "/#" + addressOrUnit +'" target="_blank">'+ (name ? name : addressOrUnit)+'</a>' : '',
	}

	function btoa(str) {
		return Buffer.from(str, 'binary').toString('base64');
	  }

}

exports.start = start;
