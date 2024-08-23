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

import { Dom7, Template7 } from "framework7/framework7.esm.bundle.js";
import { resources, appConfig } from "hesperian-mobile";
import { attachDateSelector } from "./calendar-dropdown";
import "./calendar.scss";
import MessageFormat from "messageformat";
import { dayRangeFromNow, daysToToday, formatDate } from "./date-utils";

let $$ = Dom7;

let lastChosenDate = null;

function goToResultsPage(date) {
  const numDays = daysToToday(date);
  const router = window.app.views.main.router;

  lastChosenDate = date;

  router.navigate({
    name: "calculator",
    params: {
      numDays: numDays,
    },
  });
}

// Page formater utility class - a wraper for putting
// ICU message templates in the content of a page element,
// and then formatting it on page load.

// Formatters based on DOM element by id
// The DOM element starts with the ICU message formatter
// Initialize with formatters = { 'DomId: {}, ...}
function PageContentFormatter(formatters) {
  this.mf = new MessageFormat();
  this.formatters = formatters;
}

// prepare. Call before calling format().
// Extracts and remembers the template
// Safe to call multiple times.
PageContentFormatter.prototype.prepare = function () {
  var k;
  var formatters = this.formatters;
  for (k in formatters) {
    if (!formatters[k].fn) {
      formatters[k].fn = this.mf.compile($$("#" + k).text());
    }
  }
};

// Fill the dom content based on the template
PageContentFormatter.prototype.format = function (id, args) {
  var txt = this.formatters[id].fn(args);
  $$("#" + id).text(txt);
};

// Instance of PageContentFormatter for gestational calculator
var mf = new PageContentFormatter({
  "results-list-title": {},
});

// Using live 'page:init' event handlers for each page
function initDatePicker(page) {
  // Do something here when page with data-name="about" attribute loaded and initialized
  //alert("processing gestcalc page init");
  const [today, tooLongAgo] = dayRangeFromNow(-316); // more than 45 weeks
  var myCalendar;

  const calculatorResources = resources.get("calculator");

  // Custom month selector to have "month year". We hide the year selector.
  function renderMonthSelector() {
    const calendar = this;
    const app = calendar.app;

    let needsBlackIcon;
    if (
      calendar.inline &&
      calendar.$containerEl.closest(".theme-dark").length === 0
    ) {
      needsBlackIcon = true;
    } else if (app.root.closest(".theme-dark").length === 0) {
      needsBlackIcon = true;
    }

    const iconColor = app.theme === "md" && needsBlackIcon ? "color-black" : "";
    const previousMonth = calculatorResources.previousMonth;
    const nextMonth = calculatorResources.nextMonth;
    return `
  <div class="calendar-month-selector">
  <a href="#" class="link icon-only calendar-prev-month-button" role="button" aria-label="${previousMonth}">
    <i class="icon icon-prev ${iconColor}"></i>
  </a>
  <div><span class="current-month-value"></span>&nbsp;<span class="current-year-value"></span></div>
  <a href="#" class="link icon-only calendar-next-month-button" role="button" aria-label="${nextMonth}">
    <i class="icon icon-next ${iconColor}"></i>
  </a>
  </div>
`.trim();
  }

  const calendarEl = $$(".gestcalc-container", page.el);

  function initCalendar() {
    myCalendar = window.app.calendar.create({
      containerEl: calendarEl,
      dateFormat: "DD, MM dd",
      footer: false,
      maxDate: today,
      minDate: tooLongAgo,
      yearSelector: false,
      monthNames: calculatorResources.monthNames,
      monthNamesShort: calculatorResources.monthNamesShort,
      dayNames: calculatorResources.dayNames,
      dayNamesShort: calculatorResources.dayNamesShort,
      renderMonthSelector: renderMonthSelector,
      on: {
        change: function (p, value) {
          const chosenDay = value[0];
          goToResultsPage(chosenDay);
        },
      },
    });

    if (appConfig.feature("DateSelector")) {
      attachDateSelector(page, {
        today: today,
        tooLongAgo: tooLongAgo,
        calculatorResources: calculatorResources,
        goToResultsPage: goToResultsPage,
      });
    }
  }
  // calendarType: the type of calendar: gregorian, amharic..
  // language: localization for the calendar
  // localNumbers : boolean for whether to use localized characters for date numbers where available
  // http://keith-wood.name/calendarsPickerRef.html#
  function initJqueryCalendar(calendarType, language, localNumbers) {
    jQuery(function ($) {
      var calendar = $.calendars.instance(calendarType, language);
      $(".gestcalc-container").calendarsPicker({
        calendar: calendar,
        // The renderer determines the HTML structure of the date picker
        renderer: $.calendarsPicker.hesperianRenderer,
        // Set up the HTML structure for next and previous month buttons since we cannot do this via the renderer.
        prevText: '<i class="icon icon-prev color-black"></i>',
        nextText: '<i class="icon icon-next color-black"></i>',
        onSelect: showDate,
        // Classes for the picker, includes calendar and locale specific classes.
        // Example: calendar-jq-type-ethiopian jq-calendar-locale-am
        pickerClass:
          "calendar-jq calendar calendar-jq-type-" +
          calendarType +
          " jq-calendar-locale-" +
          language,
        // Set to true to allow the month and year to be changed via a drop-down selection on the first month shown in the datepicker. Set to false to only allow changes via the various previous and next commands.
        changeMonth: false,
        // Specify the maximum date allowed to be selected. This may be specified as an actual date (CDate), as a date string in the current dateFormat, as a number of days relative to today, or as a string of offsets and periods relative to today. For the last use 'y' for years, 'm' for months, 'w' for weeks, or 'd' for days. Multiple offsets may be combined in the one string.
        maxDate: "+0m",
        // Set to true to always have six weeks shown
        fixedWeeks: true,
        // Set to true to show the days in other months that appear in the partial weeks before or after the current month.
        showOtherMonths: true,
        // Set to true to allow the days in other months that appear in the partial weeks before or after the current month to be selected. This setting only applies if showOtherMonths is true.
        selectOtherMonths: true,
        //	Set to true to use localised characters for date numbers (where available - see the Calendar digits setting), or false to always use standard Arabic numerals.
        localNumbers: localNumbers,
      });
    });

    function showDate(date) {
      var gregorianDate = jQuery.calendars
        .instance("gregorian")
        .fromJD(date[0].toJD());
      //calendarOnChange(null,[gregorianDate.toJSDate()]);
      goToResultsPage(gregorianDate.toJSDate());
    }
  }

  switch (appConfig.locale()) {
    case "am":
      //change last argument to false to not use geez numerals
      initJqueryCalendar("ethiopian", "am", false);
      break;
    default:
      initCalendar();
  }
}

