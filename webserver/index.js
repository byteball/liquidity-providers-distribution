const conf = require('ocore/conf.js');
const express = require('express')
const path = require('path');
const db = require('ocore/db.js');


function start(infoByPoolAsset, eligiblePoolsByAddress){

	const app = express();
	const server = require('http').Server(app);

	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'ejs');
	app.use(express.urlencoded());

	app.get('/', async (req, res) => {
		renderForDistribution(res);
	});
	app.get('/:id', async (req, res) => {
		const id = parseInt(req.params.id);
		if (!id)
			return res.status(400).send('invalid distribution id');
		renderForDistribution(res, id);
	});

	server.listen(conf.webServerPort, () => {
		console.log(`== server started listening on ${conf.webServerPort} port`);
	});


	async function renderForDistribution(res, id){

		const distributionsRows = await db.query("SELECT id,snapshot_time,datetime,assets_total_value,assets_total_weighted_value \n\
		FROM distributions ORDER BY id ASC");
		const selected_id = id || distributionsRows.length; // first id is 1

		const rewardsRows = await db.query("SELECT payout_address, payment_unit, distribution_share,reward_amount, GROUP_CONCAT(reward_details) AS reward_details \n\
		FROM (SELECT reward_id,rewards.reward_amount,distribution_share,payment_unit,\n\
		payout_address,asset||'@'||asset_amount||'@'||asset_value||'@'||asset_weighted_value||'@'||per_asset_rewards.reward_amount AS reward_details \n\
		FROM per_asset_rewards INNER JOIN rewards ON rewards.id=per_asset_rewards.reward_id \n\
		WHERE per_asset_rewards.distribution_id=?) GROUP BY reward_id;", [selected_id])
	
		if (!distributionsRows.map(d => d.id).includes(selected_id))
			return res.status(400).send('invalid distribution id');

		res.render('distribution.ejs', {
			rewardsRows,
			conf,
			formatters,
			distributionsRows,
			selected_id,
			eligiblePoolsByAddress
		});
	}

	const formatters = {
		assetAmount: (asset, amount) => {
			const decimals = infoByPoolAsset[asset].decimals;
			amount =  parseInt(amount) / (10 ** decimals)
			return parseFloat((decimals > 0 ? (amount).toFixed(decimals) : amount)) + " " + infoByPoolAsset[asset].symbol
		},
		gbAmount: amount => parseFloat(parseFloat(amount).toFixed(6)) + " GB",
		baseAmount: (amount, decimals) => parseFloat((parseInt(amount) / 1e9).toFixed(typeof decimals == "number" ? decimals : 6)) + " GB",
		assetSymbol: asset => infoByPoolAsset[asset].symbol,
		share: amount => parseFloat((amount * 100).toPrecision(3))+"%",
		unit: unit => unit ? '<a href="'+conf.explorer_base_url+ "/#" + unit +'" target="_blank">'+unit.slice(0,8)+'...</a>' : '',
		address: address => '<a class="address" href="'+conf.explorer_base_url+ "/#" + address +'" target="_blank">'+address+'</a>',
		url: url => '<a href="'+ url +'" target="_blank">'+url+'</a>'

	}

}

exports.start = start;
