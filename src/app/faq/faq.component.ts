import { Component, OnInit } from '@angular/core';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-faq',
  imports: [CommonModule, HttpClientModule],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {
  translations: any = {};
  lang: 'en' | 'uk' = 'en';

  faqItems = [
    { q: 'faqQ1', a: 'faqA1' },
    { q: 'faqQ2', a: 'faqA2' },
  ];
  expanded: boolean[] = [false, false, false];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get('/assets/faq-translations.json').subscribe(trans => {
      this.translations = trans;
    });
  }

  setLang(lang: 'en' | 'uk') {
    this.lang = lang;
  }

  t(key: string): string {
    return this.translations?.[this.lang]?.[key] || '';
  }

  toggle(idx: number) {
    this.expanded[idx] = !this.expanded[idx];
  }

  expandAll() {
    this.expanded = this.faqItems.map(() => true);
  }

  collapseAll() {
    this.expanded = this.faqItems.map(() => false);
  }
}
