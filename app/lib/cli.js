const yargs = require("yargs/yargs")
const yargsHelpers = require("yargs/helpers")

exports.IS_MAIN_SWITCH = "--main"

exports.parse = args => {
    // No logging available here.
    // Instead, collect log messages and return them together with the result.
    const messages = []

    messages.push(["Raw arguments:", args])

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
        .help().argv
    messages.push(["Parsed by Yargs:", argv])

    const parsed = {
        isTest: argv.test,
        isMainProcess: argv.main,
    }
    messages.push(["Parsed arguments:", parsed])

    return [parsed, messages]
}