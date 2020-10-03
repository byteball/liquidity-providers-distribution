const db = require('ocore/db.js');
const conf = require('ocore/conf.js');

exports.create = async function(){

	console.log("will create tables if not exist");

	await db.query("CREATE TABLE IF NOT EXISTS distributions (\n\
		id INTEGER PRIMARY KEY AUTOINCREMENT, \n\
		is_frozen TINYINT DEFAULT 0, \n\
		is_completed TINYINT DEFAULT 0, \n\
		snapshot_time NOT NULL DEFAULT CURRENT_TIMESTAMP \n\
		datetime TIMESTAMP NOT NULL \n\
	);");

	await db.query("INSERT OR IGNORE INTO distributions (id,date_time) VALUES (1,?)", [conf.first_distribution_datetime]);
	await db.query("CREATE TABLE IF NOT EXISTS rewards (\n\
		id INTEGER PRIMARY KEY AUTOINCREMENT, \n\
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
		asset  CHAR(44), \n\
		assset_amount NOT NULL,\n\
		reward_amount NOT NULL,\n\
		UNIQUE(reward_id, asset), \n\
		FOREIGN KEY (distribution_id) REFERENCES distributions(id), \n\
		FOREIGN KEY (reward_id) REFERENCES rewards(id), \n\
	);");

}