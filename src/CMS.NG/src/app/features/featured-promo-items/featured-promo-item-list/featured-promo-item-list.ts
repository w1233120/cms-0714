import { Component, OnInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LookupService } from '../../../core/lookups/lookup.service';
import { PromotionLookup, TrainingCenterLookup } from '../../../core/lookups/lookup.model';
import { FeaturedPromoItemForm } from '../featured-promo-item-form/featured-promo-item-form';
import { FeaturedPromoItemService } from '../featured-promo-item.service';
import {
  FeaturedPromoItem,
  FeaturedPromoItemQuery,
  FeaturedPromoItemRequest
} from '../featured-promo-item.model';
import { addDays, dayLabel, formatLocalDate, startOfWeek, weekDays } from '../week.util';

const CENTER_KEY = 'featured-promo-item-list-center';
const WEEK_KEY = 'featured-promo-item-list-week';

interface SlotCell {
  slot: number;
  item: FeaturedPromoItem | null;
}

interface DayRow {
  scheduleOn: string;
  label: string;
  cells: SlotCell[];
}

@Component({
  selector: 'app-featured-promo-item-list',
  imports: [ButtonModule, InputTextModule, ConfirmDialogModule, ToastModule, FeaturedPromoItemForm],
  providers: [ConfirmationService, MessageService],
  templateUrl: './featured-promo-item-list.html',
  styleUrl: './featured-promo-item-list.scss'
})
export class FeaturedPromoItemList implements OnInit {
  private readonly service = inject(FeaturedPromoItemService);
  private readonly lookupService = inject(LookupService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  private static readonly SLOTS = [1, 2, 3];

  trainingCenters: TrainingCenterLookup[] = [];
  promotions: PromotionLookup[] = [];
  activeTrainingCenterPkid = 0;
  weekStart: Date = startOfWeek(new Date());
  rows: DayRow[] = [];

  // Which (scheduleOn, slot) cell is open in the inline form, and the row it edits (null = new).
  editingKey: string | null = null;
  editingItem: FeaturedPromoItem | null = null;
  // Copy/Paste buffer for cloning an item into another cell.
  clipboard: FeaturedPromoItem | null = null;

  ngOnInit(): void {
    forkJoin({
      centers: this.lookupService.getTrainingCenters(),
      promotions: this.lookupService.getPromotions()
    }).subscribe(({ centers, promotions }) => {
      this.trainingCenters = centers;
      this.promotions = promotions;
      this.restoreState();
      if (this.activeTrainingCenterPkid === 0 && centers.length > 0) {
        this.activeTrainingCenterPkid = centers[0].pkid;
      }
      this.search();
    });
  }

  private restoreState(): void {
    const savedCenter = sessionStorage.getItem(CENTER_KEY);
    if (savedCenter) {
      this.activeTrainingCenterPkid = Number(savedCenter);
    }

    const savedWeek = sessionStorage.getItem(WEEK_KEY);
    if (savedWeek) {
      this.weekStart = startOfWeek(new Date(savedWeek));
    }
  }

  get weekEnd(): Date {
    return addDays(this.weekStart, 6);
  }

  get weekLabel(): string {
    const start = this.weekStart;
    const end = this.weekEnd;
    return `${start.getMonth() + 1}/${start.getDate()} -- ${end.getMonth() + 1}/${end.getDate()}`;
  }

  search(): void {
    sessionStorage.setItem(CENTER_KEY, String(this.activeTrainingCenterPkid));
    sessionStorage.setItem(WEEK_KEY, formatLocalDate(this.weekStart));

    const query: FeaturedPromoItemQuery = {
      trainingCenterPkid: this.activeTrainingCenterPkid,
      scheduleOnFrom: formatLocalDate(this.weekStart),
      scheduleOnTo: formatLocalDate(this.weekEnd)
    };

    this.service.query(query).subscribe((items) => {
      this.buildRows(items);
      this.closeEditor();
    });
  }

  private buildRows(items: FeaturedPromoItem[]): void {
    this.rows = weekDays(this.weekStart).map((date) => {
      const scheduleOn = formatLocalDate(date);
      return {
        scheduleOn,
        label: dayLabel(date),
        cells: FeaturedPromoItemList.SLOTS.map((slot) => ({
          slot,
          item: items.find((i) => i.scheduleOn === scheduleOn && i.slot === slot) ?? null
        }))
      };
    });
  }

  selectTab(pkid: number): void {
    if (pkid === this.activeTrainingCenterPkid) {
      return;
    }
    this.activeTrainingCenterPkid = pkid;
    this.search();
  }

  prevWeek(): void {
    this.weekStart = addDays(this.weekStart, -7);
    this.search();
  }

  nextWeek(): void {
    this.weekStart = addDays(this.weekStart, 7);
    this.search();
  }

  private cellKey(scheduleOn: string, slot: number): string {
    return `${scheduleOn}#${slot}`;
  }

  isEditing(scheduleOn: string, slot: number): boolean {
    return this.editingKey === this.cellKey(scheduleOn, slot);
  }

  startEdit(scheduleOn: string, slot: number, item: FeaturedPromoItem | null): void {
    this.editingKey = this.cellKey(scheduleOn, slot);
    this.editingItem = item;
  }

  closeEditor(): void {
    this.editingKey = null;
    this.editingItem = null;
  }

  onSave(request: FeaturedPromoItemRequest): void {
    const save$ = request.pkid > 0 ? this.service.update(request) : this.service.create(request);
    save$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '儲存成功' });
        this.search();
      },
      error: (err: HttpErrorResponse) => {
        const summary = err.status === 409 ? '該日期／訓練中心／Slot 已存在' : '儲存失敗';
        this.messageService.add({ severity: 'error', summary });
      }
    });
  }

  copy(item: FeaturedPromoItem): void {
    this.clipboard = item;
    this.messageService.add({ severity: 'info', summary: `已複製 ${item.promoCode}` });
  }

  paste(scheduleOn: string, slot: number): void {
    if (!this.clipboard) {
      return;
    }
    this.onSave({
      pkid: 0,
      scheduleOn,
      trainingCenterPkid: this.activeTrainingCenterPkid,
      slot,
      promotionPkid: this.clipboard.promotionPkid,
      topic: this.clipboard.topic,
      description: this.clipboard.description
    });
  }

  // '+' moves a slot down (1 -> 2), '-' moves it up (2 -> 1). When the target slot is
  // occupied the two rows swap Slot values; otherwise the item just moves into the gap.
  moveSlot(row: DayRow, item: FeaturedPromoItem, delta: number): void {
    const target = item.slot + delta;
    if (target < 1 || target > FeaturedPromoItemList.SLOTS.length) {
      return;
    }

    const occupant = row.cells.find((c) => c.slot === target)?.item ?? null;
    if (occupant) {
      this.service.swapSlots({ pkidA: item.pkid, pkidB: occupant.pkid }).subscribe(() => this.search());
    } else {
      this.service
        .update({
          pkid: item.pkid,
          scheduleOn: item.scheduleOn,
          trainingCenterPkid: item.trainingCenterPkid,
          slot: target,
          promotionPkid: item.promotionPkid,
          topic: item.topic,
          description: item.description
        })
        .subscribe(() => this.search());
    }
  }

  remove(item: FeaturedPromoItem): void {
    this.confirmationService.confirm({
      message: `確定要刪除 <b>${item.scheduleOn}</b> Slot ${item.slot}「${item.promoCode}」？`,
      header: '刪除確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定',
      rejectLabel: '取消',
      accept: () => {
        this.service.delete(item.pkid).subscribe(() => {
          this.messageService.add({ severity: 'success', summary: '刪除成功' });
          this.search();
        });
      }
    });
  }
}
