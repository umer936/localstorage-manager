(function(window, document, chrome) {
'use strict';

var storage;

function getStorage() {
    var obj = {};

    if (storage === undefined) {
        return;
    }

    for (var i in storage) {
        obj[i] = storage.getItem(i);
    }
    return obj;
}

chrome.runtime.onMessage.addListener(function(msg, sender, response) {

    var type = msg.type; // L ou S

    storage = type === 'L' ? localStorage : sessionStorage;

    switch (msg.what) {

        case 'get':
            response(getStorage());
            break;

        case 'remove':
            storage.removeItem(msg.key);
            break;

        case 'set':

            // alterando key?
            if (msg.oldKey !== undefined)  {
                storage.removeItem(msg.oldKey);
            }

            storage.setItem(msg.key, msg.value);
            break;

        case 'clear':
            storage.clear();
            break;

        case 'export':
            response(JSON.stringify(getStorage(), null, 4));
            break;

        case 'import':
            try {
                var obj = JSON.parse(msg.json);
                for (var i in obj) {
                    storage.setItem(i, obj[i]);
                }
            }
            catch(e) {}
            break;
    }
});


chrome.runtime.sendMessage({ host: location.host }, function(response) {

    if (response.localStorage !== undefined) {
        var obj = JSON.parse(response.localStorage);

        for (var i in obj) {
            localStorage.setItem(i, obj[i]);
        }
    }

    if (response.sessionStorage !== undefined) {
        var obj = JSON.parse(response.sessionStorage);

        for (var i in obj) {
            sessionStorage.setItem(i, obj[i]);
        }
    }
});

})(window, document, chrome);
