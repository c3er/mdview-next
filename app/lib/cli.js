const path = require("path")

const electron = require("electron")
const yargs = require("yargs/yargs")
const yargsHelpers = require("yargs/helpers")

const log = require("./log")

exports.IS_MAIN_SWITCH = "--main"

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
        isTest: argv.test,
        isMainProcess: argv.main,
        logDir: argv.logDir,
    }
    log.debug("Parsed arguments:", parsed)
    return parsed
}
