const path = require("path")

const assert = require("chai").assert
const electronPath = require("electron")
const playwright = require("playwright")

const electron = playwright._electron

let app
let page

async function startApp() {
    const app = await electron.launch({
        args: [path.join(__dirname, ".."), "--test"],
        executablePath: electronPath,
    })

    const page = await app.firstWindow()
    page.on("pageerror", error => assert.fail(`Page error: ${error}`))
    page.setDefaultTimeout(2000)
    await page.waitForSelector("h1") // Wait until the window is actually loaded

    return [app, page]
}

describe("Integration tests with single app instance", () => {
    before(async () => ([app, page] = await startApp()))

    after(async () => await app.close())

    it("opens a window", () => {
        assert.exists(page)
    })
})
