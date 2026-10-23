// js/app.js

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// App State
const state = {
  currentDate: new Date(),
  currentWeek: new Date(),
  currentMonth: new Date(),
  currentYear: new Date().getFullYear()
};

function switchView(targetId) {
  // Update active bottom nav
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.getAttribute('data-target') === targetId);
  });

  // Update active period pills across views
  document.querySelectorAll('.period-pill').forEach(p => {
    p.classList.toggle('active', p.getAttribute('data-target') === targetId);
  });

  // Show corresponding view
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById(targetId);
  if (targetView) targetView.classList.add('active');

  // Trigger resize on charts to fix rendering issues when tab was hidden
  window.dispatchEvent(new Event('resize'));

  if (targetId === 'view-daily') {
    loadDailyData();
  } else if (targetId === 'view-weekly') {
    loadWeeklyData();
  } else if (targetId === 'view-monthly') {
    loadMonthlyData();
  } else if (targetId === 'view-yearly') {
    loadYearlyData();
  } else if (targetId === 'view-settings') {
    checkHotspotConnection();
  }
}

function initApp() {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered!', reg))
      .catch(err => console.error('SW registration failed', err));
  }

  // Setup Navigation listeners (Bottom Nav and Period Switcher Pills)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.getAttribute('data-target'));
    });
  });

  document.querySelectorAll('.period-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(pill.getAttribute('data-target'));
    });
  });

  // Initialize Charts
  const dailyCanvas = document.getElementById('dailyChart');
  if (dailyCanvas) window.charts.initDailyChart(dailyCanvas);
  
  const weeklyCanvas = document.getElementById('weeklyChart');
  if (weeklyCanvas) window.charts.initWeeklyChart(weeklyCanvas);

  const monthlyCanvas = document.getElementById('monthlyChart');
  if (monthlyCanvas) window.charts.initMonthlyChart(monthlyCanvas);

  const yearlyCanvas = document.getElementById('yearlyChart');
  if (yearlyCanvas) window.charts.initYearlyChart(yearlyCanvas);

  // Setup Date Pickers
  setupDatePickers();

  // Setup Demo Data Button
  document.getElementById('btnLoadDemoData').addEventListener('click', loadDemoData);

  // Setup Wi-Fi Configuration
  setupWifiConfiguration();

  // Setup Battery Configuration
  setupBatteryConfiguration();

  // Start Firebase listeners
  initFirebaseListeners();
}

