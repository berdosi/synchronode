/* code running in the broser-based UI */

/* to polyfill
- fetch
- backtick strings
*/
(function() {
    "use strict";
    /** @typedef EntryRow
     * @prop {HTMLElement} iconElement
     * @prop {TextNode} itemDateText
     * @prop {TextNode} itemSizeText
     * @prop {HTMLTableRowElement} row
     */
    /** @typedef StatDataResponse
     * @prop {number} mode File type and permissions as bitmask, see http://man7.org/linux/man-pages/man7/inode.7.html
     * @prop {number} size Size in bytes.
     * @prop {string} atime Access time (date string)
     * @prop {number} atimeMs Access time (ms since Epoch)
     * @prop {string} birthtime Change time (date string)
     * @prop {number} birthtimeMs Change time (ms since Epoch)
     * @prop {string} mtime Modification time (date string)
     * @prop {number} mtimeMs Modification time (ms since Epoch)
     */
    /** @typedef StatResponse
     * @prop {string} filePath
     * @prop {StatDataResponse} response
     * @prop {string} action
     * @prop {string} path
     * @prop {string} requestId
     */
    const state = {
        connectionId: "",
        currentDir: "",
        dom: {
            dirListing: document.getElementById("dirListing"),
            /** @type {Map<string,EntryRow>} */
            dirListingMap: new Map(),
        },
        slaveId: "",
        socket: new WebSocket(`wss://${location.host}/browserWs/`),
        sorting: {
            lastSortedBy: "",
            sortDirection: 1,
        },
        /** @type {Map<string,StatResponse>} */
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

    // up one level
    document.getElementById("upLevel").addEventListener("click", function() {
        /* path looks like "/browse/slaveId,connectionId/path/elements/"
           there is always a slash at the begining and at the end */
        const currentPathElements = state.currentDir
            .split("\/");
        if (currentPathElements.length > 4) {
            /* Get the directory one level up. As there is always a trailing slash,
               (and thus an empty element), the last two elements are to be omitted,
               and then the empty one added, again.
            */
            listDir(currentPathElements.slice(0, currentPathElements.length - 2).concat("").join("/"));
        } else {
            userFeedback("Cannot go up any more.");
        }
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

                // keep the connection alive
                setInterval(
                    function keepAlive() {
                        state.socket.send(
                            JSON.stringify({
                                "action": "keep-alive",
                                "connectionId": state.connectionId,
                            }));
                        },
                    60000);
            } else {
                if (message.action === "stat") {
                    state.statDataCache.set(message.filePath.replace(/.*\//, ""), message);
                    // if the dirListing already arrived, update the respecive entry
                    updateEntry(message);
                }
            }
        } catch (e) { userFeedback("couldn't parse message from server"); }
    });

    // make table sortable
    Array.prototype.slice.call(document.querySelectorAll(".sorter")).forEach(function addTableHeaderEventHandler(th) {
        th.addEventListener("click", function tableHeaderClick() {
            const sortType = th.dataset.sortType;
            const fieldName = th.dataset.fieldName;

            // invert sort direction, if sorting by the same field again
            if (state.sorting.lastSortedBy === fieldName) {
                state.sorting.sortDirection *= -1;
            } else {
                state.sorting.sortDirection = 1;
            }
            state.sorting.lastSortedBy = fieldName;

            Array.prototype.slice
                .call(state.dom.dirListing.childNodes)
                .sort(function(one, another) {
                    const oneValue = (sortType === "numeric")
                        ? parseInt(one.dataset[fieldName], 10)
                        : one.dataset[fieldName];
                    const anotherValue = (sortType === "numeric")
                        ? parseInt(another.dataset[fieldName], 10)
                        : another.dataset[fieldName];
                    return ((oneValue <= anotherValue) ? -1 : 1) * state.sorting.sortDirection;
                })
                .forEach(function(row) { state.dom.dirListing.appendChild(row); });
        });
    });

    /** Fetch path from server; handle based on its type
     *  - if the path was a directory, it has a 'listing' property, so its contents are listed
     *  - if the path was a file, the response has either:
     *      - fileContents property, so it is downloaded as a file, or
     *      - chunks property: the file will be downloaded via webSockets in chunks (TODO implementation)
     * @param {string} path
     */
    function listDir(path) {
        const rq = new XMLHttpRequest();
        rq.open("GET", path, true);
        rq.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                try {
                    (function handleResponseJson(responseJson) {
                        if (responseJson.listing) {
                            handleListing(responseJson, path);
                            state.currentDir = path;
                        } else if (responseJson.fileContents) {
                            // small files can be transferred via normal GET requests.
                            downloadFileContents(responseJson);
                        }
                    })(JSON.parse(rq.responseText));
                } catch (e) {
                    userFeedback("Cannot parse response from server");
                }
            }
        };
        rq.send();

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

        itemIconCell.classList.add("icon");
        itemNameCell.classList.add("name");
        itemSizeCell.classList.add("size");
        itemDateCell.classList.add("date");

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
     * @param {string} path
     */
    function handleListing(responseJson, path) {
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
     * @param {StatResponse} statData
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
        const modTimeString = statData.response.mtime;

        if (!isFile) { entryRow.iconElement.className = "far fa-folder"; }
        entryRow.itemDateText.textContent = formatValue(statData.response.mtimeMs, "date");
        entryRow.itemSizeText.textContent = formatValue(size, "size");

        // setting data attributes on table row for sorting
        entryRow.row.dataset.date = statData.response.mtimeMs;
        entryRow.row.dataset.size = size;
        entryRow.row.dataset.name = fileName;
    }

    /** Format numeric values with pre-defined fomatters.
     * @param {number} value The value to be formatted
     * @param {string} mode Formatting mode. Currently "date" or "size".
     * @returns {string} Formatted value.
     */
    function formatValue(value, mode) {
        if (mode === "date") {
            const date = new Date(value);
            // format like: "Mar 02 17:03"
            return ["Jan", "Feb", "Mar",
                    "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep",
                    "Oct", "Nov", "Dec"][date.getMonth()] +
                   (" " + date.getDate() +
                    " " + date.getHours() +
                    ":" + date.getMinutes())
                .replace(/([^0-9])([0-9])([^0-9]|$)/g, "$10$2$3");
        }
        if (mode === "size") {
            // 3 significant digits + Unit (3.14kB, 314kB, 31.4MB)
            const clip = {
                "TB": Math.pow(10, 12),
                // tslint:disable-next-line:object-literal-sort-keys
                "GB": Math.pow(10, 9),
                "MB": Math.pow(10, 6),
                "kB": Math.pow(10, 3),
                // tslint:disable-next-line:object-literal-sort-keys
                "bytes": 1 };
            const unit = ((value >= clip.TB) && "TB") ||
                ((value >= clip.GB) && "GB") ||
                ((value >= clip.MB) && "MB") ||
                ((value >=  clip.kB) && "kB") ||
                "bytes";
            /* note: this is not rounded but clipped. But it is good enough.
             To err is human. 0.5% is fine for machines, too.
             It also fails at Really Huge values.
            */
            const numberToRound = (value / clip[unit]).toString().substr(0, 4).replace(/\.$/, "");

            return numberToRound + "\u2008" + unit;
        }
    }
    /** Provide feedback to the user.
     * @param {any} message Message to show.
     */
    function userFeedback(message) {
        console.info(message); // todo : replace with something more userfriendly
    }

    userFeedback(state); // TODO remove from prod. :)
})();
