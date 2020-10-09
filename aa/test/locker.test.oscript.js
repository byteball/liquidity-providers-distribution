// uses `aa-testkit` testing framework for AA tests. Docs can be found here `https://github.com/valyakin/aa-testkit`
// `mocha` standard functions and `expect` from `chai` are available globally
// `Testkit`, `Network`, `Nodes` and `Utils` from `aa-testkit` are available globally too
const path = require('path')
const AA_PATH = '../locker.aa'

const lock_time = 7 * 24 * 3600;

describe('Check simple AA', function () {
	this.timeout(120000)
	var alice_address,bob_address;
	before(async () => {
		this.network = await Network.create()
			.with.agent({ locker: path.join(__dirname, AA_PATH) })
			.with.asset({ pool_asset_1: {} })
			.with.asset({ pool_asset_2: {} })
			.with.wallet({ alice: 1e6 })
			.with.wallet({ bob: 1e6 })
			.with.explorer()
			.run()

			alice_address = await this.network.wallet.alice.getAddress();
			bob_address = await this.network.wallet.bob.getAddress();
			console.log("Alice's address: " + alice_address);
			console.log("Bob's address: " + bob_address);
			console.log(this.network.asset.pool_asset_1);
		
			var { unit, error } = await this.network.deployer.sendMulti({
					asset: this.network.asset.pool_asset_1,
					asset_outputs:[{
						address: alice_address,
						amount: 50e9
					},{
						address: bob_address,
						amount: 40e9
					}]
				}
			);

			var { unit, error } = await this.network.deployer.sendMulti({
				asset: this.network.asset.pool_asset_2,
				asset_outputs:[{
					address: alice_address,
					amount: 50e9
				},{
					address: bob_address,
					amount: 40e9
				}]
			}
		);
			await this.network.witnessUntilStable(unit);

	})


	it('Alice locks asset 1', async () => {

		var { unit, error } = await this.network.wallet.alice.sendMulti({

					asset: this.network.asset.pool_asset_1,
					asset_outputs:[{
						amount: 50000,
						address: this.network.agent.locker,
					}],
					base_outputs:[{
						amount:  10000,
						address: this.network.agent.locker,
					}]
			}
		);

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false;
		await this.network.sync()
		var { vars } = await this.network.deployer.readAAStateVars(this.network.agent.locker);
		expect(vars["amount_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.equal(50000);

		const { unitObj } = await this.network.wallet.alice.getUnitInfo({ unit });
		expect(vars["ts_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.equal(unitObj.timestamp);

	}).timeout(60000)


	it('Alice locks asset 1 again', async () => {

		var { unit, error } = await this.network.wallet.alice.sendMulti({

					asset: this.network.asset.pool_asset_1,
					asset_outputs:[{
						amount: 70000,
						address: this.network.agent.locker,
					}],
					base_outputs:[{
						amount:  10000,
						address: this.network.agent.locker,
					}]
			}
		);

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false;
		await this.network.sync()
		var { vars } = await this.network.deployer.readAAStateVars(this.network.agent.locker);
		expect(vars["amount_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.equal(70000 + 50000);

		const { unitObj } = await this.network.wallet.alice.getUnitInfo({ unit });
		expect(vars["ts_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.equal(unitObj.timestamp);

	}).timeout(60000)


	it('Alice locks asset 2', async () => {

		var { unit, error } = await this.network.wallet.alice.sendMulti({

					asset: this.network.asset.pool_asset_2,
					asset_outputs:[{
						amount: 1510000,
						address: this.network.agent.locker,
					}],
					base_outputs:[{
						amount:  10000,
						address: this.network.agent.locker,
					}]
			}
		);

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false;
		await this.network.sync()
		var { vars } = await this.network.deployer.readAAStateVars(this.network.agent.locker);
		expect(vars["amount_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.equal(70000 + 50000);
		expect(vars["amount_" + this.network.asset.pool_asset_2 + "_" + alice_address]).to.be.equal(1510000);

		const { unitObj } = await this.network.wallet.alice.getUnitInfo({ unit });
		expect(vars["ts_" + this.network.asset.pool_asset_2 + "_" + alice_address]).to.be.equal(unitObj.timestamp);

	}).timeout(60000)

	it('Bob locks asset 1', async () => {

		var { unit, error } = await this.network.wallet.bob.sendMulti({

					asset: this.network.asset.pool_asset_1,
					asset_outputs:[{
						amount: 20000,
						address: this.network.agent.locker,
					}],
					base_outputs:[{
						amount:  10000,
						address: this.network.agent.locker,
					}]
			}
		);

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false;
		await this.network.sync()
		var { vars } = await this.network.deployer.readAAStateVars(this.network.agent.locker);
		expect(vars["amount_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.equal(70000 + 50000);
		expect(vars["amount_" + this.network.asset.pool_asset_2 + "_" + alice_address]).to.be.equal(1510000);
		expect(vars["amount_" + this.network.asset.pool_asset_1 + "_" + bob_address]).to.be.equal(20000);

		const { unitObj } = await this.network.wallet.alice.getUnitInfo({ unit });
		expect(vars["ts_" + this.network.asset.pool_asset_1 + "_" + bob_address]).to.be.equal(unitObj.timestamp);

	}).timeout(60000)


	it('Alice tries withdraw asset1', async () => {

		var { unit, error } = await this.network.wallet.alice.triggerAaWithData({ 
			toAddress: this.network.agent.locker,
			amount: 10000,
			data: {
				withdraw: this.network.asset.pool_asset_1,
				amount: 50000
			}
		});

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true;
		expect(response.response.error).to.be.equal("This asset is still locked, retry in " + Math.round((lock_time) / 3600) + " hours")


	}).timeout(60000)

	it('Alice partially withdraws asset1', async () => {
		var { error } = await this.network.timetravel({ shift: lock_time +'s' })
		expect(error).to.be.null

		var { unit, error } = await this.network.wallet.alice.triggerAaWithData({ 
			toAddress: this.network.agent.locker,
			amount: 10000,
			data: {
				withdraw: this.network.asset.pool_asset_1,
				amount: 30000
			}
		});

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.response.error).to.be.undefined;
		expect(response.bounced).to.be.false;

		var { unitObj } = await this.network.wallet.alice.getUnitInfo({ unit: response.response_unit })
		expect(Utils.hasOnlyTheseExternalPayments(unitObj,[{
			asset: this.network.asset.pool_asset_1,
			address: alice_address,
			amount: 30000
		}])).to.be.true;

		var { vars } = await this.network.deployer.readAAStateVars(this.network.agent.locker);
		expect(vars["amount_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.equal(70000 + 50000 - 30000);
		expect(vars["amount_" + this.network.asset.pool_asset_2 + "_" + alice_address]).to.be.equal(1510000);
		expect(vars["amount_" + this.network.asset.pool_asset_1 + "_" + bob_address]).to.be.equal(20000);


	}).timeout(60000)


	it('Alice fully withdraws asset1', async () => {
		var { error } = await this.network.timetravel({ shift: lock_time +'s' })
		expect(error).to.be.null

		var { unit, error } = await this.network.wallet.alice.triggerAaWithData({ 
			toAddress: this.network.agent.locker,
			amount: 10000,
			data: {
				withdraw: this.network.asset.pool_asset_1
			}
		});

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.response.error).to.be.undefined;
		expect(response.bounced).to.be.false;

		var { unitObj } = await this.network.wallet.alice.getUnitInfo({ unit: response.response_unit })
		expect(Utils.hasOnlyTheseExternalPayments(unitObj,[{
			asset: this.network.asset.pool_asset_1,
			address: alice_address,
			amount: 90000
		}])).to.be.true;

		var { vars } = await this.network.deployer.readAAStateVars(this.network.agent.locker);
		expect(vars["amount_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.equal(0);
		expect(vars["amount_" + this.network.asset.pool_asset_2 + "_" + alice_address]).to.be.equal(1510000);
		expect(vars["amount_" + this.network.asset.pool_asset_1 + "_" + bob_address]).to.be.equal(20000);
		expect(vars["ts_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.undefined;


	}).timeout(60000)


	it('Bob tries withdraw too many asset1', async () => {

		var { unit, error } = await this.network.wallet.bob.triggerAaWithData({ 
			toAddress: this.network.agent.locker,
			amount: 10000,
			data: {
				withdraw: this.network.asset.pool_asset_1,
				amount: 10000000
			}
		});

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true;
		expect(response.response.error).to.be.equal("Only 20000 available for withdraw")


	}).timeout(60000)

	it('Alice tries withdraw asset1', async () => {

		var { unit, error } = await this.network.wallet.alice.triggerAaWithData({ 
			toAddress: this.network.agent.locker,
			amount: 10000,
			data: {
				withdraw: this.network.asset.pool_asset_1
			}
		});

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.true;
		expect(response.response.error).to.be.equal("You don't have deposit for this asset");


	}).timeout(60000)


	it('Alice relocks asset 1', async () => {

		var { unit, error } = await this.network.wallet.alice.sendMulti({

				asset: this.network.asset.pool_asset_1,
				asset_outputs:[{
					amount: 60000,
					address: this.network.agent.locker,
				}],
				base_outputs:[{
					amount:  10000,
					address: this.network.agent.locker,
				}]
			}
		);

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false;
		await this.network.sync()
		var { vars } = await this.network.deployer.readAAStateVars(this.network.agent.locker);
		expect(vars["amount_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.equal(60000);

		const { unitObj } = await this.network.wallet.alice.getUnitInfo({ unit });
		expect(vars["ts_" + this.network.asset.pool_asset_1 + "_" + alice_address]).to.be.equal(unitObj.timestamp);

	}).timeout(60000)

	after(async () => {
		//await Utils.sleep(3600 * 1000)
		await this.network.stop()
	})
})
