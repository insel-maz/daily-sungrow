/**
 * 1. Install Node.js (the script is written for Node version 22).
 * 2. Copy the GoSungrow executable into this directory.
 * 3. Create the configuration files.
 * 3.1. Copy `config/config.sample.json` to `config/config.json`. To find out your IDs/keys run `./GoSungrow show ps list`.
 * 3.2. Copy `config/nextdate.sample.txt` to `config/nextdate.txt`. Set a recent date.
 * 4. Localize the script, if needed. See CSV_HEADERS.
 * 5. Start this script with: node index.mjs
 */

import child_process from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CSV_HEADERS = 'Zeit,PV-Ertrag(W),Netz(W),Batterie(W),Gesamtverbrauch(W),Batterieladung(%)';

const exitCode = await main();
process.exit(exitCode);

async function main() {
    const config = loadConfig();

    if (!fs.existsSync(config.downloadDir)) {
        console.error('Download directory "%s" does not exist.');
        return 1;
    }

    const todayString = formatDate(new Date());
    console.info('Today is "%s".', todayString);
    let date = loadNextDate();
    for (; ; ) {
        let dateString = formatDate(date);
        if (dateString >= todayString) {
            break;
        }

        console.info('Retrieving data for "%s".', dateString);
        const now = new Date();
        const outputCsvFilePath = path.join(config.downloadDir, config.fileNamePrefix + formatDate(now, '') + formatTime(now, '') + '.csv');
        loadDailyData(config, date, outputCsvFilePath);

        date.setDate(date.getDate() + 1);
        saveNextDate(date);

        // Wait 1 second, so the file name gets a unique time component.
        await sleep(1000);
    }

    return 0;
}

/**
 * @returns {{psId: string; psKey: string; downloadDir: string; fileNamePrefix: string;}}
 */
function loadConfig() {
    const configJson = fs.readFileSync('config/config.json', {encoding: 'utf8'});
    return JSON.parse(configJson);
}

/**
 * Loads the date in YYYY-MM-DD format, for which data should get requested.
 */
function loadNextDate() {
    const dateString = fs.readFileSync('config/nextdate.txt', {encoding: 'utf8'});
    return new Date(dateString.trim());
}

/**
 * Saves the date in YYYY-MM-DD format, for which data should get requested next.
 * @param {Date} date
 */
function saveNextDate(date) {
    const dateString = formatDate(date, '-');
    fs.writeFileSync('config/nextdate.txt', dateString, {encoding: 'utf8'});
}

/**
 * @param {Date} date
 * @param {string|undefined} separator
 */
function formatDate(date, separator = '-') {
    const month = date.getMonth() + 1;
    const dayOfMonth = date.getDate();
    return ''
        + date.getFullYear()
        + separator
        + (month < 10 ? '0' : '') + month
        + separator
        + (dayOfMonth < 10 ? '0' : '') + dayOfMonth;
}

/**
 * @param {Date} date
 * @param {string|undefined} separator
 */
function formatTime(date, separator = ':') {
    return ''
        + (date.getHours() < 10 ? '0' : '') + date.getHours()
        + separator
        + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()
        + separator
        + (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
}

/**
 * @param {number} ms
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads the 5-minute data for one day and saves it as CSV data.
 * @param {{psId: string; psKey: string;}} config
 * @param {Date} date
 * @param {string} outputCsvFilePath Path to the CSV file in which the 1 + 288 lines are to be written.
 */
function loadDailyData(config, date, outputCsvFilePath) {
    // ./GoSungrow api get WebAppService.getDevicePointAttrs '{"psId":"1234567","deviceType":"14"}'
    const points = [
        'p13003', // Total DC Power
        'p13011', // Active Power
        'p13119', // Load Power
        'p13149', // Purchased Power
        'p13121', // Feed-in Power
        'p13126', // Battery Charging Power
        'p13150', // Battery Discharging Power
        'p13141', // Battery Level (SOC)
    ];

    const yyyymmdd = formatDate(date, '');
    const request = {
        ps_id: config.psId,
        start_time_stamp: yyyymmdd + '000000',
        end_time_stamp: yyyymmdd + '235500',
        minute_interval: 5,
        ps_key: Array(points.length).fill(config.psKey).join(','),
        points: points.join(','),
    };
    const requestJson = JSON.stringify(request);
    const responseJson = child_process.execFileSync(
        './GoSungrow',
        ['api', 'get', 'AppService.queryMutiPointDataList', requestJson], 
        {encoding: 'utf8'}
    );
    /** @type {{data: {[key: string]: {timestamp: string; ps_key: string; points: {[point: string]: number;}}}}} */
    const response = JSON.parse(responseJson);

    const eol = '\r\n'; // Windows line ending

    let csv = CSV_HEADERS + eol;
    for (const item of Object.values(response.data)) {
        const timestamp = item.timestamp;
        // Transform '19991231235500' to '1999-12-31 23:55:00'.
        const csvDateTime = timestamp.substring(0, 4)
            + '-' + timestamp.substring(4, 6)
            + '-' + timestamp.substring(6, 8)
            + ' ' + timestamp.substring(8, 10)
            + ':' + timestamp.substring(10, 12)
            + ':' + timestamp.substring(12, 14);
        const points = item.points;
        csv += csvDateTime
            + ',' + points.p13003
            + ',' + (points.p13149 - points.p13121)
            + ',' + (points.p13150 - points.p13126)
            + ',' + points.p13119
            + ',' + points.p13141
            + eol;
    }
    fs.writeFileSync(outputCsvFilePath, '\ufeff' + csv, {encoding: 'utf8'});
}
