import { Component, Input } from '@angular/core';

/**
 * Loading indicator built from a border ring — flat, no glow, no shadow.
 */
@Component({
    selector: 'tf-spinner',
    templateUrl: './spinner.html',
    standalone: false
})
export class BaseSpinner {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() tone: 'primary' | 'white' = 'primary';
  @Input() label?: string;
}
