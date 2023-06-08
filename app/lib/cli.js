const path = require("path")

const electron = require("electron")
const yargs = require("yargs/yargs")
const yargsHelpers = require("yargs/helpers")

const log = require("./log")

const DEFAULT_FILE = path.join(__dirname, "..", "..", "README.md")

exports.IS_MAIN_SWITCH = "--main"

exports.DEFAULT_FILE = DEFAULT_FILE

exports.parse = args => {
    log.debug("Raw arguments:", args)

    const argv = yargs(yargsHelpers.hideBin(args))
        .option("test", {
            describe: "Flag for test mode needed by automatic tests",
            type: "boolean",
            default: false,
        })
        .option("main", {
            describe: "Internally used flag for process management",
            type: "boolean",
            default: false,
        })
        .option("log-dir", {
            describe: "Override application's default directory for writing logs",
            type: "string",
            default: path.join(electron.app.getPath("userData"), "logs"),
        })
        .help().argv
    log.debug("Parsed by Yargs:", argv)

    const parsed = {
        // Assume that the last argument is the file to open. If the application is
        // invoked by Playwright, the Yargs hideBin function fails.
        // See issues:
        // https://github.com/microsoft/playwright/issues/23385
        // https://github.com/yargs/yargs/issues/2225
        // https://github.com/microsoft/playwright/issues/16614
        filePath: argv._.at(-1) ?? DEFAULT_FILE,

        isTest: argv.test,
        isMainProcess: argv.main,
        logDir: argv.logDir,
    }
    log.debug("Parsed arguments:", parsed)
    return parsed
}
