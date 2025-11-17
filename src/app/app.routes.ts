import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginPageComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'levels',
    loadComponent: () => import('./components/common/levels-table/levels-table.component').then(m => m.LevelsTableComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'lessons',
    loadComponent: () => import('./components/lessons/lessons.component').then(m => m.LessonsComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'main-activities',
    loadComponent: () => import('./components/common/main-activities-table/main-activities-table.component').then(m => m.MainActivitiesTableComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'activity-types',
    loadComponent: () => import('./components/common/activity-types-table/activity-types-table.component').then(m => m.ActivityTypesTableComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'activities',
    loadComponent: () => import('./pages/activities-list/activities-list.component').then(m => m.ActivitiesListPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'activity-edit',
    loadComponent: () => import('./pages/activity-editor/activity-editor.component').then(m => m.ActivityEditorPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'exercises',
    loadComponent: () => import('./pages/exercises-list/exercises-list.component').then(m => m.ExercisesListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];