function formatDateForInput(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatMonthForInput(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function getWeekDays(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Adjust to Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    week.push(nextDay);
  }
  return week;
}

function formatWeekRange(weekDays) {
  const start = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} - ${end}`;
}

function setupDatePickers() {
  // Daily Picker
  const datePicker = document.getElementById('datePicker');
  if (datePicker) {
    datePicker.value = formatDateForInput(state.currentDate);
    datePicker.addEventListener('change', (e) => {
      state.currentDate = new Date(e.target.value);
      loadDailyData();
    });
  }
  
  const prevDayBtn = document.getElementById('prevDayBtn');
  if (prevDayBtn) {
    prevDayBtn.addEventListener('click', () => {
      state.currentDate.setDate(state.currentDate.getDate() - 1);
      if (datePicker) datePicker.value = formatDateForInput(state.currentDate);
      loadDailyData();
    });
  }
  
  const nextDayBtn = document.getElementById('nextDayBtn');
  if (nextDayBtn) {
    nextDayBtn.addEventListener('click', () => {
      state.currentDate.setDate(state.currentDate.getDate() + 1);
      if (datePicker) datePicker.value = formatDateForInput(state.currentDate);
      loadDailyData();
    });
  }

  // Weekly Picker
  const prevWeekBtn = document.getElementById('prevWeekBtn');
  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', () => {
      state.currentWeek.setDate(state.currentWeek.getDate() - 7);
      loadWeeklyData();
    });
  }

  const nextWeekBtn = document.getElementById('nextWeekBtn');
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => {
      state.currentWeek.setDate(state.currentWeek.getDate() + 7);
      loadWeeklyData();
    });
  }

  // Monthly Picker
  const monthPicker = document.getElementById('monthPicker');
  if (monthPicker) {
    monthPicker.value = formatMonthForInput(state.currentMonth);
    monthPicker.addEventListener('change', (e) => {
      state.currentMonth = new Date(e.target.value + '-01');
      loadMonthlyData();
    });
  }
  
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
      if (monthPicker) monthPicker.value = formatMonthForInput(state.currentMonth);
      loadMonthlyData();
    });
  }
  
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
      if (monthPicker) monthPicker.value = formatMonthForInput(state.currentMonth);
      loadMonthlyData();
    });
  }

  // Yearly Picker
  const prevYearBtn = document.getElementById('prevYearBtn');
  if (prevYearBtn) {
    prevYearBtn.addEventListener('click', () => {
      state.currentYear--;
      loadYearlyData();
    });
  }

  const nextYearBtn = document.getElementById('nextYearBtn');
  if (nextYearBtn) {
    nextYearBtn.addEventListener('click', () => {
      state.currentYear++;
      loadYearlyData();
    });
  }
}

function animateValue(obj, start, end, duration, decimals = 1) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const val = (progress * (end - start) + start).toFixed(decimals);
    obj.innerHTML = val;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// ---------------- FIREBASE INTEGRATION ----------------

function initFirebaseListeners() {
  const connectedRef = firebase.database().ref('.info/connected');
  connectedRef.on('value', (snap) => {
    const isConnected = snap.val() === true;
    updateConnectionStatus(isConnected);
  });

  const liveRef = database.ref('live');
  liveRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      updateLiveDashboard(data);
    }
  });

  const statsRef = database.ref('stats');
  statsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      updateStats(data);
    }
  });
}

function updateConnectionStatus(isConnected) {
  const dot = document.getElementById('connectionDot');
  const text = document.getElementById('connectionText');
  const dbStatus = document.getElementById('dbStatus');
  
  if (isConnected) {
    dot.className = 'dot connected';
    text.textContent = 'Connected';
    dbStatus.textContent = 'Connected';
    dbStatus.style.color = 'var(--success)';
  } else {
    dot.className = 'dot offline';
    text.textContent = 'Offline';
    dbStatus.textContent = 'Disconnected';
    dbStatus.style.color = 'var(--danger)';
  }
}

let lastPower = 0;
function updateLiveDashboard(data) {
  const now = new Date();
  document.getElementById('lastUpdated').textContent = now.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit', hour12: true});
  document.getElementById('lastSyncTime').textContent = now.toLocaleString('en-IN', {hour12: true});

  // Support 4-channel payload (data.solar, data.battery, data.load, data.inverter) or legacy flat payload
  const solar = (data && data.solar) ? data.solar : (data || {});
  const power = Number(solar.watts !== undefined ? solar.watts : (solar.power || 0));
  const voltage = Number(solar.volts !== undefined ? solar.volts : (solar.voltage || 0));
  const current = Number(solar.amps !== undefined ? solar.amps : (solar.current || 0));

  const powerElem = document.getElementById('livePower');
  animateValue(powerElem, lastPower, power, 500, 1);
  lastPower = power;

  document.getElementById('liveVoltage').textContent = `${voltage.toFixed(1)} V`;
  document.getElementById('liveCurrent').textContent = `${current.toFixed(1)} A`;

  const statusBadge = document.getElementById('systemStatus');
  if (power > 10) {
    statusBadge.innerHTML = '<i class="fas fa-sun"></i> Generating';
    statusBadge.style.color = 'var(--accent-primary)';
    statusBadge.style.background = 'rgba(255, 184, 0, 0.15)';
  } else {
    statusBadge.innerHTML = '<i class="fas fa-moon"></i> Standby';
    statusBadge.style.color = 'var(--text-secondary)';
    statusBadge.style.background = 'rgba(255, 255, 255, 0.1)';
  }

  // Update multi-channel power stages
  updateChannelDisplay('chSolar', solar);
  if (data && data.battery) {
    updateChannelDisplay('chBattery', data.battery);
    updateBatteryDisplay(data.battery);
  }
  if (data && data.load) updateChannelDisplay('chLoad', data.load);
  if (data && data.inverter) updateChannelDisplay('chInverter', data.inverter);
}

function updateChannelDisplay(prefix, channelData) {
  const wattsElem = document.getElementById(`${prefix}Watts`);
  const subElem = document.getElementById(`${prefix}Sub`);
  if (!channelData) return;
  const w = Number(channelData.watts !== undefined ? channelData.watts : (channelData.power || 0));
  const v = Number(channelData.volts !== undefined ? channelData.volts : (channelData.voltage || 0));
  const a = Number(channelData.amps !== undefined ? channelData.amps : (channelData.current || 0));
  if (wattsElem) wattsElem.textContent = `${w.toFixed(1)} W`;
  if (subElem) {
    if (prefix === 'chBattery') {
      const mode = a > 0.05 ? ' (Charging)' : (a < -0.05 ? ' (Discharging)' : ' (Idle)');
      const sign = a > 0 ? '+' : '';
      subElem.textContent = `${v.toFixed(1)} V | ${sign}${a.toFixed(1)} A${mode}`;
    } else {
      subElem.textContent = `${v.toFixed(1)} V | ${a.toFixed(1)} A`;
    }
  }
}

function updateStats(data) {
  if (!data) return;
  const today = Number(data.today_kwh || 0);
  const week = Number(data.week_kwh || 0);
  const month = Number(data.month_kwh || 0);
  const alltime = Number(data.alltime_kwh || 0);

  const todayElem = document.getElementById('statToday');
  const weekElem = document.getElementById('statWeek');
  const monthElem = document.getElementById('statMonth');
  const alltimeElem = document.getElementById('statAllTime');

  if (todayElem) todayElem.textContent = today < 0.1 && today > 0 ? today.toFixed(3) : today.toFixed(1);
  if (weekElem) weekElem.textContent = week.toFixed(1);
  if (monthElem) monthElem.textContent = month.toFixed(1);
  if (alltimeElem) alltimeElem.textContent = alltime.toFixed(1);
}

function loadDailyData() {
  const dateStr = formatDateForInput(state.currentDate); // YYYY-MM-DD
  
  database.ref(`hourly/${dateStr}`).once('value').then((snapshot) => {
    const data = snapshot.val();
    window.charts.updateDailyChart(data);
    
    // Calculate totals
    let totalWh = 0;
    let peakW = 0;
    let consumedWh = 0;
    let battDischargedWh = 0;
    let loadWh = 0;
    let invWh = 0;

    if (data && typeof data === 'object') {
      Object.values(data).forEach(hour => {
        if (hour && typeof hour === 'object') {
          totalWh += Number(hour.energy_wh || 0);
          if (Number(hour.peak_w || 0) > peakW) peakW = Number(hour.peak_w);

          const c = Number(hour.consumed_wh !== undefined ? hour.consumed_wh : (
            (Number(hour.battery_discharged_wh || 0)) + (Number(hour.load_wh || 0)) + (Number(hour.inverter_wh || 0))
          ));
          consumedWh += c;
          battDischargedWh += Number(hour.battery_discharged_wh || 0);
          loadWh += Number(hour.load_wh || 0);
          invWh += Number(hour.inverter_wh || 0);
        }
      });
    }
    
    const kwh = totalWh / 1000;
    const formattedKwh = kwh > 0 && kwh < 0.01 ? kwh.toFixed(3) : kwh.toFixed(2);
    document.getElementById('dailyTotal').innerHTML = `${formattedKwh} <small>kWh</small>`;
    document.getElementById('dailyPeak').innerHTML = `${peakW} <small>W</small>`;

    const cTotal = document.getElementById('dailyConsumedTotal');
    const cBatt = document.getElementById('dailyBatteryDischarged');
    const cLoad = document.getElementById('dailyLoadTotal');
    const cInv = document.getElementById('dailyInverterTotal');

    if (cTotal) cTotal.textContent = `${(consumedWh / 1000).toFixed(2)} kWh`;
    if (cBatt) cBatt.innerHTML = `${(battDischargedWh / 1000).toFixed(2)} <small>kWh</small>`;
    if (cLoad) cLoad.innerHTML = `${(loadWh / 1000).toFixed(2)} <small>kWh</small>`;
    if (cInv) cInv.innerHTML = `${(invWh / 1000).toFixed(2)} <small>kWh</small>`;
  });
}

function loadMonthlyData() {
  const monthStr = formatMonthForInput(state.currentMonth); // YYYY-MM
  
  // Get days in month
  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  database.ref(`daily/${monthStr}`).once('value').then((snapshot) => {
    const data = snapshot.val();
    window.charts.updateMonthlyChart(data, daysInMonth);
    
    // Calculate totals
    let totalKwh = 0;
    let count = 0;
    let totalConsumedKwh = 0;
    let totalBattKwh = 0;
    let totalLoadKwh = 0;
    let totalInvKwh = 0;

    if (data && typeof data === 'object') {
      Object.values(data).forEach(day => {
        if (day && typeof day === 'object') {
          totalKwh += Number(day.energy_kwh || 0);
          count++;

          const c = Number(day.consumed_kwh !== undefined ? day.consumed_kwh : (
            (Number(day.battery_discharged_kwh || 0)) + (Number(day.load_kwh || 0)) + (Number(day.inverter_kwh || 0))
          ));
          totalConsumedKwh += c;
          totalBattKwh += Number(day.battery_discharged_kwh || 0);
          totalLoadKwh += Number(day.load_kwh || 0);
          totalInvKwh += Number(day.inverter_kwh || 0);
        }
      });
    }
    
    const avg = count > 0 ? totalKwh / count : 0;
    
    document.getElementById('monthlyTotal').innerHTML = `${totalKwh.toFixed(1)} <small>kWh</small>`;
    document.getElementById('monthlyAvg').innerHTML = `${avg.toFixed(2)} <small>kWh</small>`;

    const cTotal = document.getElementById('monthlyConsumedTotal');
    const cBatt = document.getElementById('monthlyBatteryDischarged');
    const cLoad = document.getElementById('monthlyLoadTotal');
    const cInv = document.getElementById('monthlyInverterTotal');

    if (cTotal) cTotal.textContent = `${totalConsumedKwh.toFixed(2)} kWh`;
    if (cBatt) cBatt.innerHTML = `${totalBattKwh.toFixed(2)} <small>kWh</small>`;
    if (cLoad) cLoad.innerHTML = `${totalLoadKwh.toFixed(2)} <small>kWh</small>`;
    if (cInv) cInv.innerHTML = `${totalInvKwh.toFixed(2)} <small>kWh</small>`;
  });
}

function loadWeeklyData() {
  const weekDays = getWeekDays(state.currentWeek);
  const weekDisplay = document.getElementById('weekDisplay');
  if (weekDisplay) weekDisplay.textContent = formatWeekRange(weekDays);

  const promises = weekDays.map(d => {
    const monthStr = formatMonthForInput(d);
    const dayStr = String(d.getDate()).padStart(2, '0');
    return database.ref(`daily/${monthStr}/${dayStr}`).once('value');
  });

  Promise.all(promises).then(snapshots => {
    let totalKwh = 0;
    let bestKwh = 0;
    let bestDayName = '--';
    let totalConsumedKwh = 0;
    let totalBattKwh = 0;
    let totalLoadKwh = 0;
    let totalInvKwh = 0;

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysKwh = [];

    snapshots.forEach((snap, idx) => {
      const val = snap.val();
      const kwh = (val && typeof val === 'object') ? Number(val.energy_kwh || 0) : 0;
      daysKwh.push(kwh);
      totalKwh += kwh;
      if (kwh > bestKwh) {
        bestKwh = kwh;
        bestDayName = dayNames[idx];
      }

      if (val && typeof val === 'object') {
        const c = Number(val.consumed_kwh !== undefined ? val.consumed_kwh : (
          (Number(val.battery_discharged_kwh || 0)) + (Number(val.load_kwh || 0)) + (Number(val.inverter_kwh || 0))
        ));
        totalConsumedKwh += c;
        totalBattKwh += Number(val.battery_discharged_kwh || 0);
        totalLoadKwh += Number(val.load_kwh || 0);
        totalInvKwh += Number(val.inverter_kwh || 0);
      }
    });

    const avgKwh = totalKwh / 7;

    window.charts.updateWeeklyChart(daysKwh, dayNames);

    const totalElem = document.getElementById('weeklyTotal');
    const avgElem = document.getElementById('weeklyAvg');
    const peakElem = document.getElementById('weeklyPeakDay');

    if (totalElem) totalElem.innerHTML = `${totalKwh.toFixed(2)} <small>kWh</small>`;
    if (avgElem) avgElem.innerHTML = `${avgKwh.toFixed(2)} <small>kWh</small>`;
    if (peakElem) peakElem.innerHTML = bestKwh > 0 ? `${bestDayName} (${bestKwh.toFixed(1)}k)` : '--';

    const cTotal = document.getElementById('weeklyConsumedTotal');
    const cBatt = document.getElementById('weeklyBatteryDischarged');
    const cLoad = document.getElementById('weeklyLoadTotal');
    const cInv = document.getElementById('weeklyInverterTotal');

    if (cTotal) cTotal.textContent = `${totalConsumedKwh.toFixed(2)} kWh`;
    if (cBatt) cBatt.innerHTML = `${totalBattKwh.toFixed(2)} <small>kWh</small>`;
    if (cLoad) cLoad.innerHTML = `${totalLoadKwh.toFixed(2)} <small>kWh</small>`;
    if (cInv) cInv.innerHTML = `${totalInvKwh.toFixed(2)} <small>kWh</small>`;
  });
}

function loadYearlyData() {
  const year = state.currentYear;
  const yearDisplay = document.getElementById('yearDisplay');
  if (yearDisplay) yearDisplay.textContent = String(year);

  const monthPromises = [];
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`;
    monthPromises.push(database.ref(`daily/${monthStr}`).once('value'));
  }

  Promise.all(monthPromises).then(snapshots => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsKwh = [];
    let yearTotalKwh = 0;
    let peakMonthKwh = 0;
    let peakMonthName = '--';
    let activeMonths = 0;
    let totalConsumedKwh = 0;
    let totalBattKwh = 0;
    let totalLoadKwh = 0;
    let totalInvKwh = 0;

    snapshots.forEach((snap, idx) => {
      const daysData = snap.val();
      let monthSum = 0;
      if (daysData && typeof daysData === 'object') {
        Object.values(daysData).forEach(day => {
          if (day && typeof day === 'object') {
            const kwh = Number(day.energy_kwh || 0);
            monthSum += kwh;

            const c = Number(day.consumed_kwh !== undefined ? day.consumed_kwh : (
              (Number(day.battery_discharged_kwh || 0)) + (Number(day.load_kwh || 0)) + (Number(day.inverter_kwh || 0))
            ));
            totalConsumedKwh += c;
            totalBattKwh += Number(day.battery_discharged_kwh || 0);
            totalLoadKwh += Number(day.load_kwh || 0);
            totalInvKwh += Number(day.inverter_kwh || 0);
          }
        });
        if (monthSum > 0) activeMonths++;
      }
      monthsKwh.push(parseFloat(monthSum.toFixed(1)));
      yearTotalKwh += monthSum;

      if (monthSum > peakMonthKwh) {
        peakMonthKwh = monthSum;
        peakMonthName = monthNames[idx];
      }
    });

    const avgMonthKwh = activeMonths > 0 ? (yearTotalKwh / activeMonths) : 0;

    window.charts.updateYearlyChart(monthsKwh);

    const totalElem = document.getElementById('yearlyTotal');
    const avgElem = document.getElementById('yearlyAvg');
    const peakElem = document.getElementById('yearlyPeakMonth');

    if (totalElem) totalElem.innerHTML = `${yearTotalKwh.toFixed(1)} <small>kWh</small>`;
    if (avgElem) avgElem.innerHTML = `${avgMonthKwh.toFixed(1)} <small>kWh</small>`;
    if (peakElem) peakElem.innerHTML = peakMonthKwh > 0 ? `${peakMonthName} (${peakMonthKwh.toFixed(0)}k)` : '--';

    const cTotal = document.getElementById('yearlyConsumedTotal');
    const cBatt = document.getElementById('yearlyBatteryDischarged');
    const cLoad = document.getElementById('yearlyLoadTotal');
    const cInv = document.getElementById('yearlyInverterTotal');

    if (cTotal) cTotal.textContent = `${totalConsumedKwh.toFixed(2)} kWh`;
    if (cBatt) cBatt.innerHTML = `${totalBattKwh.toFixed(2)} <small>kWh</small>`;
    if (cLoad) cLoad.innerHTML = `${totalLoadKwh.toFixed(2)} <small>kWh</small>`;
    if (cInv) cInv.innerHTML = `${totalInvKwh.toFixed(2)} <small>kWh</small>`;
  });
}

