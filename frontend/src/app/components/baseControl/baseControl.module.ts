import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { TF_ICONS } from 'src/app/components/ultil/icons';
import { BaseButton } from './button/button';
import { BaseCard } from './card/card';
import { BaseInput } from './input/input';
import { BaseBadge } from './badge/badge';
import { BaseField } from './field/field';
import { BaseSpinner } from './spinner/spinner';
import { BaseEmptyState } from './emptyState/emptyState';
import { BaseStat } from './stat/stat';
import { BasePageHeader } from './pageHeader/pageHeader';
import { BaseLogo } from './logo/logo';
import { BaseTab } from './tabs/tab';
import { BaseTabs } from './tabs/tabs';
import { BaseToast } from './toast/toast';
import { BaseSection } from './section/section';
import { BaseFileUpload } from './fileUpload/fileUpload';
import { BaseFileChip } from './fileUpload/fileChip';
import { BaseSectionHeading } from './section/sectionHeading';

const BASE_CONTROLS = [
  BaseButton,
  BaseCard,
  BaseInput,
  BaseBadge,
  BaseField,
  BaseSpinner,
  BaseEmptyState,
  BaseStat,
  BasePageHeader,
  BaseLogo,
  BaseTab,
  BaseTabs,
  BaseToast,
  BaseSection,
  BaseSectionHeading,
  BaseFileUpload,
  BaseFileChip,
];

/**
 * The design system, as one import.
 *
 * Also re-exports the modules every feature page needs (Common, Forms, Router,
 * Lucide) so a view module declares its intent once instead of repeating a
 * dozen framework imports.
 */
@NgModule({
  declarations: BASE_CONTROLS,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, LucideAngularModule.pick(TF_ICONS)],
  exports: [...BASE_CONTROLS, CommonModule, FormsModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
})
export class BaseControlModule {}
