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
import "./calendar.scss";
import moment from "moment";
import { daysToToday } from "./date-utils";

let $$ = Dom7;

const dateSelectorContent = Template7.compile(`
<div class="calendar-date-select-container">
  <div class="calendar-date-select">
    <div class="select-month-container calendar-button">
      <a href="#" class="item-link smart-select select-month">
        <select name="months">
        {{#each month}}
          <option value="{{value}}" data-display-as="{{shortname}} {{year}}">{{name}} {{year}}</option>
        {{/each}}
        </select>
        <div class="item-content">
          <div class="item-inner">
            <div class="item-title">{{@root.monthTitle}}</div>
          </div>
        </div>
      </a>
    </div>
    <div class="select-day-container calendar-button">
    <a href="#" class="item-link smart-select select-day">
      <select name="days">
        <option value="" disabled></option>
        {{#each day}}
          <option value="{{value}}" {{selected}}>{{name}}</option>
        {{/each}}
      </select>
      <div class="item-content">
        <div class="item-inner">
          <div class="item-title">{{@root.dayTitle}}</div>
        </div>
      </div>
    </a>
  </div>
  <div class="date-choice-go-container calendar-button">
    <a class="item-link date-choice-go" href="#">
     <div class="item-content">
       <div class="item-inner">
        <div class="item-title">
          {{@root.goTitle}}
        </div>
       </div>
     </div>
    </a>
  </div>

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
    const calendar = window.app.calendar.get($calendar[0]);
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
    } else {
      $go.addClass("disabled");
    }
    syncCalendarToMenu(selectedDate);
  }

  window.app.smartSelect.create({
    el: $months[0],
    closeOnSelect: true,
    openIn: "popup",
  });

  $months.on("change", "select", function () {
    updateUI();
  });

  const daySelect = window.app.smartSelect.create({
    el: $days[0],
    closeOnSelect: true,
    openIn: "popup",
  });

  $days.on("change", "select", function () {
    updateUI();
    console.log($$(this).val());
  });

  $go.on("click", function () {
    const selectedDate = getSelectedDate();
    if (selectedDate.valid) {
      const date = momentByMonthAndDay(selectedDate.month, selectedDate.day);
      options.goToResultsPage(date.toDate());
    }
  });

  updateUI();
}

export { attachDateSelector };