// ---------------- DEMO DATA GENERATOR ----------------

async function loadDemoData() {
  const btn = document.getElementById('btnLoadDemoData');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
  btn.disabled = true;

  try {
    const today = new Date();
    const updates = {};
    
    let monthTotal = 0;
    let weekTotal = 0;
    let allTimeTotal = 1200.5;

    // Generate 365 days of data covering the past year
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      
      const dateStr = formatDateForInput(d);
      const monthStr = formatMonthForInput(d);
      const dayStr = String(d.getDate()).padStart(2, '0');
      
      let dailyTotalWh = 0;
      let dailyPeakW = 0;
      let dailyConsumedWh = 0;
      let dailyBattWh = 0;
      let dailyLoadWh = 0;
      let dailyInvWh = 0;
      const hourlyData = {};
      
      const weatherFactor = 0.5 + (Math.random() * 0.7);

      for (let h = 0; h < 24; h++) {
        let energyWh = 0;
        let peakW = 0;
        let battWh = 0;
        let loadWh = 0;
        let invWh = 0;
        
        if (h >= 6 && h <= 18) {
          const distance = Math.abs(12 - h);
          const maxPower = 1000 * weatherFactor;
          const power = Math.max(0, maxPower * (1 - Math.pow(distance / 6, 2)));
          energyWh = Math.round(power * (0.8 + Math.random() * 0.4));
          peakW = Math.round(energyWh * 1.2);
        }

        if (h >= 8 && h <= 22) {
          loadWh = Math.round(15 + Math.random() * 20);
        }
        if (h >= 18 && h <= 23) {
          invWh = Math.round(80 + Math.random() * 120);
          battWh = Math.round(invWh * 0.85);
        }

        const consumedWh = battWh + loadWh + invWh;
        
        hourlyData[h] = { 
          energy_wh: energyWh, 
          peak_w: peakW,
          consumed_wh: consumedWh,
          battery_discharged_wh: battWh,
          load_wh: loadWh,
          inverter_wh: invWh
        };
        dailyTotalWh += energyWh;
        dailyConsumedWh += consumedWh;
        dailyBattWh += battWh;
        dailyLoadWh += loadWh;
        dailyInvWh += invWh;
        if (peakW > dailyPeakW) dailyPeakW = peakW;
      }
      
      const dailyKwh = parseFloat((dailyTotalWh / 1000).toFixed(2));
      const dailyConsumedKwh = parseFloat((dailyConsumedWh / 1000).toFixed(2));
      
      if (i < 30) {
        updates[`hourly/${dateStr}`] = hourlyData;
      }
      
      updates[`daily/${monthStr}/${dayStr}`] = {
        energy_kwh: dailyKwh,
        peak_w: dailyPeakW,
        consumed_kwh: dailyConsumedKwh,
        battery_discharged_kwh: parseFloat((dailyBattWh / 1000).toFixed(2)),
        load_kwh: parseFloat((dailyLoadWh / 1000).toFixed(2)),
        inverter_kwh: parseFloat((dailyInvWh / 1000).toFixed(2))
      };
      
      if (i < 7) weekTotal += dailyKwh;
      if (i < 30) monthTotal += dailyKwh;
      allTimeTotal += dailyKwh;
    }

    const todayHourly = updates[`hourly/${formatDateForInput(today)}`];
    const todayConsKwh = todayHourly ? Object.values(todayHourly).reduce((a, b) => a + (b.consumed_wh || 0), 0) / 1000 : 0;
    const todayBattKwh = todayHourly ? Object.values(todayHourly).reduce((a, b) => a + (b.battery_discharged_wh || 0), 0) / 1000 : 0;
    const todayLoadKwh = todayHourly ? Object.values(todayHourly).reduce((a, b) => a + (b.load_wh || 0), 0) / 1000 : 0;
    const todayInvKwh = todayHourly ? Object.values(todayHourly).reduce((a, b) => a + (b.inverter_wh || 0), 0) / 1000 : 0;

    updates['stats'] = {
      today_kwh: parseFloat((todayHourly ? Object.values(todayHourly).reduce((a, b) => a + (b.energy_wh || 0), 0) / 1000 : 0).toFixed(2)),
      today_consumed_kwh: parseFloat(todayConsKwh.toFixed(2)),
      today_battery_discharged_kwh: parseFloat(todayBattKwh.toFixed(2)),
      today_load_kwh: parseFloat(todayLoadKwh.toFixed(2)),
      today_inverter_kwh: parseFloat(todayInvKwh.toFixed(2)),
      week_kwh: parseFloat(weekTotal.toFixed(2)),
      month_kwh: parseFloat(monthTotal.toFixed(2)),
      alltime_kwh: parseFloat(allTimeTotal.toFixed(2))
    };

    const currentHour = today.getHours();
    let currentPower = 0;
    if (currentHour >= 6 && currentHour <= 18) {
      const distance = Math.abs(12 - currentHour);
      currentPower = 1000 * (1 - Math.pow(distance / 6, 2)) * (0.8 + Math.random() * 0.4);
    }
    
    updates['live'] = {
      solar: {
        watts: Math.round(currentPower * 10) / 10,
        volts: parseFloat((18.5 + (Math.random() - 0.5)).toFixed(1)),
        amps: currentPower > 0 ? parseFloat((currentPower / 18.5).toFixed(2)) : 0
      },
      battery: {
        watts: Math.round(currentPower * 0.6 * 10) / 10,
        volts: 12.6,
        amps: parseFloat(((currentPower * 0.6) / 12.6).toFixed(2))
      },
      load: {
        watts: 25.0,
        volts: 12.2,
        amps: 2.05
      },
      inverter: {
        watts: 220.0,
        volts: 230.0,
        amps: 0.96
      }
    };

    await database.ref().update(updates);
    
    btn.innerHTML = '<i class="fas fa-check"></i> Data Loaded';
    btn.style.background = 'var(--success)';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-database"></i> Load Demo Data';
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);

    loadDailyData();
    loadWeeklyData();
    loadMonthlyData();
    loadYearlyData();
    
  } catch (error) {
    console.error("Error loading demo data", error);
    btn.innerHTML = '<i class="fas fa-times"></i> Error';
    btn.style.background = 'var(--danger)';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-database"></i> Load Demo Data';
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);
  }
}

