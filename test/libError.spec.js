const assert = require("assert")

const mocking = require("./mocking")

describe("Error dialog", () => {
    const dialog = require("../app/lib/dialogRenderer")
    const error = require("../app/lib/errorRenderer")

    beforeEach(() => {
        dialog.reset()
        error.init(mocking.createDocument())
    })

    it("is closed by default", () => {
        assert(!dialog.isOpen())
        assert(dialog.current() === null)
    })

    it('is open after "show" call', () => {
        error.show("Some message")
        assert(dialog.isOpen())
        assert.strictEqual(dialog.current().id, error.DIALOG_ID)
    })

    it("is closed after opening and closing", () => {
        error.show("Some message")
        assert(dialog.isOpen())
        assert.strictEqual(dialog.current().id, error.DIALOG_ID)

        dialog.close()
        assert(!dialog.isOpen())
        assert(dialog.current() === null)
    })
})
