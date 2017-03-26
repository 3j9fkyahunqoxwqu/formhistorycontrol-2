browser.runtime.onMessage.addListener(receiveEvents);

function receiveEvents(fhcEvent) {
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 1:
                /* Process Text */
                fhcEvent.value = JSON.parse(fhcEvent.value);
                console.log("Received a content event! for " + fhcEvent.id + " content is: " + fhcEvent.value);
                saveOrUpdateTextField(fhcEvent);
                break;
            case 2:
                /* Process non-text like radiobuttons, checkboxes etcetera */
                console.log("Received a formelement event! for " + fhcEvent.id + " which is a " + fhcEvent.type);
                break;
        }
    }

}

//----------------------------------------------------------------------------
// Database methods
//----------------------------------------------------------------------------

const DB_NAME = "FormHistoryControl8";
const DB_VERSION = 1;
const DB_STORE_TEXT = 'text_history8';

var db;

/**
 * Initialize (open) the database, create or upgrade if necessary.
 */
function initDatabase() {
    console.log("Open database " + DB_NAME + "...");
    var req;
    try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (ex){
        console.error("Error opening database: " + ex.name + ": " + ex.message + "\nEnabling cookies might resolve this.");
    }
    req.onsuccess = function (event) {
        // Better use "this" than "req" to get the result to avoid problems with garbage collection.
        db = event.target.result;
        //db = this.result;
        console.log("Database opened successfully.");

        doDatabaseTests();
    };
    req.onerror = function (event) {
        console.error("Database open error: " + event.target.errorCode);
    };
    req.onupgradeneeded = function (event) {
        console.log("Database upgrade start...");
        var db = event.target.result;

        // Create an objectStore for this database
        if (event.oldVersion < 1) {
            var objStore = db.createObjectStore(DB_STORE_TEXT, {autoIncrement: true});
            objStore.createIndex("by_fieldkey", "fieldkey", {unique: true});
            objStore.createIndex("by_name", "name", {unique: false});
            objStore.createIndex("by_value", "value", {unique: false});
            objStore.createIndex("by_type", "type", {unique: false});
            objStore.createIndex("by_first", "first", {unique: false});
            objStore.createIndex("by_last", "last", {unique: false});
            objStore.createIndex("by_host", "host", {unique: false});
            objStore.createIndex("by_uri", "uri", {unique: false});
            objStore.createIndex("by_pagetitle", "pagetitle", {unique: false});
        }

        // // Create an objectStore for this database
        // if (event.oldVersion < 1) {
        //     var objStore = db.createObjectStore(DB_STORE_TEXT, {keyPath: 'id', autoIncrement: true});
        //     objStore.createIndex("name", "name", {unique: false});
        //     objStore.createIndex("value", "value", {unique: false});
        //     objStore.createIndex("first", "first", {unique: false});
        //     objStore.createIndex("last", "last", {unique: false});
        //     objStore.createIndex("host", "host", {unique: false});
        //     objStore.createIndex("uri", "uri", {unique: false});
        // }
        // if (event.oldVersion < 2) {
        //     // Version 2 introduces 2 new indexes
        //     var objStore = req.transaction.objectStore(DB_STORE_TEXT);
        //     objStore.createIndex("by_type", "type", {unique: false});
        //     objStore.createIndex("bt_pagetitle", "pagetitle", {unique: false});
        // }
        // if (event.oldVersion < 3) {
        //     // Version 3 renames new indexes
        //     var objStore = req.transaction.objectStore(DB_STORE_TEXT);
        //     objStore.deleteIndex("name");
        //     objStore.deleteIndex("value");
        //     objStore.deleteIndex("first");
        //     objStore.deleteIndex("last");
        //     objStore.deleteIndex("host");
        //     objStore.deleteIndex("uri");
        //     objStore.deleteIndex("bt_pagetitle");
        //
        //     objStore.createIndex("by_name", "name", {unique: false});
        //     objStore.createIndex("by_value", "value", {unique: false});
        //     objStore.createIndex("by_first", "first", {unique: false});
        //     objStore.createIndex("by_last", "last", {unique: false});
        //     objStore.createIndex("by_host", "host", {unique: false});
        //     objStore.createIndex("by_uri", "uri", {unique: false});
        //     objStore.createIndex("by_pagetitle", "pagetitle", {unique: false});
        // }
        // if (event.oldVersion < 4) {
        //     // Version 4 additional indexe
        //     var objStore = req.transaction.objectStore(DB_STORE_TEXT);
        //     objStore.createIndex("by_host_name", "host_name", {unique: true});
        // }

        // Use transaction oncomplete to make sure the objStore creation is finished before adding data into it.
        objStore.transaction.oncomplete = function (event) {
            console.log("Database upgrade success.");
            doDatabaseTests();
        };
        console.log("Database upgrade finished.");
    };
}

