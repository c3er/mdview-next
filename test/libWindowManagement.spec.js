const assert = require("assert")

const contentBlocking = require("../app/lib/contentBlockingMain")
const ipc = require("../app/lib/ipcMainIntern")
const menu = require("../app/lib/menuMain")
const windowManagement = require("../app/lib/windowManagementMain")

const mocking = require("./mocking")

describe("Window management", () => {
    const defaultFile = "non-existing-default-file.md"

    function assertOpenedWithSingleFile(file) {
        const windows = windowManagement.windows()
        assert.strictEqual(Object.keys(windows).length, 1)
        assert.strictEqual(windowManagement.lastOpenedFilePath(), file)
        assert(Boolean(windows[file]))
        return windows
    }

    beforeEach(() => {
        mocking.cleanup()
        const electronMock = mocking.createElectron()
        menu.init(electronMock)
        ipc.init(electronMock)
        windowManagement.init(defaultFile, electronMock)
    })

    afterEach(windowManagement.reset)

    it("opens a window with default file", () => {
        windowManagement.open()
        assertOpenedWithSingleFile(defaultFile)
    })

    it("opens a window with given file", () => {
        const file = "non-existing-testfile.md"
        windowManagement.open(file)

        const windows = assertOpenedWithSingleFile(file)
        assert(!windows[defaultFile])
    })

    it("focuses existing window if opened with same file again", () => {
        const file = "non-existing-testfile.md"

        windowManagement.open(file)
        assertOpenedWithSingleFile(file)

        windowManagement.open(file)
        const windows = assertOpenedWithSingleFile(file)
        assert(windows[file].focusIsCalled)
    })

    it("closes a window", () => {
        const file = "non-existing-testfile.md"

        windowManagement.open(file)
        const openedWindow = assertOpenedWithSingleFile(file)[file]

        windowManagement.close(file)
        assert.strictEqual(Object.keys(windowManagement.windows()).length, 0)
        assert(openedWindow.closeIsCalled)
    })

    it("throws an error at attempt to close a non existing window", () => {
        const file = "non-existing-testfile.md"
        assert.throws(() => windowManagement.close(file), new RegExp(file))
    })

    it("unblocks a URL", () => {
        const expectedUrl = "http://example.com"
        const file1 = "non-existing-testfile1.md"
        const file2 = "non-existing-testfile2.md"

        let messageSentCount = 0
        mocking.ipc.register.webContentsSend(ipc.messages.intern.contentUnblocked, (_, url) => {
            assert.strictEqual(url, expectedUrl)
            messageSentCount++
        })

        windowManagement.open(file1)
        windowManagement.open(file2)
        const windows = windowManagement.windows()
        const window1 = windows[file1]

        assert(contentBlocking.isBlocked(expectedUrl))
        window1.unblock(expectedUrl)

        assert(!contentBlocking.isBlocked(expectedUrl))
        assert.strictEqual(messageSentCount, 1)
    })
})
