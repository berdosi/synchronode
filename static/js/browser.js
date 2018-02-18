/* code running in the broser-based UI */

/* to polyfill
- fetch
*/
(function() {
    "use strict";
    const state = {
        connectionId: "",
        dom: {
            dirListing: document.getElementById("dirListing"),
            dirListingMap: new Map(),
        },
        slaveId: "",
        socket: new WebSocket(`wss://${location.host}/browserWs/`),
        statDataCache: new Map(),
    };

    // Set Slave
    document.getElementById("setSlave").addEventListener("click", function() {
        if (!document.getElementById("slaveId").value) { return; }

        state.slaveId = document.getElementById("slaveId").value;
        listDir(`/browse/${state.slaveId}${state.connectionId ? ("," + state.connectionId) : ""}/`);
    });
    // Clear Slave
    document.getElementById("clearSlave").addEventListener("click", function() {
        state.slaveId = document.getElementById("slaveId").value = "";
        state.dom.dirListing.innerHTML = "";
    });

    // WebSocket event handlers

    // On "open" request an ID or the connection
    state.socket.addEventListener("open", function(event) {
        state.socket.send(JSON.stringify({"action": "register"}));
    });

    // on "message"
    // - store connectionId, if there is one (when the server answers a register request)
    // - handle "stat" messages
    // - TODO : handle chunked responses
    state.socket.addEventListener("message", function(event) {
        try {
            const message = JSON.parse(event.data);
            if (message.connectionId) {
                state.connectionId = message.connectionId;
            } else {
                if (message.action === "stat") {
                    state.statDataCache.set(message.filePath.replace(/.*\//, ""), message);
                    // if the dirListing already arrived, update the respecive entry
                    updateEntry(message);
                }
            }
        } catch (e) { userFeedback("couldn't parse message from server"); }
    });

    /** Fetch path from server; handle based on its type
     *  - if the path was a directory, it has a 'listing' property, so its contents are listed
     *  - if the path was a file, the response has either:
     *      - fileContents property, so it is downloaded as a file, or
     *      - chunks property: the file will be downloaded via webSockets in chunks (TODO implementation)
     * @param {string} path
     */
    function listDir(path) {
        fetch(path)
            .then(function handleRequest(r) { return r.json(); })
            .then(function handleResponseJson(responseJson) {
                if (responseJson.listing) {
                    handleListing(responseJson);
                } else if (responseJson.fileContents) {
                    // small files can be transferred via normal GET requests.
                    downloadFileContents(responseJson);
                }
            });
    }

    /** Create an icon based on file name.
     * Note: this will fail with directories - their icons are replaced
     * later on based on stat data (received via WebSocket.
     * @param {string} fileName
     * @returns {HTMLElement} Element with the proper CSS classes.
     */
    function makeIcon(fileName) {
        const i = document.createElement("i");
        i.classList.add("far");
        i.classList.add(
            (/\.(jpe?g|gif|bmp|xcf|png|svgz?)$/.test(fileName) && "fa-file-image")
            || (/\.(mp3|ogg|wav|flac)$/.test(fileName) && "fa-file-audio")
            || (/\.(gz|bz2|xz|zip|rar|tar)$/.test(fileName) && "fa-file-archive")
            || (/\.(js|c|xml|html|py|pl|sh)$/.test(fileName) && "fa-file-code")
            || (/\.(pdf)$/.test(fileName) && "fa-file-pdf")
            || (/\.(ppt|pptx)$/.test(fileName) && "fa-file-powerpoint")
            || (/\.(doc|docx)$/.test(fileName) && "fa-file-word")
            || (/\.(xls|xlsx|xlsm|xla|csv)$/.test(fileName) && "fa-file-excel")
            || (/\.(mpe?g|avi|mp4|mkv)$/.test(fileName) && "fa-file-video")
            || (/\.(txt|nfo)$/.test(fileName) && "fa-file-alt")
            || "fa-file");
        return i;
    }

    /** Create the DOM for displaying a file listing entry.
     * @param {string} itemName File name to show
     * @returns {HTMLTableRowElement} Created table row.
     */
    function createItemRowElement(itemName) {
        const itemRow = document.createElement("tr");
        const itemIconCell = document.createElement("td");
        const itemNameCell = document.createElement("td");
        const itemSizeCell = document.createElement("td");
        const itemDateCell = document.createElement("td");
        const itemNameText = document.createTextNode(itemName);
        const itemSizeText = document.createTextNode("");
        const itemDateText = document.createTextNode("");

        // note: this only works based on file/folder name.
        // So folder names ending with valid extensions will be misinterpreted.
        const itemIconElement = makeIcon(itemName);
        itemIconCell.appendChild(itemIconElement);
        itemNameCell.appendChild(itemNameText);
        itemSizeCell.appendChild(itemSizeText);
        itemDateCell.appendChild(itemDateText);

        [itemIconCell, itemNameCell, itemSizeCell, itemDateCell]
            .forEach(function addCell(cell) { itemRow.appendChild(cell); });

        // if the item's stat data is yet to arrive, cache its DOM's reference.
        state.dom.dirListingMap.set(itemName, {
            iconElement: itemIconElement,
            itemDateText: itemDateText,
            itemSizeText: itemSizeText,
            row: itemRow,
        });

        state.dom.dirListing.appendChild(itemRow);

        return itemRow;
    }

    /** Handle server responses containing directory listing:
     * - list their contents in the dirListing table
     * @param {ResponseJson} responseJson
     */
    function handleListing(responseJson) {
        state.dom.dirListing.innerHTML = "";
        responseJson.listing.forEach(function listItemHandler(itemName) {
            const itemRow = createItemRowElement(itemName);
            // if the item's metadata arrived, update it right away.
            if (state.statDataCache.has(itemName)) {
                updateEntry(state.statDataCache.get(itemName));
            }
            itemRow.addEventListener("click", function itemRowClick() {
                // clear statData Cache (or else stale entries will be used)
                state.statDataCache.clear();
                listDir(path + itemName + "/");
            });
        });
    }

    /** Download file encapsulated in server's JSON response.
     * @param {ResponseJson} responseJson
     */
    function downloadFileContents(responseJson) {
        const a = document.createElement("a");
        a.href = `data:${responseJson.mimeType};base64,${responseJson.fileContents}`;
        a.download = responseJson.path.replace(/\/$/, "").replace(/.*\//, "");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /** Update a line within dirListing based on stat data.
     * If the line doesn't exist yet, return.
     * This function is called by :
     * - listDir on all elements (updating the metadata for the items where it arrived before the dirListing),
     * - onMessage event handler (updating the metadata for items where it arrives after the dirListing)
     * @param {Object} statData
     * @returns {undefined}
     */
    function updateEntry(statData) {
        const fileName = statData.filePath.replace(/.*\//, "");
        const entryRow = state.dom.dirListingMap.get(fileName);
        if (!entryRow) { return; }
        // octal mask, see http://man7.org/linux/man-pages/man7/inode.7.html
        const isFile = statData.response.mode >= 32768;
        // convert to octal representation, and get last three digits
        const permissions = Number(statData.response.mode).toString(8).replace(/.*(...)/, "$1");
        const size = statData.response.size;
        const modTime = new Date(statData.response.mtimeMs);
        const modTimeString = new Date(statData.response.mtime);

        if (!isFile) { entryRow.iconElement.className = "far fa-folder"; }
        entryRow.itemDateText.textContent = modTimeString;
        entryRow.itemSizeText.textContent = size;
    }

    /** Provide feedback to the user.
     * @param {any} message Message to show.
     */
    function userFeedback(message) {
        console.info(message); // todo : replace with something more userfriendly
    }

    userFeedback(state); // TODO remove from prod. :)
})();
