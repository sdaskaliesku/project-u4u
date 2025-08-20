import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import Chart, { ChartOptions } from 'chart.js/auto';
import {CommonModule} from '@angular/common';

type WeeklyJson = {
  as_of: string;
  cum_arrivals: { labels: string[]; series: Record<string, number[]> };
  weekly: {
    labels: string[];
    all_forms: { receipts: number[]; completions: number[] };
    i485:      { receipts: number[]; completions: number[] };
    i765:      { receipts: number[]; completions: number[] };
  };
};

@Component({
  selector: 'app-weekly-trends',
  standalone: true,
  imports: [CommonModule, HttpClientModule], // add CommonModule here only if you still use *ngIf/*ngFor elsewhere
  templateUrl: './weekly-trends.component.html',
  styleUrls: ['./weekly-trends.component.scss']
})
export class WeeklyTrendsComponent implements AfterViewInit {
  @ViewChild('cumCanvas') cumCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('allCanvas') allCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('i485Canvas') i485Canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('i765Canvas') i765Canvas!: ElementRef<HTMLCanvasElement>;

  loading = true;
  err?: string;
  data?: WeeklyJson;

  private viewReady = false;
  private dataReady = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<WeeklyJson>('assets/uhp-weekly.json').subscribe({
      next: (json) => {
        this.data = json;
        this.dataReady = true;
        this.loading = false;
        this.maybeDraw();
      },
      error: (e) => {
        this.err = String(e);
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.maybeDraw();
  }

  private maybeDraw() {
    if (!this.viewReady || !this.dataReady || !this.data) return;
    // guard refs exist
    if (!this.cumCanvas || !this.allCanvas || !this.i485Canvas || !this.i765Canvas) return;

    // 1) Cumulative Arrivals
    const cumLabels = this.data.cum_arrivals.labels;
    const cumSeries = Object.entries(this.data.cum_arrivals.series).map(([name, values]) => ({
      label: name, data: values
    }));

    new Chart(this.cumCanvas.nativeElement, {
      type: 'line',
      data: { labels: cumLabels, datasets: cumSeries },
      options: this.baseLineOpts('Cumulative Arrivals by Country')
    });

    // 2) All Forms
    new Chart(this.allCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: this.data.weekly.labels,
        datasets: [
          { label: 'Receipts', data: this.data.weekly.all_forms.receipts },
          { label: 'Completions', data: this.data.weekly.all_forms.completions }
        ]
      },
      options: this.baseLineOpts('All Forms — Weekly')
    });

    // 3) I-485
    new Chart(this.i485Canvas.nativeElement, {
      type: 'line',
      data: {
        labels: this.data.weekly.labels,
        datasets: [
          { label: 'Receipts', data: this.data.weekly.i485.receipts },
          { label: 'Completions', data: this.data.weekly.i485.completions }
        ]
      },
      options: this.baseLineOpts('I-485 — Weekly')
    });

    // 4) I-765
    new Chart(this.i765Canvas.nativeElement, {
      type: 'line',
      data: {
        labels: this.data.weekly.labels,
        datasets: [
          { label: 'Receipts', data: this.data.weekly.i765.receipts },
          { label: 'Completions', data: this.data.weekly.i765.completions }
        ]
      },
      options: this.baseLineOpts('I-765 — Weekly')
    });
  }

  private baseLineOpts(title: string): ChartOptions<'line'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' }, title: { display: true, text: title } },
      elements: { line: { tension: 0.25 } },
      scales: { x: { ticks: { maxRotation: 0, autoSkip: true } }, y: { beginAtZero: true } }
    };
  }
}
