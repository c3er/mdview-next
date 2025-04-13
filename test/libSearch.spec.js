const assert = require("assert")

const mocking = require("./mocking")

const renderer = require("../app/lib/commonRenderer")
const search = require("../app/lib/searchRenderer")

describe("Search", () => {
    let document
    let htmlElement

    function initSearch() {
        search.init(document, () => {})
    }

    function performSearch(searchTerm, htmlElement) {
        const dialogElement = mocking.createHtmlElement()
        const dialogCallbacks = []
        dialogElement.addEventListener = (_, callback) => dialogCallbacks.push(callback)
        if (searchTerm) {
            dialogElement.returnValue = searchTerm
        }
        document.htmlElement = dialogElement
        initSearch()
        if (htmlElement) {
            document.htmlElement = htmlElement
        }
        search.start()
        for (const callback of dialogCallbacks) {
            callback(mocking.createEvent())
        }
    }

    beforeEach(() => {
        htmlElement = mocking.createHtmlElement()
        document = mocking.createDocument(htmlElement)

        renderer.init(document)
        search.reset()
        search.init(document, () => {})
    })

    it("is not active by default", () => {
        initSearch()
        assert(!search.isActive())
    })

    it("is active after confirming the dialog", () => {
        const searchTerm = "expected search term"

        performSearch(searchTerm)
        assert(search.isActive())
        assert.strictEqual(search.term(), searchTerm)
    })

    it("is inactive after cancelling the dialog", () => {
        performSearch(search.CANCEL_VALUE)
        assert(!search.isActive())
    })

    describe("Function highlightTerm", () => {
        it("highlights the search term", () => {
            const searchTerm = "expected search term"
            let selectedCount = 0

            const contentElement = mocking.createHtmlElement()
            contentElement.innerHTML =
                contentElement.innerText = `some text containing ${searchTerm}`
            contentElement.setAttribute = (attr, value) => {
                selectedCount++
                assert.strictEqual(attr, "id")
                assert.strictEqual(value, search.SELECTED_SEARCH_RESULT_ID)
            }
            document.htmlElement = contentElement

            performSearch(searchTerm, contentElement)
            assert(search.isActive())

            search.highlightTerm()
            const content = contentElement.innerHTML
            assert(content.includes(`class="${search.SEARCH_RESULT_CLASS}"`))
            assert.strictEqual(selectedCount, 1)
        })

        it("doesn't change the content, if term was not found", () => {
            const content = "some text not containing the search term"

            const contentElement = mocking.createHtmlElement()
            contentElement.innerHTML = contentElement.innerText = content
            document.htmlElement = contentElement

            performSearch("some text not to be found")
            assert(search.isActive())

            search.highlightTerm()
            assert(!search.isActive())
            assert.strictEqual(contentElement.innerHTML, content)
        })
    })
})
