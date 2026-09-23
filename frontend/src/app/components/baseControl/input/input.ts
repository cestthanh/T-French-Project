import { Directive, HostBinding, Input } from '@angular/core';

/**
 * Flat input: Gray 100 fill, no border at rest, hard Primary border on focus.
 *
 * The transparent border is always present rather than added on focus — a
 * border that appears from nothing would shift the layout by 2px every time
 * the field is focused.
 */
@Directive({
    selector: 'input[tfInput], textarea[tfInput], select[tfInput]',
    standalone: false
})
export class BaseInput {
  /** Renders the error state: danger fill and border. */
  @Input() invalid = false;

  @HostBinding('class')
  get classes(): string {
    return [
      'w-full rounded-md border-2 border-transparent bg-muted px-4 py-3',
      'text-ink placeholder:text-ink-muted',
      'transition-all duration-200',
      'focus:border-primary focus:bg-white focus:outline-none focus:ring-0',
      'disabled:cursor-not-allowed disabled:opacity-50',
      this.invalid ? 'border-danger bg-danger-soft' : '',
    ].join(' ');
  }
}
