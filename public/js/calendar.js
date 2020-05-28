/* eslint-disable no-continue */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-undef */

'use strict';

class CalendarCreator {
  constructor(container, btnPrevious, btnNext, modalInfoActions) {
    this.currentDate = 0;
    this.leftCalendar = 0;
    this.middleCalendar = 0;
    this.rightCalendar = 0;
    this.container = container;
    this.btnPrevious = btnPrevious;
    this.btnNext = btnNext;
    this.modalInfoActions = modalInfoActions;
  }

  install() {
    const date = new Date();

    this.currentDate = [date.getFullYear(), date.getMonth()];
    this.setDates();
    this.renderCalendar(this.leftCalendar[0], this.leftCalendar[1], 'left');
    this.renderCalendar(this.middleCalendar[0], this.middleCalendar[1], 'middle');
    this.renderCalendar(this.rightCalendar[0], this.rightCalendar[1], 'right');
    this.insertData();
    this.setEvents();
  }

  setDates() {
    const leftMonth = this.currentDate[1] - 1;
    const rightMonth = this.currentDate[1] + 1;

    if (leftMonth < 0) this.leftCalendar = [this.currentDate[0] - 1, 11];
    if (leftMonth >= 0) this.leftCalendar = [this.currentDate[0], leftMonth];
    if (rightMonth > 11) this.rightCalendar = [this.currentDate[0] + 1, 0];
    if (rightMonth <= 11) this.rightCalendar = [this.currentDate[0], rightMonth];
    this.middleCalendar = this.currentDate;
  }

  renderCalendar(year, month, position) {
    const div = document.createElement('div');
    const table = document.createElement('table');

    div.classList.add(`${position}-calendar`);

    this.constructor.makeTitle(year, month, div);

    div.appendChild(table);

    this.constructor.makeTHead(table);
    this.constructor.makeTBody(year, month, position, table);

    this.container.appendChild(div);
  }

  static makeTitle(year, month, div) {
    const title = document.createElement('div');

    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

    title.classList.add('calendar-title');
    title.innerText = `${months[month]} ${year}`;
    div.appendChild(title);
  }

  static makeTHead(table) {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пн', 'Сб', 'Вс'];

    for (let i = 0; i < 7; i++) {
      const th = document.createElement('th');

      th.innerText = days[i];
      tr.appendChild(th);
    }

    thead.appendChild(tr);
    table.appendChild(thead);
  }

  static makeTBody(year, month, position, table) {
    const tbody = document.createElement('tbody');

    let firstDay = new Date(year, month, 1).getDay();
    const dateInMounth = 33 - new Date(year, month, 33)
      .getDate();
    const dateInMounthArray = [];

    for (let i = dateInMounth; i >= 1; i--) {
      dateInMounthArray.push(i);
    }

    if (firstDay === 0) firstDay = 7;

    let renderTdFlag = false;

    while (dateInMounthArray.length > 0) {
      const dateLine = document.createElement('tr');

      tbody.appendChild(dateLine);

      for (let i = 1; i <= 7; i++) {
        const td = document.createElement('td');
        const actionsContainer = document.createElement('div');

        actionsContainer.classList.add('actions-container');
        td.appendChild(actionsContainer);

        if (firstDay === i) {
          renderTdFlag = true;
          firstDay = null;
        }

        dateLine.appendChild(td);

        if (renderTdFlag === true) {
          const number = dateInMounthArray[dateInMounthArray.length - 1];
          const div = document.createElement('div');

          div.innerText = number;
          td.prepend(div);
          td.setAttribute('data-day', number);
          td.setAttribute('data-month', month);
          td.setAttribute('data-year', year);
          dateInMounthArray.pop();
        }

        if (dateInMounthArray.length === 0) renderTdFlag = false;
      }
    }

    table.appendChild(tbody);
    tbody.setAttribute('data-month', month);
  }

  async getActions() {
    const response = await fetch('/get-data-actions');

    if (response.ok) {
      this.dataActions = await response.json();
    } else {
      throw new Error(`Возникла проблема с fetch запросом. ${response.status}`);
    }
  }

