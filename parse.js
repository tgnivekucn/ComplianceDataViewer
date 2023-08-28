class Compliance {
    constructor() {
        this.start = new Date();
        this.end = new Date();
        this.treatment = 0;
        this.leakage = 0;
        this.timezone = 0;
        this.sleepnote = '';
        this.rest_rating = '';
        this.remedies = '';
    }

    dateTimeToString(date) {
        if (!date) {
            return '';
        }
        return this.dateToString('yyyy-MM-dd HH:mm:ss', date);
    }

    dateToString(format, date) {
        let options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        return new Intl.DateTimeFormat('en-US', options).format(date);
    }

    toString() {
        let s = this.dateTimeToString(this.start);
        let e = this.dateTimeToString(this.end);
        return `Start: ${s}, End: ${e}, Treatment: ${this.treatment}, Leakage: ${this.leakage}, TimeZone: ${this.timezone}, SleepNote: ${this.sleepnote}, Rest Rating: ${this.rest_rating}, Remedies: ${this.remedies}`;
    }
}

function makeType1ComplianceRecord(bytesArr) {
    let bytes = new Uint8Array(bytesArr);
    if (bytes.length !== 16) {
        return null;
    }
    let record = new Compliance();
    record.start = toGmtDate(2000 + bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], 0);
    record.end = toGmtDate(2000 + bytes[5], bytes[6], bytes[7], bytes[8], bytes[9], 0);

    const total = (BigInt(bytes[10]) << 32n) | (BigInt(bytes[11]) << 24n) | (BigInt(bytes[12]) << 16n) | (BigInt(bytes[13]) << 8n) | BigInt(bytes[14]);
    const leakage = Number(total & 0x0fffffn);
    const treatment = Number(total >> 20n);
    record.treatment = treatment;
    record.leakage = leakage;

    let timeZone = bytes[15] & 0x0F;
    if (isSet(bytes[15], 4)) {
        record.timezone = -1 * timeZone;
    } else {
        record.timezone = timeZone;
    }
    return record;
}

function makeType2ComplianceRecord(bytesArr) {
    let bytes = new Uint8Array(bytesArr);
    if (bytes.length !== 16) {
        return null;
    }
    let record = new Compliance();

    let startMonth = bytes[3] % 12;
    if (startMonth == 0) {
        startMonth = 12;
    }

    let endMonth = bytes[8] % 12;
    if (endMonth == 0) {
        endMonth = 12;
    }

    // Assuming toGmtDate creates a Date object using provided parameters
    record.start = toGmtDate(2000 + bytes[4], startMonth, bytes[2], bytes[1], bytes[0], 0);
    record.end = toGmtDate(2000 + bytes[9], endMonth, bytes[7], bytes[6], bytes[5], 0);
    record.treatment = toUint16([bytes[10], bytes[11]], true);
    record.leakage = toUint16([bytes[12], bytes[13]], true);
    let timeZone = toUint16([bytes[14], bytes[15]], true);

    if (timeZone >= 60) {
        record.timezone = timeZone / 60;
    } else if (timeZone <= -60) {
        record.timezone = timeZone / 60;
    } else {
        record.timezone = timeZone;
    }
    return record;
}

function isSet(value, bit) {
    return (value & (1 << bit)) !== 0;
}

