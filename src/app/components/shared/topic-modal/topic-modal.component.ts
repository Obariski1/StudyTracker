import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topic } from '../../../models/topic.model';
import { StorageService } from '../../../services/storage.service';

const COLORS = ['#c8f04c','#7b6ef6','#f06060','#60c0f0','#f0a060','#60f0b0','#f060b0','#a0c0ff'];

@Component({
  selector: 'app-topic-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdrop($event)">
      <div class="modal" role="dialog">
        <div class="modal-title">{{ editTopic ? 'Thema bearbeiten' : 'Thema hinzufügen' }}</div>

        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="form-control" [(ngModel)]="name" placeholder="z.B. Mathematik" #nameInput/>
        </div>
        <div class="form-group">
          <label class="form-label">Beschreibung</label>
          <input class="form-control" [(ngModel)]="desc" placeholder="Kurze Beschreibung (optional)" />
        </div>
        <div class="form-group">
          <label class="form-label">Farbe</label>
          <div class="color-picker-row">
            <div class="color-swatch"
              *ngFor="let c of colors"
              [style.background]="c"
              [class.selected]="c === selectedColor"
              (click)="selectedColor = c">
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" (click)="close.emit()">Abbrechen</button>
          <button class="btn-primary" (click)="save()">Speichern</button>
        </div>
      </div>
    </div>
  `,
})
export class TopicModalComponent implements OnChanges {
  @Input() editTopic: Topic | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  name = '';
  desc = '';
  selectedColor = COLORS[0];
  colors = COLORS;

  constructor(private storage: StorageService) {}

  ngOnChanges(): void {
    if (this.editTopic) {
      this.name = this.editTopic.name;
      this.desc = this.editTopic.desc;
      this.selectedColor = this.editTopic.color;
    } else {
      this.name = '';
      this.desc = '';
      this.selectedColor = COLORS[0];
    }
  }

  async save(): Promise<void> {
    if (!this.name.trim()) return;
    await this.storage.saveTopic({
      id: this.editTopic?.id ?? Date.now().toString(),
      name: this.name.trim(),
      desc: this.desc.trim(),
      color: this.selectedColor,
    });
    this.saved.emit();
    this.close.emit();
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.close.emit();
  }
}
