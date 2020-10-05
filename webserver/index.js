const conf = require('ocore/conf.js');
const express = require('express')
const path = require('path');
const db = require('ocore/db.js');


function start(){

	const app = express();
	const server = require('http').Server(app);

	// view engine setup
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'ejs');
	app.use(express.urlencoded());

	app.get('/', async (req, res) => {

	const rewardsRows = db.query("SELECT payout_address, payment_unit, distribution_share,reward_amount, GROUP_CONCAT(reward_details) AS reward_details \n\
		FROM (SELECT reward_id,rewards.reward_amount,distribution_share,payment_unit,\n\
		payout_address,asset||'@'||asset_amount||'@'||asset_value||'@'||asset_weighted_value||'@'||per_asset_rewards.reward_amount AS reward_details \n\
		FROM per_asset_rewards INNER JOIN rewards ON rewards.id=per_asset_rewards.reward_id \n\
		WHERE per_asset_rewards.distribution_id=(SELECT MAX(id) FROM distributions)) GROUP BY reward_id;")

		res.render('distribution.ejs', {
			rewardsRows,
			conf,
		});
	});

	server.listen(conf.webServerPort, () => {
		console.log(`== server started listening on ${conf.webServerPort} port`);
	});


}

/*		id INTEGER PRIMARY KEY AUTOINCREMENT, \n\
		distribution_id INTEGER, \n\
		payout_address CHAR(32), \n\
		payment_unit CHAR(44), \n\
		distribution_share REAL DEFAULT 0, \n\
		reward_amount INTEGER DEFAULT 0, \n\
		UNIQUE(distribution_id, payout_address), \n\
		FOREIGN KEY (distribution_id) REFERENCES distributions(id) \n\
	);");

	await db.query("CREATE TABLE IF NOT EXISTS per_asset_rewards (\n\
		distribution_id INTEGER, \n\
		reward_id INTEGER, \n\
		asset CHAR(44), \n\
		asset_amount INTEGER NOT NULL,\n\
		asset_value REAL NOT NULL, \n\
		asset_weighted_value REAL NOT NULL, \n\
		reward_amount INTEGER NOT NULL,\n\
		UNIQUE(reward_id, asset), \n\*/


start();
