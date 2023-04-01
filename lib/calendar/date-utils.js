/*
 *  search
 *
 * Handles searchbar search ui.
 */

/// Gestational calculator.
/*
 *  Main functionality is a date picker. Once you have the date
 *  you report various options.
 */

import moment from 'moment';

function dayRangeFromNow(days) {
  const now = moment();
  const today = momentAsDay(now);
  const range = moment(today).add(days, "days");

  return [today, range];
}

// take a date, and make it represent a given day (i.e. 0hrs etc.)
function momentAsDay(date) {
  var m = moment(date);
  m.hour(0);
  m.minute(0);
  m.second(0);
  m.millisecond(0);

  return m;
}

// How may days from an earlierDate to now?
// Returns a whole number
function daysToToday(earlierDate) {
  var then = momentAsDay(earlierDate);
  var now = momentAsDay(moment());

  return now.diff(then, 'days');
}


export {
  momentAsDay,
  daysToToday,
  dayRangeFromNow
}