function toGmtDate(year, month, date, hour, minute, second) {
    // let str = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}.000Z`;
    let str = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}.000+08:00`;
    let dateObj = new Date(str);
    if (isNaN(dateObj.getTime())) {
        return null;
    } else {
        return dateObj;
    }
}

function base64ToArrayBuffer(base64) {
    var binaryString = decodeBase64(base64);
    var binaryLen = binaryString.length;
    var bytes = new Uint8Array(binaryLen);
    for (var i = 0; i < binaryLen; i++) {
        var ascii = binaryString.charCodeAt(i);
        bytes[i] = ascii;
    }
    return bytes.buffer;
}

function decodeBase64(base64) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var bufferLength = base64.length * 0.75;
    var p = 0, encoded1, encoded2, encoded3, encoded4;

    if (base64[base64.length - 1] === '=') {
        bufferLength--;
        if (base64[base64.length - 2] === '=') {
            bufferLength--;
        }
    }

    var decoded = '';

    for (var i = 0; i < base64.length; i += 4) {
        encoded1 = chars.indexOf(base64[i]);
        encoded2 = chars.indexOf(base64[i + 1]);
        encoded3 = chars.indexOf(base64[i + 2]);
        encoded4 = chars.indexOf(base64[i + 3]);

        var triplet = (encoded1 << 18) + (encoded2 << 12) + (encoded3 << 6) + (encoded4);
        if (base64[i + 2] === '=') {
            decoded += String.fromCharCode((triplet >> 16) & 0xFF);
        } else if (base64[i + 3] === '=') {
            decoded += String.fromCharCode((triplet >> 16) & 0xFF, (triplet >> 8) & 0xFF);
        } else {
            decoded += String.fromCharCode((triplet >> 16) & 0xFF, (triplet >> 8) & 0xFF, (triplet) & 0xFF);
        }
    }

    return decoded;
}

function toUint16(bytes, littleEndian) {
    if (bytes.length < 2) {
        return 0;
    }
    return toUint16(bytes[0], bytes[1], littleEndian);
}

function toUint16(byte0, byte1, littleEndian) {
    if (littleEndian) {
        return (byte1 << 8) | byte0;
    } else {
        return (byte0 << 8) | byte1;
    }
}

function testActionWithBase64Input(timezone, base64StringArrInput, isNeedToReverse) {
    console.log("base64StringArrInput is:" + base64StringArrInput);
    if (base64StringArrInput.length <= 0) {
        return [];
    }
    let newString = base64StringArrInput.replace(/\\"/g, '"');

    newString = newString.replace('\"', '');
    newString = newString.replace(/.$/, '');
    console.log("newString is:" + newString);

    let base64StringArr = newString.split('\",\"');
    if (isNeedToReverse == true) {
        base64StringArr.reverse();
    }

    let arr = [];
    let timeZoneString = timezone;
    for (let item of base64StringArr) {
        let resultBytes = base64ToArrayBuffer(item);
        let record = makeType1ComplianceRecord(resultBytes);
        if (record != null) {
            let startTime = record["start"];
            let endTime = record["end"];
            let treatmentVal = record["treatment"];
            let leakageVal = record["leakage"];
            // Convert the adjusted Date object to a timestamp (in seconds)
            let timestampOfDat1 = 0;
            if (startTime != null && startTime.getTime() != null) {
                timestampOfDat1 = Math.floor(startTime.getTime() / 1000);
            }
            let timestampOfDat2 = 0;
            if (endTime != null && endTime.getTime() != null) {
                timestampOfDat2 = Math.floor(endTime.getTime() / 1000);
            }
            console.log("timestampOfDat 1 & 2");
            console.log(timestampOfDat1);
            console.log(timestampOfDat2);

            let options = { timeZone: 'Etc/GMT' };
            if (timeZoneString != null) {
                options = { timeZone: timeZoneString };
            }

            const millisecondsOfDate1 = timestampOfDat1 * 1000;
            const millisecondsOfDate2 = timestampOfDat2 * 1000;

            const date1Object = new Date(millisecondsOfDate1);
            const date2Object = new Date(millisecondsOfDate2);

            let startTimeString = date1Object?.toLocaleString('en-US', options);
            let endTimeString = date2Object?.toLocaleString('en-US', options);

            console.log("Start print info: ");
            console.log(startTime);
            console.log(endTime);
            console.log(treatmentVal);
            console.log(leakageVal);

            console.log("End print info: ");
            if (startTime == null || startTime.getTime() == null) {
                startTimeString = "";
            }
            if (endTime == null || endTime.getTime() == null) {
                endTimeString = "";
            }
            // Create the object
            const obj = { startTimeString, endTimeString, treatmentVal, leakageVal, item };

            // Add the object to the array
            arr.push(obj);
        } else {
            // Create the object
            let startTimeString = "Record NULL";
            let endTimeString = "Record NULL";
            let treatmentVal = 0;
            let leakageVal = 0;
            const obj = { startTimeString, endTimeString, treatmentVal, leakageVal, item };
            arr.push(obj);
        }
    }
    return arr;
}

function getTotalDataCount(base64StringArrInput) {
    if (base64StringArrInput.length <= 0) {
        return 0;
    }
    let newString = base64StringArrInput.replace('\"', '');
    newString = newString.replace(/.$/, '');
    let base64StringArr = newString.split('\",\"');
    return base64StringArr.length;
}