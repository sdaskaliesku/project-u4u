import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-docs-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docs-list.component.html',
  styleUrls: ['./docs-list.component.scss']
})
export class DocsListComponent implements OnInit {
  pdfList: { filename: string; title: string }[] = [];
  selectedPdf: { filename: string; title: string } | null = null;
  safePdfUrl: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    fetch('/assets/docs-list.json')
      .then(res => res.json())
      .then((data: { filename: string; title: string }[]) => {
        this.pdfList = data;
        this.selectPdf(this.pdfList[0])
      });
  }

  selectPdf(pdf: { filename: string; title: string }) {
    this.selectedPdf = pdf;
    this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`/docs/${encodeURIComponent(pdf.filename)}`);
  }

  downloadPdf(pdf: { filename: string; title: string }) {
    const link = document.createElement('a');
    link.href = `/docs/${encodeURIComponent(pdf.filename)}`;
    link.download = pdf.filename;
    link.click();
  }
}
