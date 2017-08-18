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

var storage = msg.type === 'L' ? localStorage : sessionStorage;
var result;

switch (msg.what) {

    case 'get':
        result = getStorage();
        break;

    case 'remove':
        storage.removeItem(msg.key);
        break;

    case 'set':

        // changing key?
        if (msg.oldKey !== undefined)  {
            storage.removeItem(msg.oldKey);
        }

        storage.setItem(msg.key, msg.value);
        break;

    case 'clear':
        storage.clear();
        break;

    case 'export':
        result = JSON.stringify(getStorage(), null, 4);
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

result;
