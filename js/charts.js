// js/charts.js

// Global chart instances
let dailyChartInstance = null;
let weeklyChartInstance = null;
let monthlyChartInstance = null;
let yearlyChartInstance = null;

// Chart defaults for dark theme
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(20, 24, 50, 0.9)',
      titleColor: '#FFB800',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      displayColors: false
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        maxRotation: 0
      }
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)',
        drawBorder: false
      },
      beginAtZero: true
    }
  },
  interaction: {
    mode: 'index',
    intersect: false,
  }
};

function initDailyChart(ctx) {
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, '#FFB800');
  gradient.addColorStop(1, '#FF6B35');

  dailyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [], // Hours 0-23
      datasets: [
        {
          type: 'line',
          label: 'Trend',
          data: [],
          borderColor: '#FFD700',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0
        },
        {
          type: 'bar',
          label: 'Energy (Wh)',
          data: [],
          backgroundColor: gradient,
          borderRadius: 4,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        tooltip: {
          ...commonOptions.plugins.tooltip,
          callbacks: {
            title: (items) => `${items[0].label}`,
            label: (context) => {
              if (context.dataset.type === 'line') return null;
              return `${context.raw} Wh`;
            }
          }
        }
      }
    }
  });
}

function formatHour12(hour) {
  if (hour === 0) return '12AM';
  if (hour === 12) return '12PM';
  if (hour < 12) return hour + 'AM';
  return (hour - 12) + 'PM';
}

function updateDailyChart(hourlyData) {
  if (!dailyChartInstance) return;
  
  const labels = [];
  const data = [];
  
  // Create 24 hour array with 12-hour AM/PM labels
  for (let i = 0; i < 24; i++) {
    labels.push(formatHour12(i));
    if (hourlyData && hourlyData[i]) {
      data.push(hourlyData[i].energy_wh || 0);
    } else {
      data.push(0);
    }
  }

  dailyChartInstance.data.labels = labels;
  dailyChartInstance.data.datasets[0].data = data; // Line
  dailyChartInstance.data.datasets[1].data = data; // Bar
  dailyChartInstance.update();
}

function initMonthlyChart(ctx) {
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, '#FF6B35');
  gradient.addColorStop(1, '#FFB800');

  monthlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [], 
      datasets: [
        {
          type: 'line',
          label: 'Trend',
          data: [],
          borderColor: '#FFD700',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0
        },
        {
          type: 'bar',
          label: 'Energy (kWh)',
          data: [],
          backgroundColor: gradient,
          borderRadius: 4,
          barPercentage: 0.7
        }
      ]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        tooltip: {
          ...commonOptions.plugins.tooltip,
          callbacks: {
            title: (items) => `Day ${items[0].label}`,
            label: (context) => {
              if (context.dataset.type === 'line') return null;
              return `${context.raw.toFixed(2)} kWh`;
            }
          }
        }
      }
    }
  });
}

function updateMonthlyChart(dailyData, daysInMonth) {
  if (!monthlyChartInstance) return;
  
  const labels = [];
  const data = [];
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dayStr = i.toString().padStart(2, '0');
    labels.push(i.toString());
    
    if (dailyData && dailyData[dayStr]) {
      data.push(dailyData[dayStr].energy_kwh || 0);
    } else {
      data.push(0);
    }
  }

  monthlyChartInstance.data.labels = labels;
  monthlyChartInstance.data.datasets[0].data = data; // Line
  monthlyChartInstance.data.datasets[1].data = data; // Bar
  monthlyChartInstance.update();
}

function initWeeklyChart(ctx) {
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, '#FFB800');
  gradient.addColorStop(1, '#FF6B35');

  weeklyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          type: 'line',
          label: 'Trend',
          data: [],
          borderColor: '#FFD700',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0
        },
        {
          type: 'bar',
          label: 'Energy (kWh)',
          data: [],
          backgroundColor: gradient,
          borderRadius: 4,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        tooltip: {
          ...commonOptions.plugins.tooltip,
          callbacks: {
            title: (items) => `${items[0].label}`,
            label: (context) => {
              if (context.dataset.type === 'line') return null;
              return `${Number(context.raw).toFixed(2)} kWh`;
            }
          }
        }
      }
    }
  });
}

function updateWeeklyChart(daysData, labels) {
  if (!weeklyChartInstance) return;
  weeklyChartInstance.data.labels = labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  weeklyChartInstance.data.datasets[0].data = daysData;
  weeklyChartInstance.data.datasets[1].data = daysData;
  weeklyChartInstance.update();
}

function initYearlyChart(ctx) {
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, '#FF6B35');
  gradient.addColorStop(1, '#FFB800');

  yearlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        {
          type: 'line',
          label: 'Trend',
          data: [],
          borderColor: '#FFD700',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0
        },
        {
          type: 'bar',
          label: 'Energy (kWh)',
          data: [],
          backgroundColor: gradient,
          borderRadius: 4,
          barPercentage: 0.65
        }
      ]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        tooltip: {
          ...commonOptions.plugins.tooltip,
          callbacks: {
            title: (items) => `${items[0].label}`,
            label: (context) => {
              if (context.dataset.type === 'line') return null;
              return `${Number(context.raw).toFixed(1)} kWh`;
            }
          }
        }
      }
    }
  });
}

function updateYearlyChart(monthsData) {
  if (!yearlyChartInstance) return;
  yearlyChartInstance.data.datasets[0].data = monthsData;
  yearlyChartInstance.data.datasets[1].data = monthsData;
  yearlyChartInstance.update();
}

window.charts = {
  initDailyChart,
  updateDailyChart,
  initWeeklyChart,
  updateWeeklyChart,
  initMonthlyChart,
  updateMonthlyChart,
  initYearlyChart,
  updateYearlyChart
};
