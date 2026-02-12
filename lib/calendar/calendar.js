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

import { Dom7 } from "framework7/bundle";
import Template7 from "template7";
import { resources, appConfig } from "hesperian-mobile";
import { getApp } from "../app";
import { attachDateSelector } from "./calendar-dropdown";
import "./calendar.scss";
import MessageFormat from "messageformat";
import { dayRangeFromNow, daysToToday, formatDate } from "./date-utils";

let $$ = Dom7;

let lastChosenDate = null;

/**
 * Initialize keyboard accessibility for Framework7 calendar
 * Implements WAI-ARIA grid pattern with roving tabindex
 */
function initCalendarKeyboardNav(calendar, calculatorResources) {
  const $el = calendar.$el;
  if (!$el || !$el.length) return;

  const monthNames = calculatorResources.monthNames;

  // Get the current month's calendar element
  function getCurrentMonthEl() {
    return $el.find(".calendar-month-current")[0];
  }

  // Get all selectable (non-disabled) days in the current month view
  function getSelectableDays() {
    const currentMonth = getCurrentMonthEl();
    if (!currentMonth) return [];
    return Array.from(
      currentMonth.querySelectorAll(
        ".calendar-day:not(.calendar-day-disabled):not(.calendar-day-prev):not(.calendar-day-next)"
      )
    );
  }

  // Get all days (including prev/next month) for arrow navigation
  function getAllVisibleDays() {
    const currentMonth = getCurrentMonthEl();
    if (!currentMonth) return [];
    return Array.from(
      currentMonth.querySelectorAll(".calendar-day:not(.calendar-day-disabled)")
    );
  }

  // Format date for aria-label (e.g., "January 15, 2026")
  function formatDateLabel(dayEl) {
    const year = dayEl.getAttribute("data-year");
    const month = parseInt(dayEl.getAttribute("data-month"), 10);
    const day = dayEl.getAttribute("data-day");
    const monthName = monthNames[month] || "";
    return `${monthName} ${day}, ${year}`;
  }

  // Set up ARIA attributes on a day element
  function setupDayAria(dayEl, isTabTarget) {
    dayEl.setAttribute("role", "gridcell");
    dayEl.setAttribute("tabindex", isTabTarget ? "0" : "-1");
    dayEl.setAttribute("aria-label", formatDateLabel(dayEl));

    if (dayEl.classList.contains("calendar-day-selected")) {
      dayEl.setAttribute("aria-selected", "true");
    } else {
      dayEl.removeAttribute("aria-selected");
    }
  }

  // Initialize ARIA structure for the calendar
  function initAriaStructure() {
    // Add grid role to the calendar months wrapper
    const wrapper = $el.find(".calendar-months-wrapper")[0];
    if (wrapper) {
      wrapper.setAttribute("role", "application");
    }

    // Set up each visible month (prev, current, next)
    $el.find(".calendar-month").each(function () {
      const monthEl = this;
      const isCurrentMonth = monthEl.classList.contains("calendar-month-current");
      monthEl.setAttribute("role", "grid");

      // Hide non-current months from assistive technology
      if (!isCurrentMonth) {
        monthEl.setAttribute("aria-hidden", "true");
      } else {
        monthEl.removeAttribute("aria-hidden");
      }

      // Add row roles and gridcell roles to all days
      $$(monthEl)
        .find(".calendar-row")
        .each(function () {
          this.setAttribute("role", "row");

          // Set gridcell role on all day cells in this row
          $$(this)
            .find(".calendar-day")
            .each(function () {
              this.setAttribute("role", "gridcell");
              // Non-current months get tabindex -1
              if (!isCurrentMonth) {
                this.setAttribute("tabindex", "-1");
              }
            });
        });
    });

    // Set up day cells in current month with roving tabindex and aria-labels
    const selectableDays = getSelectableDays();
    const today = $el.find(
      ".calendar-month-current .calendar-day-today:not(.calendar-day-disabled)"
    )[0];
    const firstSelectable = selectableDays[0];
    const tabTarget = today || firstSelectable;

    selectableDays.forEach((day) => {
      setupDayAria(day, day === tabTarget);
    });

    // Also set up prev/next month days in current month view (but not as tab targets)
    $el
      .find(
        ".calendar-month-current .calendar-day-prev, .calendar-month-current .calendar-day-next"
      )
      .each(function () {
        if (!this.classList.contains("calendar-day-disabled")) {
          setupDayAria(this, false);
        }
      });

    // Set up disabled days with aria-disabled
    $el.find(".calendar-month-current .calendar-day-disabled").each(function () {
      this.setAttribute("aria-disabled", "true");
      this.setAttribute("tabindex", "-1");
    });
  }

  // Move focus to a specific day element
  function focusDay(dayEl) {
    if (!dayEl) return;

    // Update tabindex: remove from all, add to target
    $el.find(".calendar-day[tabindex='0']").attr("tabindex", "-1");
    dayEl.setAttribute("tabindex", "0");
    dayEl.focus();
  }

  // Find the day element for a specific date
  function findDayByDate(year, month, day) {
    return $el.find(
      `.calendar-month-current .calendar-day[data-year="${year}"][data-month="${month}"][data-day="${day}"]:not(.calendar-day-disabled)`
    )[0];
  }

  // Navigate to adjacent day (direction: -1 for prev, 1 for next)
  function navigateDay(currentDay, direction) {
    const allDays = getAllVisibleDays();
    const currentIndex = allDays.indexOf(currentDay);
    if (currentIndex === -1) return;

    let newIndex = currentIndex + direction;

    // Handle month boundary
    if (newIndex < 0) {
      // Moving to previous month
      const year = parseInt(currentDay.getAttribute("data-year"), 10);
      const month = parseInt(currentDay.getAttribute("data-month"), 10);
      const day = parseInt(currentDay.getAttribute("data-day"), 10);

      calendar.prevMonth();

      // After month change, try to focus equivalent position
      setTimeout(() => {
        initAriaStructure();
        const targetDay =
          findDayByDate(year, month, day) ||
          getSelectableDays().slice(-1)[0];
        if (targetDay) focusDay(targetDay);
      }, 350); // Wait for animation
      return;
    }

    if (newIndex >= allDays.length) {
      // Moving to next month
      const year = parseInt(currentDay.getAttribute("data-year"), 10);
      const month = parseInt(currentDay.getAttribute("data-month"), 10);
      const day = parseInt(currentDay.getAttribute("data-day"), 10);

      calendar.nextMonth();

      setTimeout(() => {
        initAriaStructure();
        const targetDay =
          findDayByDate(year, month, day) || getSelectableDays()[0];
        if (targetDay) focusDay(targetDay);
      }, 350);
      return;
    }

    focusDay(allDays[newIndex]);
  }

  // Navigate up/down by a week (7 days)
  function navigateWeek(currentDay, direction) {
    const allDays = getAllVisibleDays();
    const currentIndex = allDays.indexOf(currentDay);
    if (currentIndex === -1) return;

    const newIndex = currentIndex + direction * 7;

    if (newIndex < 0) {
      // Need to go to previous month
      const year = parseInt(currentDay.getAttribute("data-year"), 10);
      const month = parseInt(currentDay.getAttribute("data-month"), 10);
      const day = parseInt(currentDay.getAttribute("data-day"), 10);

      // Calculate target date (7 days earlier)
      const targetDate = new Date(year, month, day - 7);

      calendar.prevMonth();

      setTimeout(() => {
        initAriaStructure();
        const targetDay =
          findDayByDate(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate()
          ) || getSelectableDays().slice(-1)[0];
        if (targetDay) focusDay(targetDay);
      }, 350);
      return;
    }

    if (newIndex >= allDays.length) {
      // Need to go to next month
      const year = parseInt(currentDay.getAttribute("data-year"), 10);
      const month = parseInt(currentDay.getAttribute("data-month"), 10);
      const day = parseInt(currentDay.getAttribute("data-day"), 10);

      // Calculate target date (7 days later)
      const targetDate = new Date(year, month, day + 7);

      calendar.nextMonth();

      setTimeout(() => {
        initAriaStructure();
        const targetDay =
          findDayByDate(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate()
          ) || getSelectableDays()[0];
        if (targetDay) focusDay(targetDay);
      }, 350);
      return;
    }

    focusDay(allDays[newIndex]);
  }

  // Select the currently focused day
  function selectDay(dayEl) {
    if (!dayEl || dayEl.classList.contains("calendar-day-disabled")) return;

    const year = parseInt(dayEl.getAttribute("data-year"), 10);
    const month = parseInt(dayEl.getAttribute("data-month"), 10);
    const day = parseInt(dayEl.getAttribute("data-day"), 10);

    // Trigger F7 calendar selection
    const dateValue = new Date(year, month, day);
    calendar.setValue([dateValue]);
  }

  // Keyboard event handler
  function handleKeydown(e) {
    const dayEl = e.target.closest(".calendar-day");
    if (!dayEl) return;

    let handled = false;

    switch (e.key) {
      case "ArrowLeft":
        navigateDay(dayEl, -1);
        handled = true;
        break;

      case "ArrowRight":
        navigateDay(dayEl, 1);
        handled = true;
        break;

      case "ArrowUp":
        navigateWeek(dayEl, -1);
        handled = true;
        break;

      case "ArrowDown":
        navigateWeek(dayEl, 1);
        handled = true;
        break;

      case "Enter":
      case " ":
        selectDay(dayEl);
        handled = true;
        break;

      case "Home":
        // Go to first day of month
        const firstDay = getSelectableDays()[0];
        if (firstDay) focusDay(firstDay);
        handled = true;
        break;

      case "End":
        // Go to last day of month
        const lastDay = getSelectableDays().slice(-1)[0];
        if (lastDay) focusDay(lastDay);
        handled = true;
        break;

      case "PageUp":
        // Previous month
        calendar.prevMonth();
        setTimeout(() => {
          initAriaStructure();
          const days = getSelectableDays();
          if (days.length) focusDay(days[0]);
        }, 350);
        handled = true;
        break;

      case "PageDown":
        // Next month
        calendar.nextMonth();
        setTimeout(() => {
          initAriaStructure();
          const days = getSelectableDays();
          if (days.length) focusDay(days[0]);
        }, 350);
        handled = true;
        break;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Attach keyboard handler to the calendar element
  $el[0].addEventListener("keydown", handleKeydown);

  // Re-initialize ARIA when months change
  calendar.on("monthAdd", function () {
    setTimeout(initAriaStructure, 50);
  });

  // Initial setup
  initAriaStructure();
}

function goToResultsPage(date) {
  const numDays = daysToToday(date);
  const router = getApp().views.main.router;

  lastChosenDate = date;

  // Blur focused element before navigation so the browser doesn't warn
  // about aria-hidden on an ancestor of a focused element when F7
  // transitions the calculator page to page-previous.
  if (document.activeElement) {
    document.activeElement.blur();
  }

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
    const appEl = app.$el || app.root;
    if (
      calendar.inline &&
      calendar.$containerEl.closest(".theme-dark").length === 0
    ) {
      needsBlackIcon = true;
    } else if (appEl && appEl.closest(".theme-dark").length === 0) {
      needsBlackIcon = true;
    }

    const iconColor = app.theme === "md" && needsBlackIcon ? "color-black" : "";
    const previousMonth = calculatorResources.previousMonth;
    const nextMonth = calculatorResources.nextMonth;
    // aria-hidden on icons prevents screen readers from announcing CSS content
    // (e.g., 'chevron_left_md', 'chevron_right_md' from icon font)
    return `
  <div class="calendar-month-selector">
  <a href="#" class="link icon-only calendar-prev-month-button" role="button" aria-label="${previousMonth}">
    <i class="icon icon-prev ${iconColor}" aria-hidden="true"></i>
  </a>
  <div><span class="current-month-value"></span>&nbsp;<span class="current-year-value"></span></div>
  <a href="#" class="link icon-only calendar-next-month-button" role="button" aria-label="${nextMonth}">
    <i class="icon icon-next ${iconColor}" aria-hidden="true"></i>
  </a>
  </div>
`.trim();
  }

  const calendarEl = $$(".gestcalc-container", page.el);

  function initCalendar() {
    myCalendar = getApp().calendar.create({
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

    // Initialize keyboard accessibility for the calendar
    initCalendarKeyboardNav(myCalendar, calculatorResources);

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
        // aria-hidden prevents screen readers from announcing CSS content (e.g., 'chevron_left_md')
        prevText: '<i class="icon icon-prev color-black" aria-hidden="true"></i>',
        nextText: '<i class="icon icon-next color-black" aria-hidden="true"></i>',
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

    if (appConfig.feature("DateSelector")) {
      attachDateSelector(page, {
        today: today,
        tooLongAgo: tooLongAgo,
        calculatorResources: calculatorResources,
        goToResultsPage: goToResultsPage,
      });
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
      const calendar = getApp().calendar.get($calendar[0]);
      if (calendar) {
        calendar.value = [lastChosenDate];
        calendar.updateValue(true);
      }
    }
    getApp().api.pageStructureChanged();
  }
);

$$(document).on("page:init", '.page[data-page="gestcalc"]', function (e, page) {
  if (page.route.params.numDays) {
    initResults(page);
  } else {
    initDatePicker(page);
  }
});
