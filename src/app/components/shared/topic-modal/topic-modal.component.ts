import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topic } from '../../../models/topic.model';
import { StorageService } from '../../../services/storage.service';

const COLORS = ['#c8f04c','#7b6ef6','#f06060','#60c0f0','#f0a060','#60f0b0','#f060b0','#a0c0ff'];
const SEMESTERS = [
  '1. Semester',
  '2. Semester',
  '3. Semester',
  '4. Semester',
  '5. Semester',
  '6. Semester',
  '7. Semester',
  '8. Semester',
  '9. Semester',
  '10. Semester',
  '11. Semester',
  '12. Semester',
];

@Component({
  selector: 'app-topic-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdrop($event)">
      <div class="modal topic-modal" role="dialog">
        <div class="topic-modal-header">
          <div class="modal-title">{{ editTopic ? 'Thema bearbeiten' : 'Thema hinzufügen' }}</div>
        </div>
        <div class="topic-modal-body">
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
          <div class="form-group">
            <label class="form-label">Semester</label>
            <select class="form-control" [(ngModel)]="selectedSemester" name="selectedSemester">
              <option value="">— Ohne Semester —</option>
              <option *ngFor="let semester of semesters" [value]="semester">{{ semester }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="topic-checkbox-label">
              <input type="checkbox" [(ngModel)]="isLectureType" name="isLectureType" />
              <span>Nicht in Gesamtlernzeit zählen (z.B. Vorlesungen)</span>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="close.emit()">Abbrechen</button>
            <button class="btn-primary" (click)="save()">Speichern</button>
          </div>
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
  selectedSemester = '';
  isLectureType = false;
  colors = COLORS;
  semesters = SEMESTERS;

  constructor(private storage: StorageService) {}

  ngOnChanges(): void {
    if (this.editTopic) {
      this.name = this.editTopic.name;
      this.desc = this.editTopic.desc;
      this.selectedColor = this.editTopic.color;
      this.selectedSemester = this.editTopic.semester ?? '';
      this.isLectureType = this.editTopic.isLectureType ?? false;
    } else {
      this.name = '';
      this.desc = '';
      this.selectedColor = COLORS[0];
      this.selectedSemester = '';
      this.isLectureType = false;
    }
  }

  async save(): Promise<void> {
    if (!this.name.trim()) return;
    await this.storage.saveTopic({
      id: this.editTopic?.id ?? Date.now().toString(),
      name: this.name.trim(),
      desc: this.desc.trim(),
      color: this.selectedColor,
      semester: this.selectedSemester || null,
      isLectureType: this.isLectureType,
    });
    this.saved.emit();
    this.close.emit();
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.close.emit();
  }
}
