import { Component, Input } from '@angular/core';

/**
 * The "nothing here yet" block, shared by every list in the app.
 *
 * Flat treatment: a muted colour block with the icon in a solid white circle,
 * rather than a dashed outline or a faded illustration.
 */
@Component({
  selector: 'tf-empty-state',
  templateUrl: './emptyState.html',
})
export class BaseEmptyState {
  @Input() icon = 'inbox';
  @Input() title = 'Chưa có dữ liệu';
  @Input() description?: string;
}
