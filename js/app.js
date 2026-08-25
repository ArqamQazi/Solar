// js/app.js

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// App State
const state = {
  currentDate: new Date(),
  currentMonth: new Date()
};

function initApp() {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered!', reg))
      .catch(err => console.error('SW registration failed', err));
  }

  // Setup Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active nav
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      
      // Show corresponding view
      const targetId = item.getAttribute('data-target');
      views.forEach(v => v.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');
      
      // Trigger resize on charts to fix rendering issues when tab was hidden
      if (targetId === 'view-daily') {
        window.dispatchEvent(new Event('resize'));
        loadDailyData();
      } else if (targetId === 'view-monthly') {
        window.dispatchEvent(new Event('resize'));
        loadMonthlyData();
      }
    });
  });

  // Initialize Charts
  const dailyCanvas = document.getElementById('dailyChart');
  if (dailyCanvas) window.charts.initDailyChart(dailyCanvas);
  
  const monthlyCanvas = document.getElementById('monthlyChart');
  if (monthlyCanvas) window.charts.initMonthlyChart(monthlyCanvas);

  // Setup Date Pickers
  setupDatePickers();

  // Setup Demo Data Button
  document.getElementById('btnLoadDemoData').addEventListener('click', loadDemoData);

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

function setupDatePickers() {
  const datePicker = document.getElementById('datePicker');
  datePicker.value = formatDateForInput(state.currentDate);
  
  datePicker.addEventListener('change', (e) => {
    state.currentDate = new Date(e.target.value);
    loadDailyData();
  });
  
  document.getElementById('prevDayBtn').addEventListener('click', () => {
    state.currentDate.setDate(state.currentDate.getDate() - 1);
    datePicker.value = formatDateForInput(state.currentDate);
    loadDailyData();
  });
  
  document.getElementById('nextDayBtn').addEventListener('click', () => {
    state.currentDate.setDate(state.currentDate.getDate() + 1);
    datePicker.value = formatDateForInput(state.currentDate);
    loadDailyData();
  });

  const monthPicker = document.getElementById('monthPicker');
  monthPicker.value = formatMonthForInput(state.currentMonth);
  
  monthPicker.addEventListener('change', (e) => {
    state.currentMonth = new Date(e.target.value + '-01');
    loadMonthlyData();
  });
  
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
    monthPicker.value = formatMonthForInput(state.currentMonth);
    loadMonthlyData();
  });
  
  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
    monthPicker.value = formatMonthForInput(state.currentMonth);
    loadMonthlyData();
  });
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

  const powerElem = document.getElementById('livePower');
  animateValue(powerElem, lastPower, data.power, 500, 1);
  lastPower = data.power;

  document.getElementById('liveVoltage').textContent = `${data.voltage.toFixed(1)} V`;
  document.getElementById('liveCurrent').textContent = `${data.current.toFixed(1)} A`;

  const statusBadge = document.getElementById('systemStatus');
  if (data.power > 10) {
    statusBadge.innerHTML = '<i class="fas fa-sun"></i> Generating';
    statusBadge.style.color = 'var(--accent-primary)';
    statusBadge.style.background = 'rgba(255, 184, 0, 0.15)';
  } else {
    statusBadge.innerHTML = '<i class="fas fa-moon"></i> Standby';
    statusBadge.style.color = 'var(--text-secondary)';
    statusBadge.style.background = 'rgba(255, 255, 255, 0.1)';
  }
}

function updateStats(data) {
  document.getElementById('statToday').textContent = data.today_kwh.toFixed(1);
  document.getElementById('statWeek').textContent = data.week_kwh.toFixed(1);
  document.getElementById('statMonth').textContent = data.month_kwh.toFixed(1);
  document.getElementById('statAllTime').textContent = data.alltime_kwh.toFixed(1);
}

