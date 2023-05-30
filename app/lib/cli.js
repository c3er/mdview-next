const yargs = require("yargs/yargs")
const yargsHelpers = require("yargs/helpers")

exports.parse = args => {
    console.debug("Raw arguments:", args)

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
    console.debug("Parsed by Yargs:", argv)

    const parsed = {
        isTest: argv.test,
        isMainProcess: argv.main,
    }
    console.debug("Parsed arguments:", parsed)

    return parsed
}
