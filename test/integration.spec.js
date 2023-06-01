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

async function waitFor(predicate, timeoutMs) {
    // Based on https://stackoverflow.com/a/47719203 (How to set maximum execution time for a Promise await?)
    const timeout = (callback, timeoutMs) => () =>
        new Promise(resolve => setTimeout(() => callback(resolve), timeoutMs))
    return await Promise.race(
        [
            () => new Promise(resolve => predicate(() => resolve(true))),
            timeout(resolve => resolve(false), timeoutMs),
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
    beforeEach(async () => await cleanup())

    it("spawns main process", async () => {
        const appProcess = childProcess.spawn(electronPath, [".", "--log-dir", LOG_DIR])
        try {
            const hasExited = await waitFor(resolve => appProcess.on("exit", resolve), 2000)
            assert.isTrue(hasExited)
            assert.equal(appProcess.exitCode, 0)

            const logLines = await readLog()
            const mainProcessMessage = logLines.filter(line =>
                line.includes(MAIN_PROCESS_MESSAGE),
            )[0]
            assert.exists(mainProcessMessage)
            process.kill(Number(mainProcessMessage.split(" ").at(-1)))
        } finally {
            appProcess.stderr.destroy()
            appProcess.stdout.destroy()
            appProcess.stdin.destroy()
            appProcess.kill("SIGKILL")
        }
    })
})
