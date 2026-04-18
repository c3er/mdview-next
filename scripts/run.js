const childProcess = require("child_process")
const fs = require("fs")
const path = require("path")

console.log(`Current directory: ${process.cwd()}`)

const logDir = "logs"
const currentLogFile = path.join(logDir, "main.log")

function output(line) {
    // See https://stackoverflow.com/a/41407246/13949398 (How to change node.js's console font color?)
    // and https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
    let format
    if (line.includes("[debug]")) {
        format = "\x1b[2m%s\x1b[0m"
    } else if (line.includes("[info]")) {
        format = "%s"
    } else if (line.includes("[error]")) {
        format = "\x1b[31m%s\x1b[0m"
    } else {
        // Assuming, that it belongs to a debug message
        format = "\x1b[2m%s\x1b[0m"
    }
    console.log(format, line)
}

try {
    fs.renameSync(
        currentLogFile,
        path.join(
            logDir,
            `${fs
                .statSync(currentLogFile)
                .mtime.toISOString()
                .split(".")[0]
                .replaceAll("-", "")
                .replaceAll("T", "")
                .replaceAll(":", "")}.log`,
        ),
    )
} catch (err) {
    console.warn(`Could not rename "${currentLogFile}": ${err}`)
}

const command = `npm start -- ${process.argv.slice(2).join(" ")}`
childProcess.exec(command, err => {
    if (err) {
        console.error(`Could not execute "${command}": ${err}`)
        process.exit(1)
    }
})

// eslint-disable-next-line curly
while (!fs.existsSync(currentLogFile));

const intervalTime = 200
const bufferSize = 100000
const buffer = Buffer.alloc(bufferSize, 0, "utf8")
const logFileDescriptor = fs.openSync(currentLogFile)
let lastLine = ""
setInterval(() => {
    const bytesRead = fs.readSync(logFileDescriptor, buffer, 0, bufferSize)
    if (bytesRead === 0) {
        return
    }

    const content = buffer.toString()
    buffer.fill(0)

    const lines = content.split("\n")
    if (lastLine) {
        output(lastLine + lines.shift())
    }
    lastLine = lines.pop()

    for (const line of lines) {
        output(line)
    }

    if (content.includes("Main process stopped")) {
        process.exit(0)
    }
}, intervalTime)