// ---------------- WI-FI CONFIGURATION ----------------

async function checkHotspotConnection() {
  const dot = document.getElementById('hotspotDot');
  const text = document.getElementById('hotspotStatusText');
  if (!dot || !text) return;

  dot.className = 'dot';
  text.textContent = 'Checking connection mode...';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    await fetch('http://192.168.4.1', {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    dot.className = 'dot connected';
    text.textContent = 'Solar_Setup Hotspot Detected (Setup Mode)';
  } catch (err) {
    clearTimeout(timeoutId);
    dot.className = 'dot connected';
    text.textContent = 'Normal Mode (ESP32 online via router)';
  }
}

function showWifiFeedback(msg, type) {
  const feedback = document.getElementById('wifiSubmitFeedback');
  if (!feedback) return;
  feedback.className = `wifi-feedback ${type}`;
  feedback.textContent = msg;
  feedback.style.display = 'block';
}

function setupWifiConfiguration() {
  const checkBtn = document.getElementById('btnCheckHotspot');
  if (checkBtn) {
    checkBtn.addEventListener('click', checkHotspotConnection);
  }

  const networkSelect = document.getElementById('wifiNetworkSelect');
  const customSsidWrapper = document.getElementById('customSsidWrapper');
  const ssidInput = document.getElementById('wifiSsidInput');
  const passInput = document.getElementById('wifiPassInput');
  const scanBtn = document.getElementById('btnScanWifi');
  const togglePassBtn = document.getElementById('btnToggleWifiPass');
  const togglePassIcon = document.getElementById('toggleWifiPassIcon');

  if (typeof database !== 'undefined') {
    database.ref('control/available_networks').on('value', (snapshot) => {
      const networks = snapshot.val();
      if (!networkSelect) return;
      const currentVal = networkSelect.value;
      networkSelect.innerHTML = '';

      const defOpt = document.createElement('option');
      defOpt.value = '';
      defOpt.textContent = 'Select available network...';
      networkSelect.appendChild(defOpt);

      if (Array.isArray(networks)) {
        networks.forEach(net => {
          if (!net || !net.ssid) return;
          const opt = document.createElement('option');
          opt.value = net.ssid;
          const rssiText = net.rssi ? ` (${net.rssi} dBm)` : '';
          opt.textContent = `${net.ssid}${rssiText}`;
          networkSelect.appendChild(opt);
        });
      }

      const customOpt = document.createElement('option');
      customOpt.value = '__custom__';
      customOpt.textContent = '+ Enter Hidden / Custom SSID';
      networkSelect.appendChild(customOpt);

      if (currentVal) networkSelect.value = currentVal;
    });
  }

  if (networkSelect) {
    networkSelect.addEventListener('change', () => {
      if (customSsidWrapper) {
        if (networkSelect.value === '__custom__') {
          customSsidWrapper.style.display = 'flex';
          if (ssidInput) ssidInput.focus();
        } else {
          customSsidWrapper.style.display = 'none';
        }
      }
    });
  }

  if (scanBtn) {
    scanBtn.addEventListener('click', async () => {
      scanBtn.disabled = true;
      scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      showWifiFeedback('Scanning nearby 2.4GHz Wi-Fi networks...', 'info');

      if (typeof database !== 'undefined') {
        try {
          await database.ref('control/scan_wifi').set(true);
        } catch (e) {
          // Firebase offline
        }
      }

      setTimeout(() => {
        scanBtn.disabled = false;
        scanBtn.innerHTML = '<i class="fas fa-satellite-dish"></i>';
      }, 4000);
    });
  }

  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', () => {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        if (togglePassIcon) togglePassIcon.className = 'fas fa-eye-slash';
      } else {
        passInput.type = 'password';
        if (togglePassIcon) togglePassIcon.className = 'fas fa-eye';
      }
    });
  }

  const resetBtn = document.getElementById('btnResetWifi');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const confirmed = confirm('Switch Wi-Fi network? The ESP32 will preserve all energy data and reboot into "Solar_Setup" hotspot mode in about 30 seconds.');
      if (!confirmed) return;

      resetBtn.disabled = true;
      resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Reset Signal...';

      try {
        await database.ref('control/reset_wifi').set(true);
        showWifiFeedback('Reset signal sent to ESP32. Energy data is preserved. In about 30 seconds, connect to "Solar_Setup" to pick your new network.', 'success');
      } catch (err) {
        showWifiFeedback('Failed to send reset signal. Check internet connection.', 'error');
      } finally {
        setTimeout(() => {
          resetBtn.disabled = false;
          resetBtn.innerHTML = '<i class="fas fa-undo"></i> Switch Wi-Fi Network (Reset Wi-Fi)';
        }, 5000);
      }
    });
  }

  const submitBtn = document.getElementById('btnSubmitWifiCredentials');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', async () => {
    let selectedSsid = '';
    if (networkSelect && networkSelect.value === '__custom__') {
      selectedSsid = ssidInput ? ssidInput.value.trim() : '';
    } else if (networkSelect && networkSelect.value) {
      selectedSsid = networkSelect.value;
    } else if (ssidInput) {
      selectedSsid = ssidInput.value.trim();
    }

    const pass = passInput ? passInput.value : '';

    if (!selectedSsid) {
      showWifiFeedback('Please select a Wi-Fi network or enter an SSID.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';

    try {
      const directUrl = `http://192.168.4.1/wifisave?s=${encodeURIComponent(selectedSsid)}&p=${encodeURIComponent(pass)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        await fetch(directUrl, {
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
      }

      if (typeof database !== 'undefined') {
        try {
          await database.ref('control/wifi_config').set({
            ssid: selectedSsid,
            pass: pass,
            apply: true,
            timestamp: Date.now()
          });
        } catch (dbErr) {
          // Firebase offline
        }
      }

      showWifiFeedback(`Connecting ESP32 to "${selectedSsid}". Energy data is preserved. Once connected, live telemetry will continue updating.`, 'success');
      if (passInput) passInput.value = '';
    } catch (error) {
      showWifiFeedback('Failed to transmit credentials. Check connection and try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Connect ESP32 to Selected Network';
    }
  });
}

// ---------------- BATTERY CONFIGURATION & STATE OF CHARGE ----------------

const BATTERY_CHEMISTRIES = {
  'lead-acid': {
    name: 'Lead-Acid / AGM / Gel (12V)',
    defaultMin: 10.5,
    defaultMax: 14.4,
    defaultAh: 100,
    curve: [
      [14.40, 100],
      [13.80, 95],
      [13.40, 85],
      [13.20, 75],
      [12.80, 65],
      [12.50, 50],
      [12.20, 35],
      [12.00, 20],
      [11.50, 10],
      [10.50, 0]
    ]
  },
  'lifepo4': {
    name: 'Lithium Iron Phosphate (LiFePO4 4S)',
    defaultMin: 10.0,
    defaultMax: 14.4,
    defaultAh: 100,
    curve: [
      [14.40, 100],
      [13.60, 95],
      [13.40, 85],
      [13.25, 75],
      [13.20, 70],
      [13.15, 60],
      [13.10, 50],
      [13.00, 35],
      [12.80, 20],
      [12.00, 10],
      [10.00, 0]
    ]
  },
  'li-ion-3s': {
    name: 'Lithium-Ion NMC (3S, 11.1V)',
    defaultMin: 9.0,
    defaultMax: 12.6,
    defaultAh: 50,
    curve: [
      [12.60, 100],
      [12.30, 90],
      [12.00, 80],
      [11.70, 70],
      [11.45, 60],
      [11.25, 50],
      [11.10, 40],
      [10.95, 30],
      [10.65, 20],
      [10.20, 10],
      [9.00, 0]
    ]
  },
  'li-ion-4s': {
    name: 'Lithium-Ion NMC (4S, 14.8V)',
    defaultMin: 12.0,
    defaultMax: 16.8,
    defaultAh: 50,
    curve: [
      [16.80, 100],
      [16.40, 90],
      [16.00, 80],
      [15.60, 70],
      [15.28, 60],
      [15.00, 50],
      [14.80, 40],
      [14.60, 30],
      [14.20, 20],
      [13.60, 10],
      [12.00, 0]
    ]
  },
  'custom': {
    name: 'Custom Voltage Range',
    defaultMin: 10.5,
    defaultMax: 14.4,
    defaultAh: 50,
    curve: null
  }
};

function getBatteryProfile() {
  try {
    const saved = localStorage.getItem('solar_battery_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.type === 'lead-acid' && parsed.maxVolt <= 13.0) {
        parsed.maxVolt = 14.4;
      }
      if (!parsed.capacityAh || isNaN(parsed.capacityAh)) {
        parsed.capacityAh = 100;
      }
      return parsed;
    }
  } catch (e) {
    // Local storage unavailable
  }
  return {
    type: 'lead-acid',
    multiplier: 1,
    minVolt: 10.5,
    maxVolt: 14.4,
    capacityAh: 100
  };
}

function saveBatteryProfile(profile) {
  try {
    localStorage.setItem('solar_battery_profile', JSON.stringify(profile));
  } catch (e) {
    // Local storage error
  }
}

let coulombState = null;

function getCoulombState(capacityAh) {
  if (coulombState && coulombState.capacityAh === capacityAh) {
    return coulombState;
  }
  try {
    const saved = localStorage.getItem('solar_coulomb_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.capacityAh === capacityAh && typeof parsed.remainingAh === 'number') {
        coulombState = parsed;
        return coulombState;
      }
    }
  } catch (e) {}

  coulombState = {
    remainingAh: capacityAh * 0.70,
    capacityAh: capacityAh,
    lastTime: Date.now()
  };
  return coulombState;
}

function saveCoulombState(s) {
  try {
    localStorage.setItem('solar_coulomb_state', JSON.stringify(s));
  } catch (e) {}
}

function calculateVoltageCurvePercentage(volts, profile) {
  const type = profile.type;
  const multiplier = Number(profile.multiplier) || 1;

  if (type === 'custom' || !BATTERY_CHEMISTRIES[type] || !BATTERY_CHEMISTRIES[type].curve) {
    const minV = Number(profile.minVolt) || (10.5 * multiplier);
    const maxV = Number(profile.maxVolt) || (14.4 * multiplier);
    if (volts <= minV) return 0;
    if (volts >= maxV) return 100;
    return Math.round(((volts - minV) / (maxV - minV)) * 100);
  }

  const baseCurve = BATTERY_CHEMISTRIES[type].curve;
  const scaledCurve = baseCurve.map(([v, p]) => [v * multiplier, p]);

  if (volts >= scaledCurve[0][0]) return 100;
  if (volts <= scaledCurve[scaledCurve.length - 1][0]) return 0;

  for (let i = 0; i < scaledCurve.length - 1; i++) {
    const [vHigh, pHigh] = scaledCurve[i];
    const [vLow, pLow] = scaledCurve[i + 1];

    if (volts <= vHigh && volts >= vLow) {
      const fraction = (volts - vLow) / (vHigh - vLow);
      const pct = pLow + fraction * (pHigh - pLow);
      return Math.round(pct);
    }
  }

  return 0;
}

function calculateBatteryPercentage(volts, amps) {
  if (volts <= 0 || isNaN(volts)) return 0;

  const profile = getBatteryProfile();
  const capacityAh = Number(profile.capacityAh) || 100;
  const multiplier = Number(profile.multiplier) || 1;
  const minV = (Number(profile.minVolt) || 10.5) * multiplier;
  const maxV = (Number(profile.maxVolt) || 14.4) * multiplier;

  const cState = getCoulombState(capacityAh);
  const now = Date.now();
  const dtHours = Math.min(Math.max((now - (cState.lastTime || now)) / 3600000, 0), 0.25);
  cState.lastTime = now;

  // Integrate current: positive amps = charging (adds Ah), negative amps = discharging (removes Ah)
  if (typeof amps === 'number' && !isNaN(amps) && dtHours > 0) {
    cState.remainingAh += (amps * dtHours);
  }

  // Auto-calibrate 100% when near max absorption voltage with low current (tail current)
  if (volts >= (maxV - 0.2 * multiplier) && amps >= 0 && amps < (capacityAh * 0.05)) {
    cState.remainingAh = capacityAh;
  }

  // Auto-calibrate 0% when hitting low cutoff voltage
  if (volts <= minV) {
    cState.remainingAh = 0;
  }

  cState.remainingAh = Math.max(0, Math.min(capacityAh, cState.remainingAh));
  saveCoulombState(cState);

  const soc = Math.round((cState.remainingAh / capacityAh) * 100);
  return Math.max(0, Math.min(100, soc));
}

function updateBatteryDisplay(batteryData) {
  const badge = document.getElementById('batteryPctBadge');
  const bar = document.getElementById('batteryBarFill');
  if (!badge || !bar || !batteryData) return;

  const volts = Number(batteryData.volts !== undefined ? batteryData.volts : (batteryData.voltage || 0));
  const amps = Number(batteryData.amps !== undefined ? batteryData.amps : (batteryData.current || 0));
  const pct = calculateBatteryPercentage(volts, amps);

  badge.textContent = `${pct}%`;
  bar.style.width = `${pct}%`;

  const levelClass = pct >= 60 ? 'high' : (pct >= 20 ? 'medium' : 'low');
  badge.className = `battery-pct-badge ${levelClass}`;
  bar.className = `battery-bar-fill ${levelClass}`;
}

function renderCurveChips(type, multiplier) {
  const container = document.getElementById('curveChips');
  if (!container) return;
  container.innerHTML = '';

  const minInput = document.getElementById('batteryMinVolt');
  const maxInput = document.getElementById('batteryMaxVolt');
  const minV = parseFloat(minInput ? minInput.value : 10.5) || (10.5 * multiplier);
  const maxV = parseFloat(maxInput ? maxInput.value : 14.4) || (14.4 * multiplier);

  if (type === 'custom' || !BATTERY_CHEMISTRIES[type] || !BATTERY_CHEMISTRIES[type].curve) {
    const steps = [100, 75, 50, 25, 0];
    steps.forEach(p => {
      const v = (minV + (maxV - minV) * (p / 100)).toFixed(1);
      const chip = document.createElement('span');
      chip.className = 'curve-chip';
      chip.textContent = `${p}%: ${v}V`;
      container.appendChild(chip);
    });
    return;
  }

  const curve = BATTERY_CHEMISTRIES[type].curve;
  curve.forEach(([v, p]) => {
    if (p === 100 || p === 95 || p === 75 || p === 50 || p === 20 || p === 0) {
      const scaledV = (v * multiplier).toFixed(1);
      const chip = document.createElement('span');
      chip.className = 'curve-chip';
      chip.textContent = `${p}%: ${scaledV}V`;
      container.appendChild(chip);
    }
  });
}

function setupBatteryConfiguration() {
  const typeSelect = document.getElementById('batteryTypeSelect');
  const multSelect = document.getElementById('systemVoltageSelect');
  const capacityInput = document.getElementById('batteryCapacityAh');
  const minInput = document.getElementById('batteryMinVolt');
  const maxInput = document.getElementById('batteryMaxVolt');
  const saveBtn = document.getElementById('btnSaveBatteryConfig');
  const feedback = document.getElementById('batterySaveFeedback');

  if (!typeSelect || !multSelect || !minInput || !maxInput) return;

  const profile = getBatteryProfile();
  typeSelect.value = profile.type;
  multSelect.value = String(profile.multiplier || 1);
  if (capacityInput) capacityInput.value = profile.capacityAh || 100;
  minInput.value = profile.minVolt;
  maxInput.value = profile.maxVolt;

  renderCurveChips(profile.type, Number(profile.multiplier || 1));

  const onCustomRangeChange = () => {
    typeSelect.value = 'custom';
    renderCurveChips('custom', Number(multSelect.value) || 1);
  };
  minInput.addEventListener('input', onCustomRangeChange);
  maxInput.addEventListener('input', onCustomRangeChange);

  typeSelect.addEventListener('change', () => {
    const selectedType = typeSelect.value;
    const mult = Number(multSelect.value) || 1;
    const chem = BATTERY_CHEMISTRIES[selectedType];
    if (chem && selectedType !== 'custom') {
      minInput.value = (chem.defaultMin * mult).toFixed(1);
      maxInput.value = (chem.defaultMax * mult).toFixed(1);
      if (capacityInput) capacityInput.value = chem.defaultAh || 100;
    }
    renderCurveChips(selectedType, mult);
  });

  multSelect.addEventListener('change', () => {
    const selectedType = typeSelect.value;
    const mult = Number(multSelect.value) || 1;
    const chem = BATTERY_CHEMISTRIES[selectedType];
    if (chem && selectedType !== 'custom') {
      minInput.value = (chem.defaultMin * mult).toFixed(1);
      maxInput.value = (chem.defaultMax * mult).toFixed(1);
    }
    renderCurveChips(selectedType, mult);
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const capAh = capacityInput ? (parseFloat(capacityInput.value) || 100) : 100;
      const newProfile = {
        type: typeSelect.value,
        multiplier: Number(multSelect.value) || 1,
        capacityAh: capAh,
        minVolt: parseFloat(minInput.value) || 10.5,
        maxVolt: parseFloat(maxInput.value) || 14.4
      };
      saveBatteryProfile(newProfile);

      // Re-initialize Coulomb state with the new capacity
      coulombState = {
        remainingAh: capAh * 0.70,
        capacityAh: capAh,
        lastTime: Date.now()
      };
      saveCoulombState(coulombState);

      if (feedback) {
        feedback.className = 'wifi-feedback success';
        feedback.textContent = `Battery profile saved: ${capAh} Ah capacity configured.`;
        feedback.style.display = 'block';
        setTimeout(() => {
          feedback.style.display = 'none';
        }, 3000);
      }

      const currentBatterySub = document.getElementById('chBatterySub');
      if (currentBatterySub) {
        const text = currentBatterySub.textContent;
        const match = text.match(/([\d.]+) V/);
        const aMatch = text.match(/([+-]?[\d.]+) A/);
        if (match) {
          updateBatteryDisplay({ 
            volts: parseFloat(match[1]),
            amps: aMatch ? parseFloat(aMatch[1]) : 0
          });
        }
      }
    });
  }
}
