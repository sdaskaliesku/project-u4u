import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import Chart from 'chart.js/auto';
import {CommonModule} from '@angular/common';

type WeeklyJson = {
  as_of: string;
  cum_arrivals: { labels: string[]; series: Record<string, number[]> };
};

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
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
        labels: ['I-130', 'I-131', 'I-485', 'I-765', 'I-821'],
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
    // Parse dates. If label is YYYY-MM, use END of month; if YYYY-MM-DD, use exact.
    const toDate = (s: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);
      if (/^\d{4}-\d{2}$/.test(s)) {
        const [y, m] = s.split('-').map(Number);
        return new Date(y, m, 0); // last day of that month (m is 1-based here)
      }
      return new Date(s);
    };

    const cutoff = new Date(this.cutoffStr);
    const outStart = new Date(this.outStartStr);
    const labels = json.cum_arrivals.labels;
    const series = json.cum_arrivals.series;

    // Find U4U/Ukraine key
    const key = Object.keys(series).find(k => /ukrain|u4u/i.test(k));
    if (!key) {
      return { before: 0, total: 0, avgPerDay: 0, totalOutSince: 0 };
    }
    const arr = series[key];

    // Index at or before cutoff
    let cutoffIdx = -1;
    for (let i = 0; i < labels.length; i++) {
      if (toDate(labels[i]) <= cutoff) cutoffIdx = i; else break;
    }
    if (cutoffIdx < 0) cutoffIdx = 0;

    const lastIdx = Math.min(arr.length - 1, labels.length - 1);
    const lastDate = toDate(labels[lastIdx]);

    const before = arr[cutoffIdx] ?? 0;
    const total  = arr[lastIdx] ?? 0;
    const after  = Math.max(0, total - before);

    // #1 Average out-of-parole per day (average arrivals after cutoff per day)
    const daysFromCutoff = Math.max(1, Math.floor((+lastDate - +cutoff) / 86400000));
    const avgPerDay = after / daysFromCutoff;

    // #2 Total out-of-parole since Aug 16, 2025: avgPerDay * days since 2025-08-16 to today
    const now = new Date();
    const daysSinceOutStart = Math.max(0, Math.floor((+now - +outStart) / 86400000));
    const totalOutSince = avgPerDay * daysSinceOutStart;

    return { before, total, avgPerDay, totalOutSince };
  }
}