/**
 * Get a transaction for the objectStore.
 *
 * @param {string} store_name
 * @param {string} mode either "readonly" or "readwrite"
 */
function getObjectStore(store_name, mode) {
    var tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
}


function saveOrUpdateTextField(fhcEvent) {
    var objStore = getObjectStore(DB_STORE_TEXT, "readwrite");

    // entry already exists? (index = host + type + name + value)
    var key = getLookupKey(fhcEvent);

    var index = objStore.index("by_fieldkey");
    var req = index.getKey(key);

    req.onsuccess = function(event) {
        var key = event.target.result;
        var now = (new Date()).getTime();
        if (key) {
            //console.log("entry exist, updating value for key " + key);

            // now get the complete record by key
            var getReq = objStore.get(key);
            getReq.onerror = function(event) {
                console.error("Get (for update) failed for record-key " + key, this.error);
            };
            getReq.onsuccess = function(event) {
                var fhcEntry = event.target.result;
                // fhcEntry.used++;
                // fhcEntry.last = now;
                // fhcEntry.uri = fhcEvent.url;
                // fhcEntry.pagetitle = "ToDo;";
                // var updateReq = objStore.put(fhcEntry);
                // updateReq.onsuccess = function(updateEvent) {
                //     console.log("Update okay, id: " + updateEvent.target.result);
                // };
                // updateReq.onerror = function(updateEvent) {
                //     console.error("Update failed! " + updateReq.error.name + ": " + updateReq.error.message);
                // };
                var deleteReq = objStore.delete(key);
                deleteReq.onerror = function(deleteEvent) {
                    console.error("Delete (for update) failed for record-key " + key, this.error);
                };
                deleteReq.onsuccess = function(deleteEvent) {
                    //console.log("Delete (for update) okay");

                    // now add the modified record
                    fhcEntry.used++;
                    fhcEntry.last = now;
                    fhcEntry.uri = fhcEvent.url;
                    fhcEntry.pagetitle = "ToDo;";

                    // if it is a multiline field (not input) value must be updated too
                    if ("input" !== fhcEvent.type) {
                        fhcEntry.value = fhcEvent.value;
                    }

                    var addReq = objStore.add(fhcEntry);
                    addReq.onerror = function(addEvent) {
                        console.error("Add (for update) failed for original record with record-key " + key, this.error);
                    };
                    addReq.onsuccess = function(addEvent) {
                        console.log("Update succeeded for record-key " + key + ", new record-key is " + addEvent.target.result);
                    };
                };

            };
        } else {
            console.log("entry does not exist, adding...");
            var fhcEntry = {
                fieldkey: getLookupKey(fhcEvent),
                name: fhcEvent.name,
                value: fhcEvent.value,
                type: fhcEvent.type,
                first: now,
                last: now,
                used: 1,
                host: fhcEvent.host,
                uri: fhcEvent.host,
                pagetitle: "ToDo"
            }
            var insertReq = objStore.add(fhcEntry);
            insertReq.onerror = function(insertEvent) {
                console.error("Insert failed!", this.error);
            };
            insertReq.onsuccess = function(insertEvent) {
                console.log("Insert succeeded, new record-key is " + insertEvent.target.result);
            };
        }
    };
}


function clearTextFieldsStore() {
    var objStore = getObjectStore(DB_STORE_TEXT, "readwrite");
    var req = objStore.clear();
    req.onsuccess = function(insertEvent) {
        console.log("Clear okay, all TextField records deleted!");
    };
    req.onerror = function(insertEvent) {
        console.error("Clear failed!!");
    };
}

function getLookupKey(fhcEvent) {
    var key = fhcEvent.host + "|" + fhcEvent.type + "|" + fhcEvent.name;
    // for wysiwyg fields values are updated on each keystroke, so we do not want to insert a new entry for each change
    if ("input" === fhcEvent.type) {
        key += "|" + fhcEvent.value;
    }
    return key;
}


