import { Component, Input } from '@angular/core';

export type StatTone = 'primary' | 'secondary' | 'accent' | 'danger' | 'dark';

/**
 * A single statistic. Used by the landing hero, the dashboard and the admin panel.
 *
 * Each instance picks its own accent — the spec's "multi-colour stat numbers"
 * is what carries the visual interest here, since there is no card depth to use.
 */
@Component({
    selector: 'tf-stat',
    templateUrl: './stat.html',
    standalone: false
})
export class BaseStat {
  @Input() icon = 'sparkles';
  @Input() value: string | number = 0;
  @Input() label = '';
  @Input() tone: StatTone = 'primary';
  @Input() variant: 'block' | 'plain' = 'block';
  /** Shows a red dot when the value is above zero (pending work). */
  @Input() urgent = false;

  readonly chip: Record<StatTone, string> = {
    primary: 'bg-primary-soft text-primary',
    secondary: 'bg-secondary-soft text-secondary',
    accent: 'bg-accent-soft text-accent-dark',
    danger: 'bg-danger-soft text-danger',
    dark: 'bg-muted text-ink',
  };

  readonly text: Record<StatTone, string> = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent-dark',
    danger: 'text-danger',
    dark: 'text-ink',
  };
}
