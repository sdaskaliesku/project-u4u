import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import Chart from 'chart.js/auto';
import {CommonModule} from '@angular/common';
import {WeeklyTrendsComponent} from '../weekly-trends/weekly-trends.component';

type WeeklyJson = {
  as_of: string;
  cum_arrivals: { labels: string[]; series: Record<string, number[]> };
};

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule, HttpClientModule, WeeklyTrendsComponent],
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.scss']
})
export class ChartsComponent implements AfterViewInit {
  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;

  // U4U counters
  readonly cutoffStr = '2023-08-16';
  readonly outStartStr = '2025-08-16'; // arrivals become out-of-parole after 2y-1d → start counting here

  beforeCount: number | null = null;   // U4U cumulative on/before cutoff
  afterCount: number | null = null;    // U4U cumulative after cutoff (latest - before)
  totalCount: number | null = null;    // U4U latest cumulative

  avgOutPerDay: number | null = null;  // #1 Average out-of-parole per day (arrivals_after / days from cutoff to latest)
  totalOutSinceAug162025: number | null = null; // #2 avgOutPerDay * days since 2025-08-16

  constructor(private http: HttpClient) {}

  ngAfterViewInit() {
    // Load cumulative arrivals to compute U4U-only counters
    this.http.get<WeeklyJson>('assets/uhp-weekly.json').subscribe({
      next: (json) => {
        const { before, total, avgPerDay, totalOutSince } = this.computeU4UStats(json);
        this.beforeCount = before;
        this.totalCount  = total;
        this.afterCount  = total - before;
        this.avgOutPerDay = avgPerDay;
        this.totalOutSinceAug162025 = totalOutSince;
      },
      error: () => { /* leave tiles as — */ }
    });

    // Your existing bar chart (unchanged)
    new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['I-130 (Alien relative)', 'I-131 (Re-parole/Travel doc, etc)', 'I-485 (AOS)', 'I-765 (EAD)', 'I-821 (TPS)'],
        datasets: [
          { label: 'Receipts', data: [8391, 127833, 7963, 389595, 178292] },
          { label: 'Approvals', data: [4948, 8886, 4043, 326002, 85100] },
          { label: 'Pending',   data: [3346, 116863, 3256, 56136, 90967] },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'UHP Snapshot' } }
      }
    });
  }

  private computeU4UStats(json: WeeklyJson) {
    // Parse YYYY-MM or YYYY-MM-DD to Date
    const toDate = (s: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);
      if (/^\d{4}-\d{2}$/.test(s)) {
        const [y, m] = s.split('-').map(Number);
        return new Date(y, m, 0); // last day of month
      }
      return new Date(s);
    };

    const cutoff   = new Date('2023-08-16');  // exact date
    const outStart = new Date('2025-08-16');

    const labels = json.cum_arrivals.labels;
    const series = json.cum_arrivals.series;
    const key = Object.keys(series).find(k => /ukrain|u4u/i.test(k));
    if (!key) return { before: 0, total: 0, avgPerDay: 0, totalOutSince: 0 };

    const arr = series[key];
    const dates = labels.map(toDate);

    // --- linear interpolation y(cutoff) between [i, i+1] such that date[i] <= cutoff < date[i+1]
    let i = 0;
    while (i + 1 < dates.length && !(dates[i] <= cutoff && cutoff < dates[i + 1])) i++;
    if (i + 1 >= dates.length) i = Math.max(0, dates.length - 2); // clamp if cutoff is after last point

    const d0 = +dates[i],     d1 = +dates[i + 1];
    const y0 = arr[i] ?? 0,   y1 = arr[i + 1] ?? y0;
    const t  = d1 === d0 ? 0 : (+cutoff - d0) / (d1 - d0);   // 0..1
    const beforeExact = y0 + t * (y1 - y0);                  // <- ~160,447 for your data

    // latest total (last point)
    const lastIdx = Math.min(arr.length - 1, labels.length - 1);
    const total   = arr[lastIdx] ?? 0;
    const lastDate = dates[lastIdx];

    const before = Math.round(beforeExact);
    const after  = Math.max(0, Math.round(total - before));

    // average per day (simple average over period cutoff..latest)
    const daysFromCutoff = Math.max(1, Math.floor((+lastDate - +cutoff) / 86400000));
    const avgPerDay = after / daysFromCutoff;

    // total since 2025-08-16
    const now = new Date();
    const daysSinceOutStart = Math.max(0, Math.floor((+now - +outStart) / 86400000));
    const totalOutSince = avgPerDay * daysSinceOutStart;

    return { before, total, avgPerDay, totalOutSince };
  }

}
