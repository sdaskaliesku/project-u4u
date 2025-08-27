import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChartsComponent } from './charts/charts.component';
import { DocsListComponent } from './docs-list/docs-list.component';
import { FaqComponent } from './faq/faq.component';

export const routes: Routes = [
  { path: '', component: ChartsComponent },
  { path: 'docs', component: DocsListComponent },
  { path: 'faq', component: FaqComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
