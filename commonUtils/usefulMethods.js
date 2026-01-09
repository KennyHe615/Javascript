const calculateEnumMaxLengthWithString = str => {
   const strings = str.split(",");

   let max = 0;
   for (const str of strings) {
      max = Math.max(max, str.length);
   }

   return max;
};

const calculateEnumMaxLengthWithArray = arr => {
   let max = 0;
   for (const str of arr) {
      max = Math.max(max, str.length);
   }

   return max;
};

// Thread sleep
// import { setTimeout, setImmediate, setInterval } from "timers/promises";
// await setTimeout(2000);

// Required parameter
const isRequiredParam = (columnName) => {
   throw new Error(`Param is required for ${columnName}`);
};

const validateDate = (sourceData, primaryKeyNote = isRequiredParam("primaryKeyNote")) => {
};