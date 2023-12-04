class BrowserWindow {
    closeIsCalled = false
    focusIsCalled = false

    on() {}

    loadFile() {}

    close() {
        this.closeIsCalled = true
    }

    focus() {
        this.focusIsCalled = true
    }
}

class Electron {
    app = {
        getPath() {
            return "/just/a/test/path/"
        },
    }

    BrowserWindow = BrowserWindow
}

exports.createElectron = () => new Electron()
