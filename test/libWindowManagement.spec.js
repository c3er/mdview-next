const assert = require("chai").assert

const windowManagement = require("../app/lib/main/windowManagement")

const mocking = require("./mocking")

describe("Window management", () => {
    const defaultFile = "non-existing-default-file.md"

    function assertOpenedWithSingleFile(file) {
        const windows = windowManagement.windows()
        assert.strictEqual(Object.keys(windows).length, 1)
        assert.strictEqual(windowManagement.lastOpenedFilePath(), file)
        assert.exists(windows[file])
        return windows
    }

    beforeEach(() => windowManagement.init(defaultFile, mocking.createElectron()))

    afterEach(windowManagement.reset)

    it("opens a window with default file", () => {
        windowManagement.open()
        assertOpenedWithSingleFile(defaultFile)
    })

    it("opens a window with given file", () => {
        const file = "non-existing-testfile.md"
        windowManagement.open(file)

        const windows = assertOpenedWithSingleFile(file)
        assert.notExists(windows[defaultFile])
    })

    it("focuses existing window if opened with same file again", () => {
        const file = "non-existing-testfile.md"

        windowManagement.open(file)
        assertOpenedWithSingleFile(file)

        windowManagement.open(file)
        const windows = assertOpenedWithSingleFile(file)
        assert.isTrue(windows[file].focusIsCalled)
    })

    it("closes a window", () => {
        const file = "non-existing-testfile.md"

        windowManagement.open(file)
        const openedWindow = assertOpenedWithSingleFile(file)[file]

        windowManagement.close(file)
        assert.strictEqual(Object.keys(windowManagement.windows()).length, 0)
        assert.isTrue(openedWindow.closeIsCalled)
    })

    it("throws an error at attempt to close a non existing window", () => {
        const file = "non-existing-testfile.md"
        assert.throws(() => windowManagement.close(file), new RegExp(file))
    })
})
