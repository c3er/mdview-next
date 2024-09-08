const path = require("path")

const yargs = require("yargs/yargs")
const yargsHelpers = require("yargs/helpers")

const log = require("./logMain")

let electron

const defaults = {
    isTest: false,
    isMainProcess: false,
    logDir: "",
    filePath: path.join(__dirname, "..", "..", "README.md"),
}

exports.IS_MAIN_SWITCH = "--main"

exports.defaults = defaults

exports.init = electronMock => {
    electron = electronMock ?? require("electron")
    defaults.logDir = path.join(electron.app.getPath("userData"), "logs")
}

exports.parse = args => {
    log.debug("Raw arguments:", args)

    const argv = yargs(args)
        .option("test", {
            describe: "Flag for test mode needed by automatic tests",
            type: "boolean",
            default: defaults.isTest,
        })
        .option("main", {
            describe: "Internally used flag for process management",
            type: "boolean",
            default: defaults.isMainProcess,
        })
        .option("log-dir", {
            describe: "Override application's default directory for writing logs",
            type: "string",
            default: defaults.logDir,
        })
        .help().argv
    log.debug("Parsed by Yargs:", argv)

    const parsed = {
        isTest: argv.test,
        isMainProcess: argv.main,
        logDir: argv.logDir,

        // Assume that the last argument is the file to open. If the application is
        // invoked by Playwright, the Yargs hideBin function fails.
        // See issues:
        // https://github.com/microsoft/playwright/issues/23385
        // https://github.com/yargs/yargs/issues/2225
        // https://github.com/microsoft/playwright/issues/16614
        filePath: argv._.at(-1) ?? defaults.filePath,
    }
    log.debug("Parsed arguments:", parsed)
    return parsed
}

exports.hideBin = yargsHelpers.hideBin
