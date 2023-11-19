const childProcess = require("child_process")
const fs = require("fs/promises")
const path = require("path")

const assert = require("chai").assert
const electronPath = require("electron")
const playwright = require("playwright")

const lib = require("./testLib")

const log = require("../app/lib/log")

const electron = playwright._electron

const DEFAULT_TIMEOUT_MS = 2000

let _app
let _page

// Based on https://stackoverflow.com/a/47719203 (How to set maximum execution time for a Promise await?)
async function waitFor(predicate, milliseconds = DEFAULT_TIMEOUT_MS) {
    const waitInfo = {
        timeoutHasOccurred: false,
    }
    const timeout = (callback, milliseconds) => () =>
        new Promise(resolve => setTimeout(() => callback(resolve), milliseconds))
    return await Promise.race(
        [
            predicate.constructor.name === "AsyncFunction"
                ? () => predicate(waitInfo)
                : () => new Promise(resolve => predicate(() => resolve(true), waitInfo)),
            timeout(resolve => {
                waitInfo.timeoutHasOccurred = true
                resolve(false)
            }, milliseconds),
        ].map(func => func()),
    )
}

// Parses a log file to a list of log entries.
// Entries that span multiple lines are regarded as one entry.
async function readLog() {
    const lines = (await fs.readFile(path.join(lib.LOG_DIR, log.FILENAME), "utf-8")).split(/\r?\n/)
    const logEntries = []
    const currentEntry = []
    for (const line of lines) {
        if (!line.match(/\[\d{4}-\d{2}-\d{2}/)) {
            currentEntry.push(line)
            continue
        }

        if (currentEntry.length > 0) {
            logEntries.push(currentEntry.join("\n"))
            currentEntry.length = 0
        }
        currentEntry.push(line)
    }
    logEntries.push(currentEntry.join("\n"))
    return logEntries
}

async function cleanup() {
    _app = _page = null
    await lib.removeData()
}

async function startApp() {
    const app = await electron.launch({
        args: [path.join(__dirname, ".."), "--test", "--log-dir", lib.LOG_DIR],
        executablePath: electronPath,
    })

    const page = await app.firstWindow()
    page.on("pageerror", error => assert.fail(`Page error: ${error}`))
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS)
    await page.waitForSelector("h1") // Wait until the window is actually loaded

    return [app, page]
}

describe("Process handling", () => {
    const MAIN_PROCESS_MESSAGE = "Spawned main process with PID"
    const SERVER_STARTED_MESSAGE = "Server started"

    function startProcess() {
        return childProcess.spawn(electronPath, [".", "--log-dir", lib.LOG_DIR])
    }

    function processExists(pid) {
        try {
            process.kill(pid, 0)
            return true
        } catch {
            return false
        }
    }

    function destroyProcess(proc) {
        proc.stderr.destroy()
        proc.stdout.destroy()
        proc.stdin.destroy()
        proc.kill("SIGKILL")
    }

    function findLogEntries(logEntries, pattern) {
        return logEntries.filter(entry => entry.match(pattern))
    }

    async function assertProcessExited(proc) {
        assert.isTrue(await waitFor(resolve => proc.on("exit", resolve)))
        assert.strictEqual(proc.exitCode, 0)
    }

    beforeEach(async () => await cleanup())

    it("spawns main process", async () => {
        const startedProcess = startProcess()

        try {
            await assertProcessExited(startedProcess)

            const mainProcessMessage = findLogEntries(await readLog(), MAIN_PROCESS_MESSAGE)[0]
            assert.exists(mainProcessMessage)

            process.kill(Number(mainProcessMessage.split(" ").at(-1)))
        } finally {
            destroyProcess(startedProcess)
        }
    })

    it("sends message to main process", async () => {
        let startedProcess = startProcess()
        let mainPid

        try {
            await assertProcessExited(startedProcess)

            const mainProcessMessage = findLogEntries(await readLog(), MAIN_PROCESS_MESSAGE)[0]
            assert.exists(mainProcessMessage)

            mainPid = Number(mainProcessMessage.split(" ").at(-1))
            assert.isTrue(processExists(mainPid))

            assert.isTrue(
                await waitFor(async waitInfo => {
                    while (!waitInfo.timeoutHasOccurred) {
                        if (findLogEntries(await readLog(), SERVER_STARTED_MESSAGE)[0]) {
                            return true
                        }
                    }
                    return false
                }),
            )

            startedProcess = startProcess()
            await assertProcessExited(startedProcess)

            const expectedDataMessageCount = 2
            const jsonRegex = /\{\s*id.*messageId.*data.*\}/s
            assert.isTrue(
                await waitFor(async waitInfo => {
                    while (!waitInfo.timeoutHasOccurred) {
                        const logEntries = await readLog()
                        assert.exists(findLogEntries(logEntries, "Process already running")[0])

                        const dataMessages = findLogEntries(logEntries, jsonRegex)
                        if (dataMessages.length === expectedDataMessageCount) {
                            return (
                                dataMessages[0].match(jsonRegex)[0] ===
                                dataMessages[1].match(jsonRegex)[0]
                            )
                        }
                    }
                    return false
                }),
            )
        } finally {
            process.kill(mainPid, "SIGKILL")
            destroyProcess(startedProcess)
        }
    })
})

describe("Integration tests with single app instance", () => {
    before(async () => {
        await cleanup()
        ;[_app, _page] = await startApp()
    })

    after(async () => await _app.close())

    it("opens a window", () => {
        assert.exists(_page)
    })
})
