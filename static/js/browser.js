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
                console.info("responseJson", responseJson);
                responseJson.listing.forEach(function (itemName) {
                    const a = document.createElement("a");
                    const t = document.createTextNode(itemName);
                    a.appendChild(t);
                    dom.dirlisting.appendChild(a);
                    a.addEventListener("click", function () {
                        listDir(path + itemName + "/");
                    });
                });
            })
    };
    document.getElementById("setSlave").addEventListener("click", function () {
        state.slaveId = document.getElementById("slaveId").value;
        listDir(`/browse/${state.slaveId}/`);
        // 

    })

    console.log(state); // TODO remove from prod. :)
})()
