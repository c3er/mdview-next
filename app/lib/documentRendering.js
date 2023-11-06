let _markdown

exports.reset = () => {
    _markdown = require("markdown-it")({
        xhtmlOut: true,
        html: true,
        linkify: true,
    })
}

exports.render = content => _markdown.render(content)
