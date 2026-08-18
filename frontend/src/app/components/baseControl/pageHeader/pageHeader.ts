import { Component, Input } from '@angular/core';

/**
 * Title + subtitle + action slot, shared by every dashboard sub-page.
 */
@Component({
  selector: 'tf-page-header',
  templateUrl: './pageHeader.html',
})
export class BasePageHeader {
  @Input() title = '';
  @Input() subtitle?: string;
}
