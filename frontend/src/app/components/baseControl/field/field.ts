import { Component, Input } from '@angular/core';

/**
 * Label + control + hint/error wrapper.
 *
 * Replaces `<mat-form-field>`: same job, none of the floating-label chrome the
 * flat design system rejects. Labels are static, uppercase, and above the field.
 */
@Component({
    selector: 'tf-field',
    templateUrl: './field.html',
    standalone: false
})
export class BaseField {
  @Input() label?: string;
  @Input() hint?: string;
  @Input() error?: string | null;
  @Input() required = false;
  /** Forwarded to the label's `for` attribute. */
  @Input() for?: string;
}
