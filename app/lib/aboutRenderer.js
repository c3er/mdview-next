const path = require("path")

const common = require("./common")
const dialog = require("./dialogRenderer")
const menu = require("./menuRenderer")
const packageJson = require("./packageJsonRenderer")

let electron

const DIALOG_ID = "about"

let _document
let _dialogElement
let _okButton
let _aboutInfo = {}

function populateDialog(aboutInfo) {
    _document.getElementById("application-icon").setAttribute("src", aboutInfo.applicationIconPath)
    _document.getElementById("hompage").setAttribute("href", aboutInfo.homepage)
    _document.getElementById("application-name").innerText =
        `${aboutInfo.applicationName} ${aboutInfo.applicationVersion}`
    _document.getElementById("application-description").innerText = aboutInfo.applicationDescription
    _document.getElementById("framework-versions").innerHTML = aboutInfo.frameworkVersions
        .map(([framework, version]) => `<tr><th>${framework}</th><td>${version}</td></tr>`)
        .join("\n")
    _document.getElementById("issue-link").setAttribute("href", aboutInfo.issueLink)
}

exports.DIALOG_ID = DIALOG_ID

exports.init = (document, electronMock) => {
    electron = electronMock ?? require("electron")
    _document = document
    _dialogElement = _document.getElementById("about-dialog")

    for (const link of _document.getElementsByClassName("dialog-link")) {
        link.onclick = event => {
            event.preventDefault()
            electron.shell.openExternal(link.getAttribute("href"))
        }
    }

    _okButton = _document.getElementById("about-ok-button")
    dialog.addStdButtonHandler(_okButton, () => dialog.close())

    dialog.addStdButtonHandler(_document.getElementById("copy-about-info-button"), () => {
        const aboutInfo = structuredClone(_aboutInfo)
        const indentation = 4
        const filterList = ["applicationIconPath"]
        for (const filtered of filterList) {
            delete aboutInfo[filtered]
        }
        electron.clipboard.writeText(JSON.stringify(aboutInfo, null, indentation))

        _okButton.focus()
    })
}

exports.open = () => {
    const menuId = menu.id.about
    const packageInfo = packageJson.obj()
    _aboutInfo = {
        applicationIconPath: path.join(
            __dirname,
            "..",
            "assets",
            "icon",
            common.isMacOS() ? "md-mac-icon.svg" : "md-icon.svg",
        ),
        applicationName: common.APPLICATION_NAME,
        applicationDescription: packageInfo.description,
        applicationVersion: packageInfo.version,
        homepage: packageInfo.homepage,
        issueLink: packageInfo.bugs.url,

        // Based on electron-about-window: https://github.com/rhysd/electron-about-window
        // File src/renderer.ts, commit ID 9dc88da999d64e9a614d33adf649d566c0a35fcb
        frameworkVersions: ["electron", "chrome", "node", "v8"].map(framework => [
            framework,
            process.versions[framework],
        ]),
    }
    dialog.open(
        DIALOG_ID,
        () => {
            populateDialog(_aboutInfo)
            _dialogElement.showModal()
            _okButton.focus()
            menu.setEnabled(menuId, false)
        },
        () => {
            _dialogElement.close()
            menu.setEnabled(menuId, true)
        },
    )
}
