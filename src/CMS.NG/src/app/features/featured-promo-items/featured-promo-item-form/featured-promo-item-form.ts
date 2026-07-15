import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PromotionLookup } from '../../../core/lookups/lookup.model';
import { FeaturedPromoItem, FeaturedPromoItemRequest } from '../featured-promo-item.model';

// Inline Edit/New form: PromoCode autocompletes over Promotion2 and, on select,
// resolves Promotion_pkid and pre-fills Topic/Description from the chosen promotion.
@Component({
  selector: 'app-featured-promo-item-form',
  imports: [FormsModule, ReactiveFormsModule, AutoCompleteModule, ButtonModule, InputTextModule],
  templateUrl: './featured-promo-item-form.html',
  styleUrl: './featured-promo-item-form.scss'
})
export class FeaturedPromoItemForm implements OnInit {
  private readonly fb = inject(FormBuilder);

  // The row being edited (null when creating a new item).
  @Input() item: FeaturedPromoItem | null = null;
  // Row context supplied by the parent grid.
  @Input() scheduleOn = '';
  @Input() trainingCenterPkid = 0;
  @Input() slot = 0;
  @Input() promotions: PromotionLookup[] = [];

  @Output() readonly save = new EventEmitter<FeaturedPromoItemRequest>();
  @Output() readonly cancelForm = new EventEmitter<void>();

  filteredPromotions: PromotionLookup[] = [];
  // Bound to the autocomplete: a typed string, or the PromotionLookup once one is picked.
  selectedPromo: string | PromotionLookup = '';

  // Promotion_pkid resolved from the selected PromoCode; required to save.
  readonly form = this.fb.nonNullable.group({
    promoCode: ['', Validators.required],
    promotionPkid: [0, [Validators.required, Validators.min(1)]],
    topic: ['', Validators.required],
    description: ['', Validators.required]
  });

  ngOnInit(): void {
    if (this.item) {
      this.selectedPromo = this.item.promoCode;
      this.form.setValue({
        promoCode: this.item.promoCode,
        promotionPkid: this.item.promotionPkid,
        topic: this.item.topic,
        description: this.item.description
      });
    }
  }

  filterPromotions(event: AutoCompleteCompleteEvent): void {
    const query = event.query.toLowerCase();
    this.filteredPromotions = this.promotions.filter((p) =>
      p.promoCode.toLowerCase().includes(query)
    );
  }

  // p-autoComplete emits the whole PromotionLookup on select.
  onPromotionSelect(promotion: PromotionLookup): void {
    this.selectedPromo = promotion;
    this.form.patchValue({
      promoCode: promotion.promoCode,
      promotionPkid: promotion.pkid,
      topic: promotion.topic,
      description: promotion.description
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.save.emit({
      pkid: this.item?.pkid ?? 0,
      scheduleOn: this.scheduleOn,
      trainingCenterPkid: this.trainingCenterPkid,
      slot: this.slot,
      promotionPkid: value.promotionPkid,
      topic: value.topic,
      description: value.description
    });
  }

  cancel(): void {
    this.cancelForm.emit();
  }
}