function doDatabaseTests() {
    //  doDatabaseAddTest();
    doReadAllTest();
    // doDatabaseUpdateTest();
    // clearTextFieldsStore();
    // doReadAllTest();
}

function doDatabaseAddTest() {
    console.log("Attempt inserts...");

    // Formhistory test data
    const formHistData = [
        { name: "testfld1", value: "hello", type: "textarea", first: 1364453733248, last: 1487678983265, used:  1, host: "test.net",  uri: "http://test.net/page/one",  pagetitle: "Hello", fieldkey: "key1"},
        { name: "testfld2", value: "world", type: "input",    first: 1364453733248, last: 1487678983265, used:  2, host: "test.net",  uri: "http://test.net/page/two",  pagetitle: "World!", fieldkey: "key2"},
        { name: "testfld3", value: "foo",   type: "html",     first: 1364453733248, last: 1487678983265, used: 20, host: "dummy.org", uri: "http://dummy.org/page/one", pagetitle: "My Homepage", fieldkey: "key3"},
        { name: "testfld4", value: "bar",   type: "div",      first: 1364453733248, last: 1487678983265, used: 10, host: "dummy.org", uri: "http://dummy.org/page/two", pagetitle: "Some interesting page", fieldkey: "key4"},
        { name: "testfld4", value: "bar",   type: "iframe",   first: 1364453733248, last: 1487678983265, used:  5, host: "dummy.org", uri: "http://dummy.org/page/two", pagetitle: "Yeah", fieldkey: "key5"}
    ];

    // var transaction = db.transaction([DB_STORE_TEXT], "readwrite");
    // transaction.oncomplete = function(event) {
    //     console.log("Transaction complete.");
    //
    //     doReadAllTest();
    // };
    // transaction.onerror = function(event) {
    //     console.log("Insert error: " + event.target.errorCode);
    // };

    var objStore = getObjectStore(DB_STORE_TEXT, "readwrite");
    for (var i in formHistData) {
        var req = objStore.add(formHistData[i]);
        req.onsuccess = function(event) {
            console.log("Insert okay, id: " + event.target.result);
        };
    }
}

function doReadAllTest() {
    console.log("Attempt reading all...");

    var objectStore = getObjectStore(DB_STORE_TEXT, 'readonly');
    var req;

    req = objectStore.count();
    req.onsuccess = function(evt) {
        console.log("There are " + evt.target.result + " record(s) in the object store.");
    };
    req.onerror = function(evt) {
        console.error("add error", this.error);
    };

    req = objectStore.openCursor();
    req.onsuccess = function(evt) {
        var cursor = evt.target.result;
        if (cursor) {
            // req = objectStore.get(cursor.key);
            // req.onsuccess = function (evt) {
            //     var value = evt.target.result;
            //     console.log("Entry [" + cursor.key + "] name: " + cursor.value.name);
            // };
            var fhcEntry = cursor.value;
            console.log("Entry [" + cursor.key + "] name:[" + fhcEntry.name + "] value:[" + fhcEntry.value + "] used:[" + fhcEntry.used + "] host:" + fhcEntry.host + "] type:[" + fhcEntry.type +
                "} KEY=[" + fhcEntry.fieldkey + "] first:[" + fhcEntry.first + "] last:[" + fhcEntry.last + "]");
            cursor.continue();
        }
        else {
            console.log("No more entries!");
        }
    };
}

function doDatabaseUpdateTest() {
    console.log("Attempt update...");

    var objStore = getObjectStore(DB_STORE_TEXT, "readwrite");

    var request = objStore.index("by_fieldkey").get("key1");
    request.onerror = function(event) {
        console.log("Update, get by index failed!");
    };
    request.onsuccess = function(event) {
        // Get the old value that we want to update
        var data = event.target.result;

        if (data) {
            console.log("Found existing record");

            // update the value(s) in the object that you want to change
            data.value = "value changed!";

            // Put this updated object back into the database.
            var requestUpdate = objStore.put(data);
            requestUpdate.onerror = function(event) {
                console.error("update error", this.error);
            };
            requestUpdate.onsuccess = function(event) {
                console.log("Update succeeded.");
            };
        }
        else {
            console.log("Did NOT find an existing record!");
        }
    };
}


initDatabase();