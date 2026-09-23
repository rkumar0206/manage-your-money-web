import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataExportComponent } from '../../components/data-export/data-export.component';
import { DataImportComponent } from '../../components/data-import/data-import.component';

@Component({
  selector: 'app-data-transfer',
  standalone: true,
  imports: [CommonModule, RouterLink, DataExportComponent, DataImportComponent],
  templateUrl: './data-transfer.component.html',
  styleUrl: './data-transfer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTransferComponent {}
