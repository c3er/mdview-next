const lib = require("./testLib")
const mocking = require("./mocking")

describe("Menu module", () => {
    describe("Renderer part", () => {
        const ipc = require("../app/lib/ipcRenderer")

        const menu = require("../app/lib/menuRenderer")
        const menuShared = require("../app/lib/menuShared")

        beforeEach(() => {
            mocking.cleanup()
            lib.registerElectronLogIpc()
            ipc.init(mocking.createElectron())
            menu.init()
        })

        describe("Handlers", () => {
            beforeEach(() => mocking.ipc.register.mainOn(ipc.messages.intern.closeWindow))

            for (const menuId of Object.values(menuShared.id)) {
                it(`handles menu entry "${menuId}`, () => {
                    mocking.ipc.sendToRenderer(menuShared.ipcMessageId(menuId))
                })
            }
        })
    })
})
