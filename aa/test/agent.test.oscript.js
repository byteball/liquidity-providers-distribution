// uses `aa-testkit` testing framework for AA tests. Docs can be found here `https://github.com/valyakin/aa-testkit`
// `mocha` standard functions and `expect` from `chai` are available globally
// `Testkit`, `Network`, `Nodes` and `Utils` from `aa-testkit` are available globally too
const path = require('path')
const AA_PATH = '../agent.aa'

describe('Check simple AA', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ agent: path.join(__dirname, AA_PATH) })
			.with.asset({ pool_asset_1: {} })
			.with.wallet({ alice: 1e6 })
			.with.wallet({ bob: 1e3 })
			.with.explorer()
			.run()

			const { unit, error } = await this.network.deployer.sendMulti({
				asset: this.network.asset.pool_asset_1,
						asset_outputs:[{
							address: await this.network.wallet.alice.getAddress(),
							amount: 50e9
						}],
						asset_outputs:[{
							address: await this.network.wallet.alice.getAddress(),
							amount: 50e9
						}],
					
				}
			);
			await this.network.witnessUntilStable(unit)

	})


	it('Trigger AA', async () => {
		var { unit, error } = await this.network.wallet.alice.sendMulti({

					asset: this.network.asset.pool_asset_1,
					asset_outputs:[{
						amount: 50000,
						address: this.network.agent.agent,
					}],
					base_outputs:[{
						amount:  10000,
						address: this.network.agent.agent,
					}]
			}
		);

		expect(error).to.be.null
		expect(unit).to.be.validUnit
		var { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false;
		expect(response.response.info).to.be.equal("home team didn't win")

	}).timeout(60000)

	after(async () => {
		await Utils.sleep(3600 * 1000)
		await this.network.stop()
	})
})