  async getDates() {
    const response = await fetch('/get-data-dates');

    if (response.ok) {
      this.dataDates = await response.json();
    } else {
      throw new Error(`Возникла проблема с fetch запросом. ${response.status}`);
    }
  }

  async insertData() {
    await this.getActions();

    if (!this.dataActions.actions.length && !this.dataActions.notActive.length) {
      this.showModalEmpty();
      return;
    }

    for (const action of this.dataActions.actions) {
      this.scanActionActivity(action);
    }

    await this.getActions(); // получить обновленные данные
    this.changeInsertTarget();
  }

  // Данная функция будет вызываться отдельно для каждого действия со статусом true
  async scanActionActivity(action) {
    const currentDate = new Date();
    const zeroCurrentDate = new Date(currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate());

    const createdDate = new Date(action.created); // Получить дату создания действия
    const zeroCreatedDate = new Date(createdDate.getFullYear(),
      createdDate.getMonth(),
      createdDate.getDate());

    const currentMs = zeroCurrentDate.getTime();
    const createdMs = zeroCreatedDate.getTime();

    const actionActivity = this.dataActions.dates[action._id]; // Получить существующие активности
    const newActivity = []; // контейнер для новых активностей
    const sumDays = []; // общее кол-во дней, включая текущий, с момента создания действия
    let i = 0;

    if (createdMs > currentMs) return;

    if (createdMs === currentMs) {
      this.constructor.setSumDays(action, currentDate, sumDays);
    }

    if (createdMs < currentMs) {
      let currentMsInCikle = currentMs;

      while (createdMs !== currentMsInCikle) {
        currentMsInCikle -= i;
        i = 86400000;

        // учитываем, что если действие имеет конкретный день, то добавлять только его
        this.constructor.setSumDays(action, new Date(currentMsInCikle), sumDays);
      }
    }

    // сравнение количества существующих дат и фактической их суммы
    // если есть разница, то добавить новые активности в контейнер
    if (actionActivity.length !== sumDays.length) {
      // если нет ни одной активности
      if (!actionActivity.length) {
        for (let x = 0; x < sumDays.length; x++) {
          newActivity.push({
            id_action: action._id,
            action_name: action.name,
            year: sumDays[x][0],
            month: sumDays[x][1],
            day: sumDays[x][2],
          });
        }
      } else {
        for (const activity of actionActivity) {
          for (let y = 0; y < sumDays.length; y++) {
            if (+activity.year === sumDays[y][0] && +activity.month === sumDays[y][1]
              && +activity.day === sumDays[y][2]) {
              sumDays.splice(y, 1);
            }
          }
        }

        for (const day of sumDays) {
          newActivity.push({
            id_action: action._id,
            action_name: action.name,
            year: day[0],
            month: day[1],
            day: day[2],
          });
        }
      }
    }

    // если контейнер не пустой, то отправить данные на сервер
    if (newActivity.length) {
      const obj = {
        // eslint-disable-next-line no-underscore-dangle
        id: action._id,
        activities: newActivity,
      };

      const response = await fetch('/set-new-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify(obj),
      });

      if (!response.ok) throw new Error(`Возникла проблема с fetch запросом. ${response.status}`);
    }
  }

  static setSumDays(action, currentDate, sumDays) {
    if (action.days[0] !== 'everyday') {
      const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const number = currentDate.getDay();

      for (let z = 0; z < action.days.length; z++) {
        if (action.days[z] === days[number]) {
          sumDays.push([
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
          ]);
        }
      }
    } else {
      sumDays.push([currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()]);
    }
  }

  changeInsertTarget(side) {
    if (!side) {
      this.insertDataDays('left');
      this.insertDataDays('middle');
      this.insertDataDays('right');
    }
    if (side === 'left') {
      this.insertDataDays('left');
    }
    if (side === 'right') {
      this.insertDataDays('right');
    }
  }

  insertDataDays(position) {
    const calendar = this.container.getElementsByClassName(`${position}-calendar`)[0];
    const td = calendar.getElementsByTagName('td');
    const dateNow = new Date();
    const yearNow = dateNow.getFullYear();
    const monthNow = dateNow.getMonth();
    const dayNow = dateNow.getDate();

    // перебрать все дни в календаре
    [].forEach.call(td, (item) => {
      const day = item.getAttribute('data-day');
      const month = item.getAttribute('data-month');
      const year = item.getAttribute('data-year');
      const tdDate = new Date(year, month, day);

      // если td не пустой
      if (day) {
        const activeActions = {};
        let activeActionsLength = 0;

        for (const action of this.dataActions.actions) {
          activeActions[action.position] = action;
          activeActionsLength += 1;
        }

        if (activeActionsLength > 0) {
          // вставить данные текущих действий
          for (let i = 1; i <= activeActionsLength; i++) {
            const createdDate = new Date(activeActions[i].created);
            const createdYear = createdDate.getFullYear();
            const createdMonth = createdDate.getMonth();
            const createdDay = createdDate.getDate();
            const zeroCreatedDate = new Date(createdYear, createdMonth, createdDay);
            let endDate;

            // если дейсвтие было создано позже, то пропустить день
            if (zeroCreatedDate > tdDate) continue;

            if (activeActions[i].end) endDate = new Date(activeActions[i].end);

            // если дата td меньше или равна текущему дню
            if (tdDate <= dateNow) {
              for (const date of this.dataActions.dates[activeActions[i]._id]) {
                if (date.year === year && date.month === month && date.day === day) {
                  this.constructor.renderAction(item, activeActions[i].name, activeActions[i]._id,
                    date.status, date._id, date.year, date.month, date.day, activeActions[i].debt);
                }
              }
              // а если дата td больше текущего дня,
              // то рендерить неиспользуемую ячейку действия
            } else if (activeActions[i].days[0] === 'everyday') { // рендерить действия каждый день
              if (tdDate > endDate) continue;
              this.constructor.renderAction(item, activeActions[i].name, activeActions[i]._id, 'unused');
              // а если у действия есть опредлённые дни, то рендерить действие только в эти дни
            } else {
              if (tdDate > endDate) continue;
              const daysName = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
              const tdDay = tdDate.getDay();

              if (activeActions[i].days.indexOf(daysName[tdDay]) >= 0) {
                this.constructor.renderAction(item, activeActions[i].name, activeActions[i]._id, 'unused');
              }
            }
          }
        }

        // если активных действий нет, то просто отобразить текущий день без действий
        if (!activeActionsLength && +year === yearNow && +month === monthNow && +day === dayNow) {
          item.classList.add('current-day');
        }

        const zeroDateNow = new Date(yearNow, monthNow, dayNow);
        // вставить данные не активных действий
        for (const action of this.dataActions.notActive) {
          for (const date of this.dataActions.notActiveDates[action._id]) {
            if (date.year === year && date.month === month && date.day === day) {
              // если в сегодняшнеми дне действие не было отмечено до завершения, то не рендерить
              if (zeroDateNow.getTime() === tdDate.getTime() && !date.status) continue;

              this.constructor.renderAction(item, action.name, action._id, date.status, date._id,
                date.year, date.month, date.day);
            }
          }
        }

        // есть есть долги, то вставить их в текущий день
        /* if (this.dataActions.debts.length > 0) {
          if (tdDate.getTime() === zeroDateNow.getTime()) {
            for (const date of this.dataActions.debts) {
              this.constructor.renderAction(item, date.action_name, date.action_id, 'debt', date._id,
                date.year, date.month, date.day);
            }
          }
        } */
      }
    }); // end forEach td
  }

  static renderAction(td, name, actionId, status, dateId = 0, year = 0, month = 0, day = 0, debt) {
    const div = document.createElement('div');
    const actionsContainer = td.getElementsByClassName('actions-container')[0];

    div.classList.add('action');
    div.setAttribute('data-action', name);
    div.setAttribute('data-action-id', actionId);
    div.setAttribute('data-id', dateId);
    div.setAttribute('data-status', status);
    div.setAttribute('data-date', `${year}-${month}-${day}`);

    if (debt) div.id = `debt-${dateId}`;

    switch (status) {
      case 'unused':
        div.classList.add('action-unused');
        break;
      case 'debt':
        div.classList.add('action-debt');
        break;
      case false:
        div.classList.add('action-false');
        break;
      case true:
        div.classList.add('action-done');
        break;
      // no default
    }

    actionsContainer.appendChild(div);

    this.setDayStatus(td, actionsContainer);
  }

  static setDayStatus(day, actions) {
    const date = new Date();
    const year = day.getAttribute('data-year');
    const month = day.getAttribute('data-month');
    const currentDay = day.getAttribute('data-day');
    const otherBoxes = actions.parentNode.getElementsByClassName('actions-container');
    let dayStatus = true;

    function checkStatus(i) {
      [].forEach.call(otherBoxes[i].children, (action) => {
        const actionStatus = action.getAttribute('data-status');

        if (actionStatus === 'false') dayStatus = false;
        if (actionStatus === 'unused') dayStatus = 'unused';
      });
    }

    for (let i = 0; i < otherBoxes.length; i++) {
      checkStatus(i);
    }

    day.classList.remove('completed-day', 'incompleted-day');

    if (dayStatus === 'unused') day.classList.add('unused-day');
    if (dayStatus === true) day.classList.add('completed-day');
    if (dayStatus === false) day.classList.add('incompleted-day');

    if (+year === date.getFullYear() && +month === date.getMonth()
      && +currentDay === date.getDate()) {
      day.classList.remove('completed-day', 'incompleted-day');
      day.classList.add('current-day');
    }

    if (+year === date.getFullYear() && +month === date.getMonth()
      && +currentDay === date.getDate() && dayStatus === true) {
      day.classList.remove('current-day');
      day.classList.add('completed-day');
    }
  }

  async updateActionStatus(dateId, status, action) {
    let obj = {};

    if (status === 'false' || status === 'debt') {
      obj = { dateId, status: true };
      action.classList.remove('action-false');
      action.classList.add('action-done');
      action.setAttribute('data-status', true);
    } else {
      obj = { dateId, status: false };
      action.classList.remove('action-done');
      action.classList.add('action-false');
      action.setAttribute('data-status', false);
    }

    const response = await fetch('/update-action-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      body: JSON.stringify(obj),
    });

    if (response.ok) {
      if (status === 'debt') {
        const debtDay = document.getElementById(`debt-${dateId}`);

        if (debtDay) {
          debtDay.classList.remove('action-false');
          debtDay.classList.add('action-done');
          debtDay.setAttribute('data-status', true);

          const actionsBox = debtDay.parentNode;
          const day = actionsBox.parentNode;

          this.constructor.setDayStatus(day, actionsBox);
          await this.getActions();
        }

        action.remove();
      } else {
        const actionsBox = action.parentNode;
        const day = actionsBox.parentNode;

        this.constructor.setDayStatus(day, actionsBox);
        await this.getActions();
      }
    } else {
      throw new Error(`Возникла проблема с fetch запросом. ${response.status}`);
    }
  }

  static showActionInfo(target) {
    const tooltip = document.createElement('div');
    const triangle = document.createElement('div');
    const name = target.getAttribute('data-action');

    tooltip.innerHTML = `<p>${name}</p>`;

    if (target.closest('.action-debt')) {
      const debtInfo = document.createElement('p');
      const debt = target.getAttribute('data-date');
      const monthsArr = ['января', 'февраля', 'марта',
        'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября',
        'октября', 'ноября', 'декабря'];

      const date = debt.match(/\d+/g);

      debtInfo.innerText = `${date[2]} ${monthsArr[date[1]]} ${date[0]} `;
      tooltip.appendChild(debtInfo);
    }

    tooltip.classList.add('tooltip');
    target.append(tooltip);
    triangle.classList.add('triangle-down');
    tooltip.append(triangle);

    const tooltipStyle = getComputedStyle(tooltip);
    const targetStyle = getComputedStyle(target);
    const leftValue = (parseInt(tooltipStyle.width, 10) / 2
      - parseInt(targetStyle.width, 10) / 2) * -1;
    const topValue = (parseInt(tooltipStyle.height, 10)
      + parseInt(targetStyle.height, 10) / 2) * -1;

    tooltip.style.left = `${leftValue}px`;
    tooltip.style.top = `${topValue}px`;

    const coord = tooltip.getBoundingClientRect();

    if (coord.left < 0) {
      tooltip.style.left = '-40px';
      triangle.style.left = '45px';
    }
    if (coord.left > 0) {
      triangle.style.right = 0;
    }

    if (coord.right > document.documentElement.clientWidth) {
      tooltip.style.left = 'auto';
      tooltip.style.right = '-40px';
      triangle.style.right = '45px';
      triangle.style.left = 'auto';
    }
  }

  clickDirection(direction) {
    const leftCalendar = document.getElementsByClassName('left-calendar')[0];
    const middleCalendar = document.getElementsByClassName('middle-calendar')[0];
    const rightCalendar = document.getElementsByClassName('right-calendar')[0];

    if (direction === 'left') {
      middleCalendar.style.left = '100%';
      leftCalendar.style.left = '0';

      rightCalendar.remove();

      middleCalendar.classList.remove('middle-calendar');
      middleCalendar.classList.add('right-calendar');

      leftCalendar.classList.remove('left-calendar');
      leftCalendar.classList.add('middle-calendar');
    }

    if (direction === 'right') {
      middleCalendar.style.left = '-100%';
      rightCalendar.style.left = '0';

      leftCalendar.remove();

      middleCalendar.classList.remove('middle-calendar');
      middleCalendar.classList.add('left-calendar');

      rightCalendar.classList.remove('right-calendar');
      rightCalendar.classList.add('middle-calendar');
    }

    this.update(direction);
    this.changeInsertTarget(direction);
  }

  update(direction) {
    if (direction === 'left') {
      const newCurrentMounth = this.currentDate[1] - 1;

      if (newCurrentMounth < 0) this.currentDate = [this.currentDate[0] - 1, 11];
      if (newCurrentMounth >= 0) this.currentDate = [this.currentDate[0], newCurrentMounth];

      this.setDates();
      this.renderCalendar(this.leftCalendar[0], this.leftCalendar[1], 'left');
    }

    if (direction === 'right') {
      const newCurrentMounth = this.currentDate[1] + 1;

      if (newCurrentMounth > 11) this.currentDate = [this.currentDate[0] + 1, 0];
      if (newCurrentMounth <= 11) this.currentDate = [this.currentDate[0], newCurrentMounth];

      this.setDates();
      this.renderCalendar(this.rightCalendar[0], this.rightCalendar[1], 'right');
    }
  }

  showModalEmpty() {
    const modal = document.createElement('div');

    modal.classList.add('modal-empty-calendar');
    modal.innerText = 'Вы ещё не создали ни одного действия';

    this.container.appendChild(modal);
  }

  setEvents() {
    this.btnPrevious.addEventListener('click', () => {
      this.clickDirection('left');
    });

    this.btnNext.addEventListener('click', () => {
      this.clickDirection('right');
    });

    this.container.addEventListener('click', (e) => {
      const target = e.target;

      if (target.closest('.action') && !target.closest('.action-unused')) {
        const id = target.getAttribute('data-id');
        const status = target.getAttribute('data-status');

        this.updateActionStatus(id, status, target);

        return;
      }

      if (target.closest('.incompleted-day') || target.closest('.current-day') || target.closest('.completed-day')) {
        this.modalInfoActions.style.display = 'block';
      }
    });

    this.modalInfoActions.addEventListener('click', (e) => {
      const target = e.target;

      if (!target.closest('.action-item')) this.modalInfoActions.style.display = 'none';
    });

    /* this.container.addEventListener('mouseover', (e) => {
      const target = e.target;

      if (target.closest('.action')) this.constructor.showActionInfo(target);
    });

    this.container.addEventListener('mouseout', (e) => {
      const { target } = e;

      if (target.closest('.action')) {
        document.getElementsByClassName('tooltip')[0].remove();
      }
    }); */
  }
}


const container = document.getElementsByClassName('calendar')[0];
const btnPrevious = document.getElementById('left');
const btnNext = document.getElementById('right');
const modalInfoActions = document.getElementById('modal-info-actions');
const calendar = new CalendarCreator(container, btnPrevious, btnNext, modalInfoActions);

calendar.install();
