import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChartsComponent } from './charts/charts.component';
import { WeeklyTrendsComponent } from './weekly-trends/weekly-trends.component';

export const routes: Routes = [
  { path: '', component: ChartsComponent },          // existing bar chart
  { path: 'trends', component: WeeklyTrendsComponent } // new trends page
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
