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
import "./calendar.scss";
import moment from "moment";
import { daysToToday } from "./date-utils";
import { getApp } from "../app";

let $$ = Dom7;

const dateSelectorContent = Template7.compile(`
<div class="calendar-date-select-container" role="group" aria-labelledby="date-selector-legend">
  <div id="date-selector-legend" class="date-selector-legend visually-hidden">{{@root.dateSelectionLabel}}</div>
  <div class="calendar-date-select">
    <div class="select-month-container calendar-button">
      <a class="item-link smart-select select-month" href="#" role="button" aria-haspopup="dialog" aria-expanded="false" aria-label="{{@root.monthTitle}}">
        <select name="months" aria-label="{{@root.monthTitle}}">
        {{#each month}}
          <option value="{{value}}" data-display-as="{{shortname}} {{year}}">{{name}} {{year}}</option>
        {{/each}}
        </select>
        <div class="item-content">
          <div class="item-inner">
            <div class="item-title" aria-hidden="true">{{@root.monthTitle}}</div>
            <div class="item-after"></div>
          </div>
        </div>
      </a>
    </div>
    <div class="select-day-container calendar-button">
    <a class="item-link smart-select select-day" href="#" role="button" aria-haspopup="dialog" aria-expanded="false" aria-label="{{@root.dayTitle}}">
      <select name="days" aria-label="{{@root.dayTitle}}">
        <option value="" disabled selected></option>
        {{#each day}}
          <option value="{{value}}">{{name}}</option>
        {{/each}}
      </select>
      <div class="item-content">
        <div class="item-inner">
          <div class="item-title" aria-hidden="true">{{@root.dayTitle}}</div>
          <div class="item-after"></div>
        </div>
      </div>
    </a>
  </div>
  <div class="date-choice-go-container calendar-button">
    <a class="item-link date-choice-go" href="#" role="button" aria-label="{{@root.goTitle}}" aria-disabled="true" tabindex="-1">
     <div class="item-content">
       <div class="item-inner">
        <div class="item-title" aria-hidden="true">
          {{@root.goTitle}}
        </div>
       </div>
     </div>
    </a>
  </div>
  <div class="date-selection-status visually-hidden" role="status" aria-live="polite" aria-atomic="true"></div>
  </div>
</div>
`);

function momentByMonthAndDay(month, day) {
  let dateString = month + "-";
  if (day < 10) {
    dateString += "0";
  }
  dateString += day;
  return moment(dateString, "YYYY-MM-DD");
}

const kMaxDaysInMonth = 31;
function getDateSelectorContext(today, tooLongAgo, resources) {
  let context = {
    month: [],
    monthTitle: resources.month,
    dayTitle: resources.day,
    goTitle: resources.go,
    dateSelectionLabel: resources.dateSelectionLabel || "Select date of last menstrual period",
  };

  const numMonths = 12;
  let month = moment(today);
  for (let i = 0; i < numMonths; i++) {
    const monthIndex = month.month();
    const monthNumber = monthIndex + 1;
    const monthString = (monthNumber < 10 ? "0" : "") + monthNumber;
    const year = month.year();
    context.month.push({
      value: `${year}-${monthString}`,
      monthIndex: monthIndex,
      year: year,
      name: resources.monthNames[monthIndex],
      shortname: resources.monthNamesShort[monthIndex],
    });
    month.subtract(1, "month");
  }

  context.day = Array.from(
    {
      length: kMaxDaysInMonth,
    },
    (_v, k) => ({
      value: k,
      selected: k === 0 ? "selected" : "",
      name: k + 1,
    })
  );

  return context;
}

function getVisibleFocusableElements($popup) {
  const focusableElementsString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable], label.item-radio';
  const allFocusable = $popup.find(focusableElementsString);
  const focusableElements = [];
  
  for (let i = 0; i < allFocusable.length; i++) {
    const el = allFocusable[i];
    const $el = $$(el);
    // Check visibility
    if ($el.css('display') !== 'none' && $el.css('visibility') !== 'hidden' && $el.parents('.visually-hidden').length === 0) {
         // Check disabled state more thoroughly
         if (!$el.prop('disabled') && !$el.hasClass('disabled') && !$el.parents('.disabled').length) {
             focusableElements.push(el);
         }
    }
  }
  return focusableElements;
}

