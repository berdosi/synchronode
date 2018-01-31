/* code running in the broser-based UI */

/* to polyfill
- fetch
*/
(function () {
    "use strict";
    const state = {
        slaveId: undefined
    };
    const dom = {
        dirlisting: document.getElementById("dirlisting")
    };

    const listDir = function (path) {
        fetch(path)
            .then(function (r) { return r.json() })
            .then(function (responseJson) {
                dom.dirlisting.innerHTML = "";
                console.info("responseJson", responseJson);
                if (responseJson.listing)
                    responseJson.listing.forEach(function (itemName) {
                        const a = document.createElement("a");
                        const t = document.createTextNode(itemName);
                        a.appendChild(t);
                        dom.dirlisting.appendChild(a);
                        a.addEventListener("click", function () {
                            listDir(path + itemName + "/");
                        });
                    });
                else if (responseJson.fileContents) {
                    const a = document.createElement("a");
                    a.href = `data:${responseJson.mimeType};base64,${responseJson.fileContents}`;
                    console.log(a, responseJson);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            })
    };
    document.getElementById("setSlave").addEventListener("click", function () {
        state.slaveId = document.getElementById("slaveId").value;
        listDir(`/browse/${state.slaveId}/`);
        // 

    });
    document.getElementById("clearSlave").addEventListener("click", function () {

        state.slaveId = document.getElementById("slaveId").value = "";

        dom.dirlisting.innerHTML = "";
    })


    console.log(state); // TODO remove from prod. :)
})()
