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
    document.getElementById("setSlave").addEventListener("click", function () {
        state.slaveId = document.getElementById("slaveId").value;

        // 
        fetch(`/browse/${state.slaveId}/`)
            .then(function (r) { return r.json() })
            .then(function (responseJson) {
                console.info("responseJson", responseJson);
                responseJson.listing.forEach(function (element) {
                    const a = document.createElement("a");
                    const t = document.createTextNode(element);
                    a.appendChild(t);
                    dom.dirlisting.appendChild(a);
                });
            })
    })

    console.log(state); // TODO remove from prod. :)
})()
