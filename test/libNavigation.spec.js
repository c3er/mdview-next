const assert = require("assert")
const path = require("path")

const mocking = require("./mocking")

const documentDirectory = path.join(__dirname, "documents")
const mdFilePath = path.join(documentDirectory, "testfile_utf8.md")

describe("Navigation", () => {
    const ipc = require("../app/lib/ipcRenderer")
    const navigation = require("../app/lib/navigationRenderer")
    const renderer = require("../app/lib/commonRenderer")

    let htmlElement
    let document

    beforeEach(() => {
        mocking.cleanup()
        mocking.ipc.register.mainOn(ipc.messages.intern.setMenuItemEnabled)

        htmlElement = mocking.createHtmlElement()
        document = mocking.createDocument(htmlElement)
        const electron = mocking.createElectron()

        ipc.init(electron)
        renderer.init(document)
        navigation.init(document, electron)
    })

    it("gets events", () => {
        htmlElement.onclick = null
        navigation.registerLink(htmlElement, mdFilePath, documentDirectory)

        assert(htmlElement.onclick !== null)
    })

    describe("History", () => {
        const EMPTY_TARGET = ""
        const TARGET1 = "target1"
        const TARGET2 = "target2"
        const TARGET3 = "target3"

        function assertHistoryJumping(canGoBack, canGoForward) {
            assert.strictEqual(navigation.canGoBack(), canGoBack)
            assert.strictEqual(navigation.canGoForward(), canGoForward)
        }

        function go(target) {
            navigation.go(target)
            assert.strictEqual(navigation.currentTarget(), target)
        }

        function back(expectedTarget) {
            navigation.back()
            assert.strictEqual(navigation.currentTarget(), expectedTarget)
        }

        function forward(expectedTarget) {
            navigation.forward()
            assert.strictEqual(navigation.currentTarget(), expectedTarget)
        }

        it("starts empty", () => {
            assertHistoryJumping(false, false)
            assert.strictEqual(navigation.currentTarget(), "")
        })

        it("goes back and forth between files", () => {
            assertHistoryJumping(false, false)

            go(TARGET1)
            go(TARGET2)
            go(TARGET3)
            assertHistoryJumping(true, false)

            back(TARGET2)
            assertHistoryJumping(true, true)

            back(TARGET1)
            assertHistoryJumping(true, true)

            forward(TARGET2)
            assertHistoryJumping(true, true)

            forward(TARGET3)
            assertHistoryJumping(true, false)

            forward(TARGET3)
            assertHistoryJumping(true, false)

            back(TARGET2)
            back(TARGET1)
            back(EMPTY_TARGET)
            assertHistoryJumping(false, true)

            back(EMPTY_TARGET)
            assertHistoryJumping(false, true)

            go(TARGET3)
            assertHistoryJumping(true, false)
        })
    })
})
