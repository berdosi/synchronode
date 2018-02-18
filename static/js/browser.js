/* code running in the broser-based UI */

/* to polyfill
- fetch
*/
(function() {
    "use strict";
    const state = {
        connectionId: undefined,
        slaveId: undefined,
        socket: new WebSocket(`wss://${location.host}/browserWs/`),
    };
    const dom = {
        dirlisting: document.getElementById("dirlisting"),
    };

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
    function userFeedback(message) {
        console.info(message); // todo : replace with something less obtrusive
    }

    function listDir(path) {
        fetch(path)
            .then(function(r) { return r.json(); })
            .then(function(responseJson) {
                console.info("responseJson", responseJson);
                if (responseJson.listing) {
                    dom.dirlisting.innerHTML = "";
                    responseJson.listing.forEach(function(itemName) {
                        const itemRow = document.createElement("tr");
                        const itemIconCell = document.createElement("td");
                        const itemNameCell = document.createElement("td");
                        const itemSizeCell = document.createElement("td");
                        const itemDateCell = document.createElement("td");
                        const itemNameText = document.createTextNode(itemName);
                        const itemSizeText = document.createTextNode("");
                        const itemDateText = document.createTextNode("");

                        // note: this only works based on file/folder name.
                        // So folder names ending witth valid extensions will be misinterpreted.
                        itemIconCell.appendChild(makeIcon(itemName));
                        itemNameCell.appendChild(itemNameText);
                        itemSizeCell.appendChild(itemSizeText);
                        itemDateCell.appendChild(itemDateText);

                        [itemIconCell, itemNameCell, itemSizeCell, itemDateCell]
                            .forEach(function addCell(cell) { itemRow.appendChild(cell); });

                        dom.dirlisting.appendChild(itemRow);
                        itemRow.addEventListener("click", function() {
                            listDir(path + itemName + "/");
                        });
                    });
                } else if (responseJson.fileContents) {
                    const a = document.createElement("a");
                    a.href = `data:${responseJson.mimeType};base64,${responseJson.fileContents}`;
                    console.log(a, responseJson);
                    a.download = responseJson.path.replace(/\/$/, "");
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            });
    }
    document.getElementById("setSlave").addEventListener("click", function() {
        state.slaveId = document.getElementById("slaveId").value;
        listDir(`/browse/${state.slaveId}${state.connectionId ? ("," + state.connectionId) : ""}/`);
        //

    });
    document.getElementById("clearSlave").addEventListener("click", function() {

        state.slaveId = document.getElementById("slaveId").value = "";
        dom.dirlisting.innerHTML = "";
    });

    state.socket.addEventListener("open", function(event) {
        state.socket.send(JSON.stringify({"action": "register"}));
    });

    state.socket.addEventListener("message", function(event) {
        try {
            const message = JSON.parse(event.data);
            if (message.connectionId) {
                state.connectionId = message.connectionId;
            } else {
                console.log("other message", event.data);
            }
        } catch (e) { userFeedback("couldn't parse message from server"); }
    });

    console.log(state); // TODO remove from prod. :)
})();