function handleFocusTrap(e) {
  const $popup = $$(this);
  const focusableElements = getVisibleFocusableElements($popup);
  
  if (focusableElements.length === 0) return;

  const firstTabStop = focusableElements[0];
  const lastTabStop = focusableElements[focusableElements.length - 1];

  let currentIndex = -1;
  for (let i = 0; i < focusableElements.length; i++) {
    if (focusableElements[i] === document.activeElement) {
      currentIndex = i;
      break;
    }
  }

  if (e.keyCode === 9) { // Tab key
    if (e.shiftKey) { // Shift + Tab
      if (currentIndex === 0) {
        e.preventDefault();
        lastTabStop.focus();
      } else if (currentIndex === -1) {
        e.preventDefault();
        lastTabStop.focus();
      }
    } else { // Tab
      if (currentIndex === focusableElements.length - 1) {
        e.preventDefault();
        firstTabStop.focus();
      } else if (currentIndex === -1) {
        if (document.activeElement === $popup[0]) {
            // Do not prevent default, let browser move to first focusable child
        } else {
            e.preventDefault();
            firstTabStop.focus();
        }
      }
    }
  }
}

function attachDateSelector(page, options) {
  const $calculatorBlock = page.$el.find(".calculator-block");

  const dateSelectorContext = getDateSelectorContext(
    options.today,
    options.tooLongAgo,
    options.calculatorResources
  );
  const $dateSelector = $$(
    dateSelectorContent(dateSelectorContext)
  ).insertBefore($calculatorBlock);

  const $months = page.$el.find(".select-month");
  const $days = page.$el.find(".select-day");
  const $go = page.$el.find(".date-choice-go");
  const $calendar = page.$el.find(".gestcalc-container calendar");
  const $statusRegion = page.$el.find(".date-selection-status");

  function updateDaysForMonth(month) {
    const daySelect = app.smartSelect.get($days[0]);
    const curDay = parseInt(daySelect.$valueEl.text(), 10);
    const daysInMonth = moment(month, "YYYY-MM").daysInMonth();
    const $options = $days.find("option");
    for (let i = 1; i <= kMaxDaysInMonth; i++) {
      const $option = $$($options[i]);
      const dayDate = momentByMonthAndDay(month, i);
      const diffDays = daysToToday(dayDate);
      const disable = i > daysInMonth || diffDays < 0;
      // If selected day isn't in month, select [0]th placeholder.
      if (i === curDay && disable) {
        if ($option.prop("selected")) {
          $option.prop("selected", false);
          $$($options[0]).prop("selected", true);
          daySelect.$valueEl.text("");
        }
        $option.prop("disabled", disable);
      }
    }
  }

  function getSelectedDate() {
    const month = $months.find("select").val();
    const day = 1 + parseInt($days.find("select").val(), 10);
    return {
      valid: month && day,
      month: month,
      day: day,
    };
  }

  function syncCalendarToMenu(selectedDate) {
    const app = getApp();
    const calendar = app && app.calendar.get($calendar[0]);
    if (!calendar) return;
    
    const yearMonth = selectedDate.month.split("-").map((n) => parseInt(n, 10));
    const year = yearMonth[0];
    const month = yearMonth[1] - 1;

    if (year != calendar.currentYear || month != calendar.currentMonth) {
      calendar.setYearMonth(year, month);
    }
  }

  function updateUI() {
    const selectedDate = getSelectedDate();
    updateDaysForMonth(selectedDate.month);

    if (selectedDate.valid) {
      $go.removeClass("disabled");
      $go.attr("aria-disabled", "false");
      $go.attr("tabindex", "0");
      // Announce the selected date to screen readers
      const $select = $months.find("select");
      const $selectedOption = $select.find(":checked");
      const monthName = $selectedOption.length ? $selectedOption.text() : "";
      const dayNumber = selectedDate.day;
      const statusMessage = options.calculatorResources.dateSelectedMessage || 
        `Selected: ${monthName}, day ${dayNumber}`;
      $statusRegion.text(statusMessage);
    } else {
      $go.addClass("disabled");
      $go.attr("aria-disabled", "true");
      $go.attr("tabindex", "-1");
      // Clear status when invalid
      $statusRegion.text("");
    }
    syncCalendarToMenu(selectedDate);
  }

  const app = getApp();
  if (app && app.smartSelect) {
    const smartSelectEvents = {
      open: function(smartSelect) {
        const $trigger = $$(smartSelect.el);
        $trigger.attr("aria-expanded", "true");
        
        const $popup = smartSelect.$containerEl;
        $popup.attr("role", "dialog");
        $popup.attr("aria-modal", "true");
        $popup.attr("tabindex", "-1");
        $popup.css("outline", "none");
        $popup.on('keydown', handleFocusTrap);
      },
      opened: function(smartSelect) {
        const $popup = smartSelect.$containerEl;
        
        // Ensure close button is focusable
        $popup.find('.popup-close').each(function() {
            const $el = $$(this);
            if (!$el.attr('href') && !$el.attr('tabindex')) {
                $el.attr('href', '#');
                $el.attr('role', 'button');
            }
        });

        // Make radio items focusable since inputs are often hidden
        $popup.find('label.item-radio').each(function() {
            const $el = $$(this);
            // Only make it focusable if it's not disabled
            if (!$el.hasClass('disabled') && !$el.parents('.disabled').length) {
                $el.attr('tabindex', '0');
                $el.attr('role', 'button');
                $el.on('keydown', function(e) {
                    if (e.keyCode === 13 || e.keyCode === 32) { // Enter or Space
                        e.preventDefault();
                        $el.click();
                    }
                });
            }
        });

        const focusableElements = getVisibleFocusableElements($popup);
        
        let $target = $popup.find("input[type='radio']:checked");
        // If input is hidden, try to find its label
        if ($target.length > 0 && ($target.css('display') === 'none' || $target.css('visibility') === 'hidden')) {
            const $label = $target.parents('label.item-radio');
            if ($label.length > 0) {
                $target = $label;
            }
        }
        
        if ($target.length === 0 || $target.css('display') === 'none' || $target.css('visibility') === 'hidden') {
            if (focusableElements.length > 0) {
                $target = $$(focusableElements[0]);
            }
        }
        
        if ($target.length > 0) {
            $target[0].focus();
        }
        
        if (document.activeElement !== $target[0]) {
            $popup[0].focus();
        }
      },
      close: function(smartSelect) {
        const $trigger = $$(smartSelect.el);
        $trigger.attr("aria-expanded", "false");
        const $popup = smartSelect.$containerEl;
        $popup.off('keydown', handleFocusTrap);
      }
    };

    const monthSelect = app.smartSelect.create({
      el: $months[0],
      pageTitle: dateSelectorContext.monthTitle,
      closeOnSelect: true,
      openIn: "popup",
      on: smartSelectEvents
    });

    $months.on("change", "select", function () {
      updateUI();
    });

    const daySelect = app.smartSelect.create({
      el: $days[0],
      pageTitle: dateSelectorContext.dayTitle,
      closeOnSelect: true,
      openIn: "popup",
      on: smartSelectEvents
    });

    $days.on("change", "select", function () {
      updateUI();
    });
  }

  $go.on("click", function (e) {
    const selectedDate = getSelectedDate();
    // Check both disabled class and aria-disabled for accessibility
    const isDisabled = $go.hasClass("disabled") || $go.attr("aria-disabled") === "true";
    
    if (isDisabled) {
      e.preventDefault();
      // Announce why action can't be performed
      const errorMessage = options.calculatorResources.selectDateFirstMessage || 
        "Please select both month and day first";
      $statusRegion.text(errorMessage);
      return false;
    }
    
    if (selectedDate.valid) {
      const date = momentByMonthAndDay(selectedDate.month, selectedDate.day);
      options.goToResultsPage(date.toDate());
    }
  });

  updateUI();
}

export { attachDateSelector };
