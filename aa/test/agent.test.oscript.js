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
			.with.wallet({ alice: 1e6 })
			.with.wallet({ bob: 1e3 })
			.run()
	})

	it('Send bytes and check balance', async () => {
		const { unit } = await this.network.wallet.alice.sendBytes({
			toAddress: await this.network.wallet.bob.getAddress(),
			amount: 10000
		})

		expect(unit).to.be.validUnit
		await this.network.witnessUntilStable(unit)

		const bobBalance = await this.network.wallet.bob.getBalance()
		expect(bobBalance.base.pending).to.be.equal(0)
		expect(bobBalance.base.stable).to.be.equal(11000)

		const aliceBalance = await this.network.wallet.alice.getBalance()
		expect(aliceBalance.base.pending).to.be.equal(0)
		expect(aliceBalance.base.stable).to.be.equal(989626)
	}).timeout(60000)

	it('Trigger AA', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.agent,
			amount: 10000,
			data: {
				a: 100,
				b: 200
			}
		})

		expect(error).to.be.null
		expect(unit).to.be.validUnit

		const { response } = await this.network.getAaResponseToUnitOnNode(this.network.wallet.alice, unit)
		expect(response.response.responseVars.result).to.be.equal(300)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
