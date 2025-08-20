import 'chartjs-adapter-date-fns';
import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import Chart, {ChartOptions} from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import {CommonModule} from '@angular/common';

type WeeklyJson = {
  as_of: string;
  cum_arrivals: { labels: string[]; series: Record<string, number[]> };
  weekly: {
    labels: string[];
    all_forms: { receipts: number[]; completions: number[] };
    i485: { receipts: number[]; completions: number[] };
    i765: { receipts: number[]; completions: number[] };
  };
};

Chart.register(annotationPlugin);

@Component({
  selector: 'app-weekly-trends',
  standalone: true,
  imports: [CommonModule, HttpClientModule], // add CommonModule here only if you still use *ngIf/*ngFor elsewhere
  templateUrl: './weekly-trends.component.html',
  styleUrls: ['./weekly-trends.component.scss']
})
export class WeeklyTrendsComponent implements AfterViewInit, OnInit {
  @ViewChild('cumCanvas') cumCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('allCanvas') allCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('i485Canvas') i485Canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('i765Canvas') i765Canvas!: ElementRef<HTMLCanvasElement>;

  loading = true;
  err?: string;
  data?: WeeklyJson;

  private viewReady = false;
  private dataReady = false;
  private cutoffISO = '2023-08-16';

  constructor(private http: HttpClient) {
  }

  ngOnInit(): void {
    this.http.get<WeeklyJson>('assets/uhp-weekly.json').subscribe({
      next: (json) => {
        this.data = json;
        this.dataReady = true;
        this.loading = false;
        this.drawAll();
      },
      error: (e) => {
        this.err = String(e);
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.drawAll();
  }

  private toDate(s: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);
    if (/^\d{4}-\d{2}$/.test(s)) {
      const [y, m] = s.split('-').map(Number);
      return new Date(y, m, 0); // end of month for YYYY-MM
    }
    return new Date(s);
  }

// NEW: pick the label with the smallest |date - cutoff|
  private labelNearestToCutoff(labels: string[]): string {
    const cutoff = new Date(this.cutoffISO).getTime();
    let best = labels[0];
    let bestDiff = Math.abs(this.toDate(best).getTime() - cutoff);
    for (const lab of labels) {
      const diff = Math.abs(this.toDate(lab).getTime() - cutoff);
      if (diff < bestDiff) {
        best = lab;
        bestDiff = diff;
      }
    }
    return best;
  }


// base options now accept an extra 'cutoffLabel' to place the line
  private baseLineOpts(title: string, cutoffLabel: string): ChartOptions<'line'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {position: 'bottom'},
        title: {display: true, text: title},
        annotation: {
          annotations: {
            cutoff: {
              type: 'line',
              xMin: '2023-08-16',
              xMax: '2023-08-16',
              borderWidth: 2,
              borderDash: [6, 6],
              borderColor: 'rgba(0,0,0,0.6)',
              label: {
                display: true,
                content: 'Aug 16, 2023',
                position: 'start',
                backgroundColor: 'rgba(255,255,255,0.8)',
                color: '#000',
                padding: 4
              }
            }
          }
        }
      },
      elements: {line: {tension: 0.25}},
      scales: {
        x: { type: 'time', time: { unit: 'month' } },
        y: { beginAtZero: true }
      }
    };
  }

  private drawAll() {
    if (!this.data) return;

    // 1) Cumulative
    const cumLabels = this.data.cum_arrivals.labels;
    const cumCut = this.labelNearestToCutoff(cumLabels);
    const cumSeries = Object.entries(this.data.cum_arrivals.series).map(([name, values]) => ({
      label: name, data: values
    }));
    new Chart(this.cumCanvas.nativeElement, {
      type: 'line',
      data: {labels: cumLabels, datasets: cumSeries},
      options: this.baseLineOpts('Cumulative Arrivals by Country', cumCut)
    });

    // 2) All Forms
    const wLabels = this.data.weekly.labels;
    const wCut = this.labelNearestToCutoff(wLabels);
    new Chart(this.allCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: wLabels,
        datasets: [
          {label: 'Receipts', data: this.data.weekly.all_forms.receipts},
          {label: 'Completions', data: this.data.weekly.all_forms.completions}
        ]
      },
      options: this.baseLineOpts('All Forms — Weekly', wCut)
    });

    // 3) I-485
    new Chart(this.i485Canvas.nativeElement, {
      type: 'line',
      data: {
        labels: wLabels,
        datasets: [
          {label: 'Receipts', data: this.data.weekly.i485.receipts},
          {label: 'Completions', data: this.data.weekly.i485.completions}
        ]
      },
      options: this.baseLineOpts('I-485 — Weekly', wCut)
    });

    // 4) I-765
    new Chart(this.i765Canvas.nativeElement, {
      type: 'line',
      data: {
        labels: wLabels,
        datasets: [
          {label: 'Receipts', data: this.data.weekly.i765.receipts},
          {label: 'Completions', data: this.data.weekly.i765.completions}
        ]
      },
      options: this.baseLineOpts('I-765 — Weekly', wCut)
    });
  }
}
