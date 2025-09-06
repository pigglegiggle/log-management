'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, BarElement, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useMemo } from 'react';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

export function TopIPChart({ logs = [] }) {
  const data = useMemo(() => {
    const ipCounts = {};
    logs.forEach(log => {
      if (log.src_ip) {
        ipCounts[log.src_ip] = (ipCounts[log.src_ip] || 0) + 1;
      }
    });

    const sorted = Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      labels: sorted.map(([ip]) => ip),
      datasets: [
        {
          label: 'จำนวน Events',
          data: sorted.map(([, count]) => count),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [logs]);

  return (
    <div className="h-80">
      <Bar data={data} options={{...chartOptions, plugins: {...chartOptions.plugins, title: {display: true, text: 'Top 10 Source IPs'}}}} />
    </div>
  );
}

export function TopUserChart({ logs = [] }) {
  const data = useMemo(() => {
    const userCounts = {};
    logs.forEach(log => {
      if (log.user) {
        userCounts[log.user] = (userCounts[log.user] || 0) + 1;
      }
    });

    const sorted = Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      labels: sorted.map(([user]) => user),
      datasets: [
        {
          label: 'จำนวน Events',
          data: sorted.map(([, count]) => count),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [logs]);

  return (
    <div className="h-80">
      <Bar data={data} options={{...chartOptions, plugins: {...chartOptions.plugins, title: {display: true, text: 'Top 10 Users'}}}} />
    </div>
  );
}

export function TopEventTypeChart({ logs = [] }) {
  const data = useMemo(() => {
    const eventCounts = {};
    logs.forEach(log => {
      // ไม่นับ logs ที่มี source เป็น network หรือ firewall และ event_type เป็น null/undefined
      if ((log.source === 'network' || log.source === 'firewall') && !log.event_type) {
        return; // ข้าม log นี้
      }
      
      const eventType = log.event_type || 'Unknown';
      eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
    });

    const sorted = Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);

    return {
      labels: sorted.map(([event]) => event),
      datasets: [
        {
          data: sorted.map(([, count]) => count),
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(147, 51, 234, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(14, 165, 233, 0.8)',
            'rgba(99, 102, 241, 0.8)',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [logs]);

  return (
    <div className="h-80">
      <Doughnut data={data} options={{responsive: true, maintainAspectRatio: false, plugins: {title: {display: true, text: 'Top Event Types'}, legend: {position: 'right'}}}} />
    </div>
  );
}

export function TimelineChart({ logs = [] }) {
  const data = useMemo(() => {
    const hourCounts = {};
    
    logs.forEach(log => {
      if (log.timestamp) {
        const date = new Date(log.timestamp);
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    const hours = Array.from({length: 24}, (_, i) => i);
    
    return {
      labels: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
      datasets: [
        {
          label: 'จำนวน Events',
          data: hours.map(h => hourCounts[h] || 0),
          borderColor: 'rgba(168, 85, 247, 1)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [logs]);

  return (
    <div className="h-80">
      <Line data={data} options={{...chartOptions, plugins: {...chartOptions.plugins, title: {display: true, text: 'Timeline (24 Hours)'}}}} />
    </div>
  );
}
