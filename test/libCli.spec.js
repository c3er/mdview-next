const assert = require("chai").assert

const cli = require("../app/lib/cli")
const log = require("../app/lib/log")

const lib = require("./testLib")
const mocking = require("./mocking")

describe("Command line interface", () => {
    // The path to the started execetuble is inserted automatically by the CLI library.

    beforeEach(async () => {
        await lib.removeData()
        cli.init(mocking.createElectron())
        await log.init(lib.LOG_DIR)
    })

    it("has default values", () => {
        const parsed = cli.parse([])
        assert.strictEqual(parsed.filePath, cli.defaults.filePath)
        assert.strictEqual(parsed.isTest, cli.defaults.isTest)
        assert.strictEqual(parsed.isMainProcess, cli.defaults.isMainProcess)
        assert.strictEqual(parsed.logDir, cli.defaults.logDir)
    })

    it("recognizes test flag", () => {
        assert.isTrue(cli.parse(["--test"]).isTest)
    })

    it("recognizes main process flag", () => {
        assert.isTrue(cli.parse(["--main"]).isMainProcess)
    })

    it("lets change the log directory", () => {
        const logDir = "/path/to/log/directory"
        assert.strictEqual(cli.parse(["--log-dir", logDir]).logDir, logDir)
    })

    it("recognizes given file to open", () => {
        const filePath = "path/to/file.md"
        assert.strictEqual(cli.parse([filePath]).filePath, filePath)
    })
})