function initResults(page) {
  const diffDays = parseInt(page.route.params.numDays);
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays - 7 * weeks;

  const messageFormater = new MessageFormat();
  const calculatorResources = resources.get("calculator");

  function updateDateResult(name, res, conf) {
    if (!res[name]) {
      return;
    }
    const formatter = messageFormater.compile(res[name]);
    const text = formatter(conf);
    $$(`.${name}`, page.el).text(text);
  }

  const resultstitleFormater = messageFormater.compile(
    calculatorResources.resultstitle
  );

  const $results = $$(".results-display", page.el);
  const resultsDom = $results[0];
  let optionsCount;

  // Extract numeric data attribute.
  // returns undefined if not present or empty
  function getDataNumber(elem, dataName) {
    var data = elem.data(dataName);
    var num;
    if (data && data.length) {
      num = Number(data);
    }
    return num;
  }

  // For elements with data-min-days and data-max-days attributes
  // set/unset the .available class if days falls within the range
  // return number of elements that were set .active
  function updateDateRangeElements(elements, days) {
    var i;
    var elem, min, max;
    var count = 0;

    for (i = 0; i < elements.length; i++) {
      elem = $$(elements[i]);
      min = getDataNumber(elem, "min-days");
      max = getDataNumber(elem, "max-days");

      if (
        (min === undefined || min <= days) &&
        (max === undefined || max >= days)
      ) {
        count++;
        elem.addClass("available");
      } else {
        elem.removeClass("available");
      }
    }
    return count;
  }

  const dueDateDays = 279 - diffDays;

  const dueDate =
    dueDateDays > 0 ? formatDate(appConfig.locale(), dueDateDays) : "";

  const override =
    calculatorResources.timepregnantOverrides &&
    calculatorResources.timepregnantOverrides[diffDays];

  const dateConfig = {
    WEEKS: weeks,
    DAYS: days,
    DUEDATE: dueDate,
  };

  if (override) {
    $$("#timepregnant", page.el).text(override);
  } else {
    updateDateResult("timepregnant", calculatorResources, dateConfig);
  }

  updateDateResult("timeperiod", calculatorResources, dateConfig);
  updateDateResult("duedate", calculatorResources, dateConfig);

  $results.addClass("have-how-long");

  updateDateRangeElements($$(".date-range-message", resultsDom), diffDays);
  optionsCount = $$("#results-list > li.available", resultsDom).length;

  if (optionsCount > 0) {
    $results.addClass("have-options");
  }

  const rt = resultstitleFormater({
    NUMRESULTS: optionsCount,
  });

  $$("#results-list-title", resultsDom).text(rt);
}

$$(document).on(
  "page:beforein",
  '.page[data-page="gestcalc"]',
  function (e, page) {
    if (page.route.params.numDays) {
      page.$el.addClass("gestcalc-results");
    } else {
      page.$el.removeClass("gestcalc-results");
    }
    if (lastChosenDate) {
      const $calendar = page.$el.find(".gestcalc-container calendar");
      const calendar = window.app.calendar.get($calendar[0]);
      if (calendar) {
        calendar.value = [lastChosenDate];
        calendar.updateValue(true);
      }
    }
  }
);

$$(document).on("page:init", '.page[data-page="gestcalc"]', function (e, page) {
  if (page.route.params.numDays) {
    initResults(page);
  } else {
    initDatePicker(page);
  }
});
