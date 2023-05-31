const fs = require("fs/promises")
const path = require("path")

const assert = require("chai").assert
const electronPath = require("electron")
const playwright = require("playwright")

const electron = playwright._electron

const DATA_DIR = path.join(__dirname, "data")

let app
let page

async function cleanup() {
    await fs.rm(DATA_DIR, { force: true, recursive: true })
}

async function startApp() {
    const app = await electron.launch({
        args: [path.join(__dirname, ".."), "--test", "--log-dir", path.join(DATA_DIR, "logs")],
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
