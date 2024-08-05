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

class Menu {
    static buildFromTemplate() {
        return new Menu()
    }
}

class Electron {
    app = {
        getPath() {
            return "/just/a/test/path/"
        },
    }

    BrowserWindow = BrowserWindow
    Menu = Menu
}

exports.createElectron = () => new Electron()
