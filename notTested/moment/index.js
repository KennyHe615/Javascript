//npm i moment
import moment from "moment";


const dateStr = "2022-01-01";
const datetimeStr = "2022-01-01T00:00:00.000Z";

//read a timestamp with a particular known format
moment(dateStr, "YYYY-MM-DD");

//strict mode
moment(dateStr, "YYYY-MM-DD", true);

//hard copy a moment
moment(dateStr).clone();

//format the moment, add string "Z" as sample
moment(dateStr).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");

//convert UTC to Local
moment.utc(datetimeStr).local();

//convert Local to UTC
moment(datetimeStr).utc();

//is timestamp valid
moment(dateStr).isValid();

//AM/PM format
moment.utc(datetimeStr, "MM/DD/YYYY HH:mm a");

// timezone conversion "2023-05-01 10:01:43.000 -04:00"
moment(datetimeStr, "YYYY-MM-DD HH:mm:ss.SSS Z", true);