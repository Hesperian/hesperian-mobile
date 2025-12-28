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
      <a class="item-link smart-select select-month" href="#" aria-label="{{@root.monthTitle}}">
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
    <a class="item-link smart-select select-day" href="#" aria-label="{{@root.dayTitle}}">
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
  <div class="date-selection-status" role="status" aria-live="polite" aria-atomic="true"></div>
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
    const monthSelect = app.smartSelect.create({
      el: $months[0],
      closeOnSelect: true,
      openIn: "popup",
      on: {
        open: function(smartSelect) {
          const $popup = $$(smartSelect.$popupEl);
          if ($popup.length) {
            // Focus the selected radio button after a short delay
            setTimeout(() => {
              const $firstRadio = $popup.find("input[type='radio']:checked");
              if ($firstRadio.length) {
                $firstRadio[0].focus();
              }
            }, 150);
          }
        }
      }
    });

    $months.on("change", "select", function () {
      updateUI();
    });

    const daySelect = app.smartSelect.create({
      el: $days[0],
      closeOnSelect: true,
      openIn: "popup",
      on: {
        open: function(smartSelect) {
          const $popup = $$(smartSelect.$popupEl);
          if ($popup.length) {
            // Focus the selected radio button after a short delay
            setTimeout(() => {
              const $firstRadio = $popup.find("input[type='radio']:checked");
              if ($firstRadio.length) {
                $firstRadio[0].focus();
              }
            }, 150);
          }
        }
      }
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
