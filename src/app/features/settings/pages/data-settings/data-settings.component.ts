import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataExportComponent } from '../../../data-transfer/components/data-export/data-export.component';
import { DataImportComponent } from '../../../data-transfer/components/data-import/data-import.component';

@Component({
  selector: 'app-data-settings',
  standalone: true,
  imports: [CommonModule, DataExportComponent, DataImportComponent],
  templateUrl: './data-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataSettingsComponent {}
