const childProcess = require("child_process")
const fs = require("fs/promises")
const path = require("path")

const assert = require("chai").assert
const electronPath = require("electron")
const playwright = require("playwright")

const log = require("../app/lib/log")

const electron = playwright._electron

const DATA_DIR = path.join(__dirname, "data")
const LOG_DIR = path.join(DATA_DIR, "logs")

let app
let page

async function waitFor(predicate, milliseconds) {
    // Based on https://stackoverflow.com/a/47719203 (How to set maximum execution time for a Promise await?)
    const timeout = (callback, milliseconds) => () =>
        new Promise(resolve => setTimeout(() => callback(resolve), milliseconds))
    return await Promise.race(
        [
            predicate.constructor.name === "AsyncFunction"
                ? predicate
                : () => new Promise(resolve => predicate(() => resolve(true))),
            timeout(resolve => resolve(false), milliseconds),
        ].map(func => func()),
    )
}

async function readLog() {
    return (await fs.readFile(path.join(LOG_DIR, log.FILENAME), "utf-8")).split(/\r?\n/)
}

async function cleanup() {
    app = page = null
    await fs.rm(DATA_DIR, { force: true, recursive: true })
}

async function startApp() {
    const app = await electron.launch({
        args: [path.join(__dirname, ".."), "--test", "--log-dir", LOG_DIR],
        executablePath: electronPath,
    })

    const page = await app.firstWindow()
    page.on("pageerror", error => assert.fail(`Page error: ${error}`))
    page.setDefaultTimeout(2000)
    await page.waitForSelector("h1") // Wait until the window is actually loaded

    return [app, page]
}

describe("Integration tests with single app instance", () => {
    before(async () => {
        await cleanup()
        ;[app, page] = await startApp()
    })

    after(async () => await app.close())

    it("opens a window", () => {
        assert.exists(page)
    })
})

describe("Process handling", () => {
    const MAIN_PROCESS_MESSAGE = "Spawned main process with PID"
    const SERVER_STARTED_MESSAGE = "Server started"

    function startProcess() {
        return childProcess.spawn(electronPath, [".", "--log-dir", LOG_DIR])
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

    function findLogLines(logLines, pattern) {
        return logLines.filter(line => line.match(pattern))
    }

    async function assertProcessExited(proc) {
        assert.isTrue(await waitFor(resolve => proc.on("exit", resolve), 2000))
        assert.strictEqual(proc.exitCode, 0)
    }

    beforeEach(async () => await cleanup())

    it("spawns main process", async () => {
        const startedProcess = startProcess()

        try {
            await assertProcessExited(startedProcess)

            const logLines = await readLog()
            const mainProcessMessage = findLogLines(logLines, MAIN_PROCESS_MESSAGE)[0]
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

            let logLines = await readLog()
            const mainProcessMessage = findLogLines(logLines, MAIN_PROCESS_MESSAGE)[0]
            assert.exists(mainProcessMessage)

            mainPid = Number(mainProcessMessage.split(" ").at(-1))
            assert.isTrue(processExists(mainPid))

            assert.isTrue(
                await waitFor(async () => {
                    while (true) {
                        if (findLogLines(await readLog(), SERVER_STARTED_MESSAGE)[0]) {
                            return true
                        }
                    }
                }, 2000),
            )

            startedProcess = startProcess()
            await assertProcessExited(startedProcess)

            logLines = await readLog()
            assert.exists(findLogLines(logLines, "Process already running")[0])

            const jsonRegex = /\{.*\}/
            const dataMessages = findLogLines(logLines, jsonRegex)
            assert.strictEqual(dataMessages.length, 2)

            assert.strictEqual(
                dataMessages[1].match(jsonRegex)[0],
                dataMessages[0].match(jsonRegex)[0],
            )
        } finally {
            process.kill(mainPid)
            destroyProcess(startedProcess)
        }
    })
})
