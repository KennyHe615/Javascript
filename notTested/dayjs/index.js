import dayjs from 'dayjs';

const str1 = dayjs().format('YYYY-MM-DD HH:mm:ss');
console.log('str1: ', str1);

import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(customParseFormat);
const obj1 = dayjs('12-25-1995', 'MM-DD-YYYY');
console.log('obj1: ', obj1);

import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
// default local time
const str2 = dayjs().format();
console.log('str2: ', str2);
// UTC mode
const str3 = dayjs.utc().format();
console.log('str3: ', str3);
// convert local time to UTC time
const str4 = dayjs().utc().format();
console.log('str4: ', str4);

const obj2 = dayjs().local();
console.log('obj2:', obj2);