function loadDailyData() {
  const dateStr = formatDateForInput(state.currentDate); // YYYY-MM-DD
  
  database.ref(`hourly/${dateStr}`).once('value').then((snapshot) => {
    const data = snapshot.val();
    window.charts.updateDailyChart(data);
    
    // Calculate totals
    let totalWh = 0;
    let peakW = 0;
    if (data) {
      Object.values(data).forEach(hour => {
        totalWh += hour.energy_wh || 0;
        if ((hour.peak_w || 0) > peakW) peakW = hour.peak_w;
      });
    }
    
    document.getElementById('dailyTotal').innerHTML = `${(totalWh/1000).toFixed(2)} <small>kWh</small>`;
    document.getElementById('dailyPeak').innerHTML = `${peakW} <small>W</small>`;
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
    if (data) {
      Object.values(data).forEach(day => {
        totalKwh += day.energy_kwh || 0;
        count++;
      });
    }
    
    const avg = count > 0 ? totalKwh / count : 0;
    
    document.getElementById('monthlyTotal').innerHTML = `${totalKwh.toFixed(1)} <small>kWh</small>`;
    document.getElementById('monthlyAvg').innerHTML = `${avg.toFixed(2)} <small>kWh</small>`;
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
    let allTimeTotal = 1200.5;

    // Generate 30 days of data
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      
      const dateStr = formatDateForInput(d);
      const monthStr = formatMonthForInput(d);
      const dayStr = String(d.getDate()).padStart(2, '0');
      
      // Simulate bell curve for day (peak at noon)
      let dailyTotalWh = 0;
      let dailyPeakW = 0;
      const hourlyData = {};
      
      // Random cloud cover factor for the day (0.5 to 1.2)
      const weatherFactor = 0.5 + (Math.random() * 0.7);

      for (let h = 0; h < 24; h++) {
        let energyWh = 0;
        let peakW = 0;
        
        // Sun is up roughly 6am to 6pm
        if (h >= 6 && h <= 18) {
          // Parabola peaking at hour 12
          const distance = Math.abs(12 - h);
          const maxPower = 1000 * weatherFactor; // Up to ~1000W
          const power = Math.max(0, maxPower * (1 - Math.pow(distance / 6, 2)));
          
          // Add some randomness per hour
          energyWh = Math.round(power * (0.8 + Math.random() * 0.4));
          peakW = Math.round(energyWh * 1.2);
        }
        
        hourlyData[h] = { energy_wh: energyWh, peak_w: peakW };
        dailyTotalWh += energyWh;
        if (peakW > dailyPeakW) dailyPeakW = peakW;
      }
      
      const dailyKwh = parseFloat((dailyTotalWh / 1000).toFixed(2));
      
      // Set Hourly
      updates[`hourly/${dateStr}`] = hourlyData;
      
      // Set Daily
      updates[`daily/${monthStr}/${dayStr}`] = {
        energy_kwh: dailyKwh,
        peak_w: dailyPeakW
      };
      
      if (i < 30) monthTotal += dailyKwh;
      allTimeTotal += dailyKwh;
    }

    // Set Stats
    updates['stats'] = {
      today_kwh: parseFloat((updates[`hourly/${formatDateForInput(today)}`] ? Object.values(updates[`hourly/${formatDateForInput(today)}`]).reduce((a,b)=>a+(b.energy_wh||0),0)/1000 : 0).toFixed(2)),
      week_kwh: parseFloat((monthTotal * (7/30)).toFixed(2)), // rough est
      month_kwh: parseFloat(monthTotal.toFixed(2)),
      alltime_kwh: parseFloat(allTimeTotal.toFixed(2))
    };

    // Set Live (simulate current time)
    const currentHour = today.getHours();
    let currentPower = 0;
    if (currentHour >= 6 && currentHour <= 18) {
      const distance = Math.abs(12 - currentHour);
      currentPower = 1000 * (1 - Math.pow(distance / 6, 2)) * (0.8 + Math.random() * 0.4);
    }
    
    updates['live'] = {
      power: Math.round(currentPower * 10) / 10,
      voltage: 24.5 + (Math.random() - 0.5),
      current: currentPower > 0 ? (currentPower / 24.5) : 0,
      timestamp: Date.now()
    };

    // Write to Firebase
    await database.ref().update(updates);
    
    btn.innerHTML = '<i class="fas fa-check"></i> Data Loaded';
    btn.style.background = 'var(--success)';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-database"></i> Load Demo Data';
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);

    // Refresh charts
    loadDailyData();
    loadMonthlyData();
    
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
